-- ============================================================
-- 1. WAP última semana usando listing_items (evita parse JSONB)
-- 2. Políticas RLS para admin ver/resolver disputas
-- ============================================================

-- 1. get_market_prices_last_week: usar listing_items em vez de jsonb_array_elements(listings.items)
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
    SELECT t.id, t.listing_id, t.implied_value, t.buyer_id, t.seller_id
    FROM transactions t
    WHERE t.status = 'CONFIRMED'
      AND t.created_at >= NOW() - INTERVAL '7 days'
      AND t.listing_id IS NOT NULL
  ),
  tx_weight AS (
    SELECT lt.id, lt.listing_id, COALESCE(lt.implied_value, 0) AS implied_value,
      (COALESCE(b.w, 0) + COALESCE(s.w, 0)) / 2.0 AS w
    FROM last_week_tx lt
    LEFT JOIN tier_weight b ON b.id = lt.buyer_id
    LEFT JOIN tier_weight s ON s.id = lt.seller_id
    WHERE (COALESCE(b.w, 0) + COALESCE(s.w, 0)) > 0
  ),
  tx_total_qty AS (
    SELECT tw.id AS tx_id, SUM(li.qty) AS total_qty
    FROM tx_weight tw
    JOIN listing_items li ON li.listing_id = tw.listing_id
    GROUP BY tw.id
  ),
  observations AS (
    SELECT tw.id AS tx_id, li.item_id, tw.w,
      (tw.implied_value / NULLIF(t.total_qty, 0)) AS value_per_unit
    FROM tx_weight tw
    JOIN listing_items li ON li.listing_id = tw.listing_id
    JOIN tx_total_qty t ON t.tx_id = tw.id
    WHERE li.item_id IS NOT NULL
  ),
  agg AS (
    SELECT
      o.item_id,
      SUM(o.value_per_unit * o.w) / NULLIF(SUM(o.w), 0) AS weighted_avg_price,
      SUM(o.value_per_unit * o.w) AS total_volume,
      COUNT(DISTINCT o.tx_id)::bigint AS trade_count
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
  'Preço médio ponderado (WAP) por item na última semana (transações CONFIRMED). Usa listing_items (normalizado), não JSONB.';

-- 2. Admin: SELECT e UPDATE em dispute_cases (mediador resolve disputas)
-- Participantes já podem SELECT via policy "dispute_cases_select_participants" (00015).
CREATE POLICY "admin_dispute_cases_select_all"
  ON public.dispute_cases FOR SELECT
  TO authenticated
  USING ((SELECT is_admin FROM public.profiles WHERE id = auth.uid()) = true);

CREATE POLICY "admin_dispute_cases_update"
  ON public.dispute_cases FOR UPDATE
  TO authenticated
  USING ((SELECT is_admin FROM public.profiles WHERE id = auth.uid()) = true)
  WITH CHECK ((SELECT is_admin FROM public.profiles WHERE id = auth.uid()) = true);

-- Admin: SELECT em dispute_evidence (ver provas)
-- Participantes já podem SELECT via "dispute_evidence_select_dispute" (00015).
CREATE POLICY "admin_dispute_evidence_select_all"
  ON public.dispute_evidence FOR SELECT
  TO authenticated
  USING ((SELECT is_admin FROM public.profiles WHERE id = auth.uid()) = true);

-- Garantir que participantes continuam a poder SELECT (policy original já cobre; admin acima complementa)
-- Nenhuma policy de INSERT/UPDATE em dispute_evidence para admin (apenas participantes enviam provas)
