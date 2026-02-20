-- ============================================================
-- Fase 2: Soft deletes (items), base para analytics
-- ============================================================

-- 1. SOFT DELETES EM ITEMS
ALTER TABLE public.items
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

CREATE INDEX IF NOT EXISTS idx_items_is_active ON public.items(is_active) WHERE is_active = true;

COMMENT ON COLUMN public.items.is_active IS
  'Se false, item foi desativado (ex.: removido do jogo). Nunca fazer DELETE; apenas desativar no admin.';

-- Garantir que novas ofertas só referenciem itens ativos (já validado no trigger por item_id existir; adicionar checagem is_active)
CREATE OR REPLACE FUNCTION public.validate_listing_creation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_account_age_days INTEGER;
  v_rank_tier rank_tier;
  v_open_listings_count INTEGER;
  v_max_listings INTEGER;
  v_strikes INTEGER;
BEGIN
  SELECT account_age_days, rank_tier, strikes
  INTO v_account_age_days, v_rank_tier, v_strikes
  FROM public.profiles
  WHERE id = NEW.user_id;

  IF v_account_age_days IS NULL OR v_rank_tier IS NULL THEN
    RAISE EXCEPTION 'Perfil do usuário não encontrado';
  END IF;

  IF v_strikes >= 3 THEN
    RAISE EXCEPTION 'Sua conta está bloqueada para criar ofertas devido a múltiplas infrações (strikes: %). Entre em contato com a moderação.', v_strikes;
  END IF;

  IF v_account_age_days < 30 THEN
    RAISE EXCEPTION 'Conta Discord muito nova. É necessário ter pelo menos 30 dias de conta para criar ofertas (anti-Sybil). Conta atual: % dias', v_account_age_days;
  END IF;

  CASE v_rank_tier
    WHEN 'DRIFTER' THEN v_max_listings := 1;
    WHEN 'CIVILIAN' THEN v_max_listings := 3;
    WHEN 'MERCHANT', 'BROKER', 'YONKO' THEN v_max_listings := 999;
    ELSE v_max_listings := 1;
  END CASE;

  SELECT COUNT(*) INTO v_open_listings_count
  FROM public.listings
  WHERE user_id = NEW.user_id AND status = 'OPEN';

  IF v_open_listings_count >= v_max_listings THEN
    RAISE EXCEPTION 'Limite de ofertas ativas atingido. Tier % permite no máximo % oferta(s) aberta(s). Ofertas atuais: %', v_rank_tier, v_max_listings, v_open_listings_count;
  END IF;

  IF jsonb_typeof(NEW.items) != 'array' THEN
    RAISE EXCEPTION 'Campo items deve ser um array JSON';
  END IF;

  IF jsonb_array_length(NEW.items) = 0 THEN
    RAISE EXCEPTION 'É necessário selecionar pelo menos 1 item';
  END IF;

  IF jsonb_array_length(NEW.items) > 4 THEN
    RAISE EXCEPTION 'Máximo de 4 itens por oferta';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM jsonb_array_elements(NEW.items) AS elem
    WHERE NOT (elem ? 'item_id' AND elem ? 'qty')
      OR NOT (jsonb_typeof(elem->'item_id') = 'number')
      OR NOT (jsonb_typeof(elem->'qty') = 'number')
      OR (elem->>'item_id')::int IS NULL
      OR (elem->>'qty')::int IS NULL
      OR (elem->>'qty')::int < 1
  ) THEN
    RAISE EXCEPTION 'Cada item no array deve ter item_id (número) e qty (número >= 1) válidos';
  END IF;

  -- Integridade referencial + apenas itens ATIVOS
  IF EXISTS (
    SELECT 1
    FROM jsonb_array_elements(NEW.items) AS elem
    WHERE NOT EXISTS (
      SELECT 1 FROM public.items
      WHERE id = (elem->>'item_id')::int
        AND (is_active = true)
    )
  ) THEN
    RAISE EXCEPTION 'Um ou mais itens não existem ou estão desativados. Só é possível usar itens ativos no catálogo.';
  END IF;

  RETURN NEW;
