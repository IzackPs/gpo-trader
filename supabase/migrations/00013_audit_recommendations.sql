-- ============================================================
-- Implementação das recomendações da auditoria de arquitetura
-- Strikes, find_matches_for_user, accept_listing_offer atômico
-- ============================================================

-- 1. POLÍTICA DE STRIKES: bloquear criação de ofertas após N strikes
-- Constante: 3 strikes = não pode criar nova oferta

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
  -- Buscar dados do perfil do usuário
  SELECT account_age_days, rank_tier, strikes
  INTO v_account_age_days, v_rank_tier, v_strikes
  FROM public.profiles
  WHERE id = NEW.user_id;

  -- Se o perfil não existir, erro
  IF v_account_age_days IS NULL OR v_rank_tier IS NULL THEN
    RAISE EXCEPTION 'Perfil do usuário não encontrado';
  END IF;

  -- Bloqueio por strikes (política: 3 ou mais = não pode criar oferta)
  IF v_strikes >= 3 THEN
    RAISE EXCEPTION 'Sua conta está bloqueada para criar ofertas devido a múltiplas infrações (strikes: %). Entre em contato com a moderação.', v_strikes;
  END IF;

  -- Validação Anti-Sybil: idade mínima da conta Discord
  IF v_account_age_days < 30 THEN
    RAISE EXCEPTION 'Conta Discord muito nova. É necessário ter pelo menos 30 dias de conta para criar ofertas (anti-Sybil). Conta atual: % dias', v_account_age_days;
  END IF;

  -- Determinar limite de ofertas por tier
  CASE v_rank_tier
    WHEN 'DRIFTER' THEN v_max_listings := 1;
    WHEN 'CIVILIAN' THEN v_max_listings := 3;
    WHEN 'MERCHANT', 'BROKER', 'YONKO' THEN v_max_listings := 999;
    ELSE v_max_listings := 1;
  END CASE;

  -- Contar ofertas abertas do usuário
  SELECT COUNT(*)
  INTO v_open_listings_count
  FROM public.listings
  WHERE user_id = NEW.user_id
    AND status = 'OPEN';

  IF v_open_listings_count >= v_max_listings THEN
    RAISE EXCEPTION 'Limite de ofertas ativas atingido. Tier % permite no máximo % oferta(s) aberta(s). Ofertas atuais: %', v_rank_tier, v_max_listings, v_open_listings_count;
  END IF;

  -- Validar estrutura do JSONB items
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

  IF EXISTS (
    SELECT 1
    FROM jsonb_array_elements(NEW.items) AS elem
    WHERE NOT EXISTS (
      SELECT 1 FROM public.items WHERE id = (elem->>'item_id')::int
    )
  ) THEN
    RAISE EXCEPTION 'Um ou mais item_id(s) não existem na tabela items';
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.validate_listing_creation() IS
  'Valida regras de negócio: strikes >= 3 bloqueia, anti-Sybil (30 dias), limites por tier, estrutura do JSONB items.';


