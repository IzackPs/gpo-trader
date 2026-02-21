-- Limite de oferta: máximo 10 itens (tipos) por oferta; quantidade 1 a 30 por item

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

  -- Máximo 10 itens (tipos) por oferta; a quantidade não conta para este limite
  IF jsonb_array_length(NEW.items) > 10 THEN
    RAISE EXCEPTION 'Máximo de 10 itens por oferta';
  END IF;

  -- Cada item: item_id e qty entre 1 e 30
  IF EXISTS (
    SELECT 1
    FROM jsonb_array_elements(NEW.items) AS elem
    WHERE NOT (elem ? 'item_id' AND elem ? 'qty')
      OR NOT (jsonb_typeof(elem->'item_id') = 'number')
      OR NOT (jsonb_typeof(elem->'qty') = 'number')
      OR (elem->>'item_id')::int IS NULL
      OR (elem->>'qty')::int IS NULL
      OR (elem->>'qty')::int < 1
      OR (elem->>'qty')::int > 30
  ) THEN
    RAISE EXCEPTION 'Cada item no array deve ter item_id (número) e qty (número entre 1 e 30) válidos';
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

COMMENT ON FUNCTION public.validate_listing_creation() IS
  'Valida criação de oferta: strikes, anti-Sybil, limites por tier, até 10 itens por oferta, qty 1-30 por item, itens ativos.';