END;
$$;


-- 2. WEIGHTED AVERAGE PRICE (WAP) ÚLTIMA SEMANA — para painel de economia
-- Dívida técnica: esta função usa jsonb_array_elements sobre listings.items (JSONB) por compatibilidade
-- com dados antigos. Quando removeres a coluna JSONB e usares apenas listing_items (mig 09),
-- refazer esta função com JOIN em listing_items em vez de parse JSONB reduzirá custo CPU em escala.
CREATE OR REPLACE FUNCTION public.get_market_prices_last_week()
RETURNS TABLE (
  item_id int,
  item_name text,
  item_category text,
  weighted_avg_price real,
  total_volume real,
  trade_count bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH tier_weight AS (
    SELECT id,
      CASE rank_tier
        WHEN 'YONKO'    THEN 5.0
        WHEN 'BROKER'   THEN 3.0
        WHEN 'MERCHANT' THEN 1.0
        ELSE 0.0
      END AS w
    FROM profiles
  ),
  last_week_tx AS (
    SELECT t.id, t.listing_id, t.final_items_exchanged, t.implied_value, t.buyer_id, t.seller_id
    FROM transactions t
    WHERE t.status = 'CONFIRMED'
      AND t.created_at >= NOW() - INTERVAL '7 days'
  ),
  tx_weight AS (
    SELECT lt.id, lt.listing_id, lt.final_items_exchanged, COALESCE(lt.implied_value, 0) AS implied_value,
      (COALESCE(b.w, 0) + COALESCE(s.w, 0)) / 2.0 AS w
    FROM last_week_tx lt
    LEFT JOIN tier_weight b ON b.id = lt.buyer_id
    LEFT JOIN tier_weight s ON s.id = lt.seller_id
    WHERE (COALESCE(b.w, 0) + COALESCE(s.w, 0)) > 0
  ),
  tx_items_raw AS (
    SELECT tw.id AS tx_id, tw.implied_value, tw.w,
      (elem->>'item_id')::int AS iid,
      GREATEST((elem->>'qty')::int, 1) AS qty
    FROM tx_weight tw
    CROSS JOIN LATERAL jsonb_array_elements(
      COALESCE(
        (SELECT l.items FROM listings l WHERE l.id = tw.listing_id),
        CASE WHEN jsonb_typeof(tw.final_items_exchanged) = 'array' THEN tw.final_items_exchanged ELSE '[]'::jsonb END
      )
    ) AS elem
  ),
  tx_total_qty AS (
    SELECT tx_id, SUM(qty) AS total_qty
    FROM tx_items_raw
    GROUP BY tx_id
  ),
  observations AS (
    SELECT r.tx_id, r.iid AS item_id, r.w,
      (r.implied_value / NULLIF(t.total_qty, 0)) AS value_per_unit
    FROM tx_items_raw r
    JOIN tx_total_qty t ON t.tx_id = r.tx_id
    WHERE r.iid IS NOT NULL
  ),
  agg AS (
    SELECT
      o.item_id,
      SUM(o.value_per_unit * o.w) / NULLIF(SUM(o.w), 0) AS weighted_avg_price,
      SUM(o.value_per_unit * o.w) AS total_volume,
      COUNT(DISTINCT o.tx_id) AS trade_count
    FROM observations o
    GROUP BY o.item_id
  )
  SELECT
    agg.item_id,
    i.name AS item_name,
    i.category::text AS item_category,
    agg.weighted_avg_price::real,
    agg.total_volume::real,
    agg.trade_count
  FROM agg
  JOIN items i ON i.id = agg.item_id
  ORDER BY agg.total_volume DESC NULLS LAST;
$$;

COMMENT ON FUNCTION public.get_market_prices_last_week() IS
  'Preço médio ponderado (WAP) por item na última semana, baseado em transações CONFIRMED. Para painel de economia / bolsa GPO.';

GRANT EXECUTE ON FUNCTION public.get_market_prices_last_week() TO anon;
GRANT EXECUTE ON FUNCTION public.get_market_prices_last_week() TO authenticated;
