-- ============================================================
-- Sistema de Matchmaking Automático + Indicadores de Presença
-- ============================================================

-- 1. TABELA DE MATCHES (cruzamento automático de ofertas)
CREATE TABLE IF NOT EXISTS public.matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_have_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  listing_want_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  match_score REAL DEFAULT 0, -- Score de compatibilidade (0-1)
  notified_users UUID[] DEFAULT ARRAY[]::UUID[], -- IDs dos usuários já notificados
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT different_listings CHECK (listing_have_id != listing_want_id)
);
-- "Diferentes usuários" é garantido pelo trigger abaixo (CHECK não aceita subquery no PostgreSQL)

CREATE OR REPLACE FUNCTION public.matches_different_users_check()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_have_user UUID;
  v_want_user UUID;
BEGIN
  SELECT user_id INTO v_have_user FROM listings WHERE id = NEW.listing_have_id;
  SELECT user_id INTO v_want_user FROM listings WHERE id = NEW.listing_want_id;
  IF v_have_user = v_want_user THEN
    RAISE EXCEPTION 'Match deve ser entre ofertas de usuários diferentes';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER matches_different_users_trigger
  BEFORE INSERT OR UPDATE ON public.matches
  FOR EACH ROW
  EXECUTE FUNCTION public.matches_different_users_check();

CREATE INDEX idx_matches_listing_have ON public.matches(listing_have_id);
CREATE INDEX idx_matches_listing_want ON public.matches(listing_want_id);
CREATE INDEX idx_matches_score ON public.matches(match_score DESC);

-- RLS: usuários podem ver matches relacionados às suas ofertas
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "matches_select_own"
  ON public.matches
  FOR SELECT
  USING (
    listing_have_id IN (SELECT id FROM listings WHERE user_id = auth.uid())
    OR listing_want_id IN (SELECT id FROM listings WHERE user_id = auth.uid())
  );

COMMENT ON TABLE public.matches IS
  'Cruzamento automático de ofertas: HAVE de um usuário com WANT de outro. Usado para notificações de matchmaking.';

-- 2. FUNÇÃO DE MATCHMAKING
-- Encontra ofertas compatíveis (HAVE de A com WANT de B)

CREATE OR REPLACE FUNCTION public.find_matches(p_listing_id UUID DEFAULT NULL)
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
BEGIN
  -- Se p_listing_id fornecido, buscar matches apenas para essa oferta
  -- Senão, buscar todos os matches possíveis
  
  FOR v_listing IN
    SELECT l.id, l.user_id, l.side, l.items, l.status
    FROM listings l
    WHERE l.status = 'OPEN'
      AND (p_listing_id IS NULL OR l.id = p_listing_id)
  LOOP
    IF v_listing.side = 'HAVE' THEN
      -- Buscar ofertas WANT que pedem os mesmos itens
      FOR v_match IN
        SELECT w.id AS want_id, w.user_id AS want_user_id, w.items AS want_items
        FROM listings w
        WHERE w.status = 'OPEN'
          AND w.side = 'WANT'
          AND w.user_id != v_listing.user_id
          AND EXISTS (
            -- Verificar se há overlap de itens
            SELECT 1
            FROM jsonb_array_elements(v_listing.items) AS have_item
            JOIN jsonb_array_elements(w.items) AS want_item
              ON (have_item->>'item_id')::int = (want_item->>'item_id')::int
          )
      LOOP
        -- Calcular score de match (simplificado: % de itens que batem)
        DECLARE
          v_total_have INTEGER;
          v_total_want INTEGER;
          v_matched_count INTEGER;
          v_score REAL;
          v_matched_items JSONB;
        BEGIN
          SELECT COUNT(*) INTO v_total_have
          FROM jsonb_array_elements(v_listing.items);
          
          SELECT COUNT(*) INTO v_total_want
          FROM jsonb_array_elements(v_match.want_items);
          
          SELECT COUNT(*) INTO v_matched_count
          FROM jsonb_array_elements(v_listing.items) AS have_item
          JOIN jsonb_array_elements(v_match.want_items) AS want_item
            ON (have_item->>'item_id')::int = (want_item->>'item_id')::int;
          
          -- Score: média entre % de match em cada lado
          v_score := (
            (v_matched_count::REAL / NULLIF(v_total_have, 0)) +
            (v_matched_count::REAL / NULLIF(v_total_want, 0))
          ) / 2.0;
          
          -- Coletar itens que bateram
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
          
          -- Retornar match
          RETURN QUERY SELECT
            gen_random_uuid(), -- match_id temporário
            v_listing.id,
            v_match.want_id,
            v_listing.user_id,
            v_match.want_user_id,
            v_score,
            COALESCE(v_matched_items, '[]'::jsonb);
        END;
      END LOOP;
    END IF;
  END LOOP;
END;
$$;

COMMENT ON FUNCTION public.find_matches(UUID) IS
  'Encontra ofertas compatíveis: HAVE de um usuário que bate com WANT de outro. Retorna score de compatibilidade e itens que bateram.';

-- 3. INDICADORES DE PRESENÇA (Online/Offline)
-- Adicionar coluna last_seen_at na tabela profiles

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_profiles_last_seen ON public.profiles(last_seen_at);

-- Função para atualizar last_seen_at (chamada via trigger ou API)
CREATE OR REPLACE FUNCTION public.update_user_presence()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Atualizar last_seen_at quando o usuário faz qualquer ação autenticada
  UPDATE profiles
  SET last_seen_at = NOW()
  WHERE id = auth.uid();
  
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.update_user_presence() IS
  'Atualiza last_seen_at do usuário autenticado. Pode ser chamada via trigger ou explicitamente pela aplicação.';

-- Helper: função para verificar se usuário está online (últimos 5 minutos)
CREATE OR REPLACE FUNCTION public.is_user_online(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    (SELECT last_seen_at FROM profiles WHERE id = p_user_id) > NOW() - INTERVAL '5 minutes',
    false
  );
$$;

COMMENT ON FUNCTION public.is_user_online(UUID) IS
  'Retorna true se o usuário esteve ativo nos últimos 5 minutos (considerado online).';

-- 4. VIEW para matches com informações de presença
CREATE OR REPLACE VIEW public.matches_with_presence AS
SELECT
  m.id,
  m.listing_have_id,
  m.listing_want_id,
  m.match_score,
  m.created_at,
  -- Info do usuário HAVE
  p_have.id AS have_user_id,
  p_have.username AS have_username,
  p_have.avatar_url AS have_avatar_url,
  public.is_user_online(p_have.id) AS have_user_online,
  p_have.last_seen_at AS have_last_seen,
  -- Info do usuário WANT
  p_want.id AS want_user_id,
  p_want.username AS want_username,
  p_want.avatar_url AS want_avatar_url,
  public.is_user_online(p_want.id) AS want_user_online,
  p_want.last_seen_at AS want_last_seen
FROM public.matches m
JOIN public.listings l_have ON l_have.id = m.listing_have_id
JOIN public.listings l_want ON l_want.id = m.listing_want_id
JOIN public.profiles p_have ON p_have.id = l_have.user_id
JOIN public.profiles p_want ON p_want.id = l_want.user_id;

COMMENT ON VIEW public.matches_with_presence IS
  'Matches com informações de presença (online/offline) dos usuários envolvidos.';
