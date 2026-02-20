-- ============================================================
-- Validação de Segurança: Regras de Negócio no Banco de Dados
-- Anti-Sybil + Limites por Tier (TDD)
-- ============================================================

-- Função que valida se o usuário pode criar uma nova oferta
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
BEGIN
  -- Buscar dados do perfil do usuário
  SELECT account_age_days, rank_tier
  INTO v_account_age_days, v_rank_tier
  FROM public.profiles
  WHERE id = NEW.user_id;

  -- Se o perfil não existir, erro
  IF v_account_age_days IS NULL OR v_rank_tier IS NULL THEN
    RAISE EXCEPTION 'Perfil do usuário não encontrado';
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
    ELSE v_max_listings := 1; -- Fallback seguro
  END CASE;

  -- Contar ofertas abertas do usuário
  SELECT COUNT(*)
  INTO v_open_listings_count
  FROM public.listings
  WHERE user_id = NEW.user_id
    AND status = 'OPEN';

  -- Validar limite de ofertas
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

  -- Validar estrutura de cada item no array
  -- Cada item deve ter: item_id (int) e qty (int)
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

  -- Validar que os item_ids existem na tabela items
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
  'Valida regras de negócio antes de criar oferta: anti-Sybil (30 dias), limites por tier, estrutura do JSONB items e integridade referencial.';

-- Trigger BEFORE INSERT na tabela listings
CREATE TRIGGER listings_security_validation
  BEFORE INSERT ON public.listings
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_listing_creation();

COMMENT ON TRIGGER listings_security_validation ON public.listings IS
  'Garante que todas as regras de segurança sejam validadas no banco de dados antes de permitir criação de ofertas.';