-- 2. RPC find_matches_for_user: retorna apenas matches do usuário (otimizado)
CREATE OR REPLACE FUNCTION public.find_matches_for_user(p_user_id UUID)
RETURNS TABLE (
  match_id UUID,
  listing_have_id UUID,
  listing_want_id UUID,
  have_user_id UUID,
  want_user_id UUID,
  match_score REAL,
  matched_items JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_listing RECORD;
  v_match RECORD;
  v_total_have INTEGER;
  v_total_want INTEGER;
  v_matched_count INTEGER;
  v_score REAL;
  v_matched_items JSONB;
BEGIN
  -- Listings HAVE do usuário (ele tem os itens)
  FOR v_listing IN
    SELECT l.id, l.user_id, l.side, l.items, l.status
    FROM listings l
    WHERE l.status = 'OPEN'
      AND l.user_id = p_user_id
      AND l.side = 'HAVE'
  LOOP
    FOR v_match IN
      SELECT w.id AS want_id, w.user_id AS want_user_id, w.items AS want_items
      FROM listings w
      WHERE w.status = 'OPEN'
        AND w.side = 'WANT'
        AND w.user_id != v_listing.user_id
        AND EXISTS (
          SELECT 1
          FROM jsonb_array_elements(v_listing.items) AS have_item
          JOIN jsonb_array_elements(w.items) AS want_item
            ON (have_item->>'item_id')::int = (want_item->>'item_id')::int
        )
    LOOP
      SELECT COUNT(*) INTO v_total_have FROM jsonb_array_elements(v_listing.items);
      SELECT COUNT(*) INTO v_total_want FROM jsonb_array_elements(v_match.want_items);
      SELECT COUNT(*) INTO v_matched_count
      FROM jsonb_array_elements(v_listing.items) AS have_item
      JOIN jsonb_array_elements(v_match.want_items) AS want_item
        ON (have_item->>'item_id')::int = (want_item->>'item_id')::int;
      v_score := (
        (v_matched_count::REAL / NULLIF(v_total_have, 0)) +
        (v_matched_count::REAL / NULLIF(v_total_want, 0))
      ) / 2.0;
      SELECT jsonb_agg(
        jsonb_build_object(
          'item_id', (have_item->>'item_id')::int,
          'have_qty', (have_item->>'qty')::int,
          'want_qty', (want_item->>'qty')::int
        )
      ) INTO v_matched_items
      FROM jsonb_array_elements(v_listing.items) AS have_item
      JOIN jsonb_array_elements(v_match.want_items) AS want_item
        ON (have_item->>'item_id')::int = (want_item->>'item_id')::int;
      RETURN QUERY SELECT
        gen_random_uuid(),
        v_listing.id,
        v_match.want_id,
        v_listing.user_id,
        v_match.want_user_id,
        v_score,
        COALESCE(v_matched_items, '[]'::jsonb);
    END LOOP;
  END LOOP;

  -- Listings WANT do usuário (ele quer os itens)
  FOR v_listing IN
    SELECT l.id, l.user_id, l.side, l.items, l.status
    FROM listings l
    WHERE l.status = 'OPEN'
      AND l.user_id = p_user_id
      AND l.side = 'WANT'
  LOOP
    FOR v_match IN
      SELECT h.id AS have_id, h.user_id AS have_user_id, h.items AS have_items
      FROM listings h
      WHERE h.status = 'OPEN'
        AND h.side = 'HAVE'
        AND h.user_id != v_listing.user_id
        AND EXISTS (
          SELECT 1
          FROM jsonb_array_elements(v_listing.items) AS want_item
          JOIN jsonb_array_elements(h.items) AS have_item
            ON (want_item->>'item_id')::int = (have_item->>'item_id')::int
        )
    LOOP
      SELECT COUNT(*) INTO v_total_want FROM jsonb_array_elements(v_listing.items);
      SELECT COUNT(*) INTO v_total_have FROM jsonb_array_elements(v_match.have_items);
      SELECT COUNT(*) INTO v_matched_count
      FROM jsonb_array_elements(v_listing.items) AS want_item
      JOIN jsonb_array_elements(v_match.have_items) AS have_item
        ON (want_item->>'item_id')::int = (have_item->>'item_id')::int;
      v_score := (
        (v_matched_count::REAL / NULLIF(v_total_want, 0)) +
        (v_matched_count::REAL / NULLIF(v_total_have, 0))
      ) / 2.0;
      SELECT jsonb_agg(
        jsonb_build_object(
          'item_id', (want_item->>'item_id')::int,
          'have_qty', (have_item->>'qty')::int,
          'want_qty', (want_item->>'qty')::int
        )
      ) INTO v_matched_items
      FROM jsonb_array_elements(v_listing.items) AS want_item
      JOIN jsonb_array_elements(v_match.have_items) AS have_item
        ON (want_item->>'item_id')::int = (have_item->>'item_id')::int;
      RETURN QUERY SELECT
        gen_random_uuid(),
        v_match.have_id,
        v_listing.id,
        v_match.have_user_id,
        v_listing.user_id,
        v_score,
        COALESCE(v_matched_items, '[]'::jsonb);
    END LOOP;
  END LOOP;
END;
$$;

COMMENT ON FUNCTION public.find_matches_for_user(UUID) IS
  'Retorna apenas os matches em que o usuário participa (HAVE ou WANT). Otimizado para o frontend. A tabela matches não é preenchida por esta função.';


-- 3. ACEITAR OFERTA DE FORMA ATÔMICA (evita race e listing LOCKED órfã)
CREATE OR REPLACE FUNCTION public.accept_listing_offer(p_listing_id UUID, p_buyer_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_seller_id UUID;
  v_transaction_id UUID;
BEGIN
  -- Travar a oferta e obter o seller em um único UPDATE (atomicidade)
  UPDATE public.listings
  SET status = 'LOCKED',
      updated_at = NOW()
  WHERE id = p_listing_id
    AND status = 'OPEN'
  RETURNING user_id INTO v_seller_id;

  IF v_seller_id IS NULL THEN
    RAISE EXCEPTION 'Oferta não encontrada ou já foi aceita por outro usuário';
  END IF;

  -- O comprador não pode ser o dono da oferta
  IF v_seller_id = p_buyer_id THEN
    -- Reverter o LOCKED
    UPDATE public.listings SET status = 'OPEN', updated_at = NOW() WHERE id = p_listing_id;
    RAISE EXCEPTION 'Você não pode aceitar sua própria oferta';
  END IF;

  -- Criar a transação
  INSERT INTO public.transactions (listing_id, buyer_id, seller_id, status)
  VALUES (p_listing_id, p_buyer_id, v_seller_id, 'PENDING_VERIFICATION')
  RETURNING id INTO v_transaction_id;

  RETURN v_transaction_id;
END;
$$;

COMMENT ON FUNCTION public.accept_listing_offer(UUID, UUID) IS
  'Aceita uma oferta de forma atômica: trava a listing (OPEN -> LOCKED) e cria a transação. Retorna o ID da transação.';

-- Permissão para authenticated chamar a função
GRANT EXECUTE ON FUNCTION public.accept_listing_offer(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.find_matches_for_user(UUID) TO authenticated;
