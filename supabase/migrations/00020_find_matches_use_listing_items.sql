-- ============================================================
-- Matchmaking: find_matches e find_matches_for_user usam listing_items
-- (em vez de jsonb_array_elements) para melhor performance.
-- ============================================================

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
  v_have_id UUID;
  v_have_user UUID;
  v_want_id UUID;
  v_want_user UUID;
  v_total_have INT;
  v_total_want INT;
  v_matched_count INT;
  v_score REAL;
  v_matched_items JSONB;
BEGIN
  FOR v_have_id, v_have_user IN
    SELECT l.id, l.user_id
    FROM listings l
    WHERE l.status = 'OPEN'
      AND l.side = 'HAVE'
      AND (p_listing_id IS NULL OR l.id = p_listing_id)
  LOOP
    FOR v_want_id, v_want_user IN
      SELECT DISTINCT w.id, w.user_id
      FROM listings w
      INNER JOIN listing_items li_want ON li_want.listing_id = w.id
      INNER JOIN listing_items li_have ON li_have.listing_id = v_have_id AND li_have.item_id = li_want.item_id
      WHERE w.status = 'OPEN'
        AND w.side = 'WANT'
        AND w.user_id != v_have_user
    LOOP
      SELECT COUNT(*) INTO v_total_have FROM listing_items WHERE listing_id = v_have_id;
      SELECT COUNT(*) INTO v_total_want FROM listing_items WHERE listing_id = v_want_id;
      SELECT COUNT(*) INTO v_matched_count
      FROM listing_items li_h
      INNER JOIN listing_items li_w ON li_w.listing_id = v_want_id AND li_w.item_id = li_h.item_id
      WHERE li_h.listing_id = v_have_id;
      v_score := (
        (v_matched_count::REAL / NULLIF(v_total_have, 0)) +
        (v_matched_count::REAL / NULLIF(v_total_want, 0))
      ) / 2.0;
      SELECT jsonb_agg(
        jsonb_build_object(
          'item_id', li_h.item_id,
          'have_qty', li_h.qty,
          'want_qty', li_w.qty
        )
      ) INTO v_matched_items
      FROM listing_items li_h
      INNER JOIN listing_items li_w ON li_w.listing_id = v_want_id AND li_w.item_id = li_h.item_id
      WHERE li_h.listing_id = v_have_id;
      RETURN QUERY SELECT
        gen_random_uuid(),
        v_have_id,
        v_want_id,
        v_have_user,
        v_want_user,
        v_score,
        COALESCE(v_matched_items, '[]'::jsonb);
    END LOOP;
  END LOOP;
END;
$$;

COMMENT ON FUNCTION public.find_matches(UUID) IS
  'Encontra ofertas compatíveis usando listing_items (normalizado). HAVE de um usuário que bate com WANT de outro.';

-- find_matches_for_user: mesma lógica, filtrado por p_user_id (listings do usuário)
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
  v_have_id UUID;
  v_have_user UUID;
  v_want_id UUID;
  v_want_user UUID;
  v_total_have INT;
  v_total_want INT;
  v_matched_count INT;
  v_score REAL;
  v_matched_items JSONB;
BEGIN
  -- Listings HAVE do usuário
  FOR v_have_id, v_have_user IN
    SELECT l.id, l.user_id
    FROM listings l
    WHERE l.status = 'OPEN' AND l.side = 'HAVE' AND l.user_id = p_user_id
  LOOP
    FOR v_want_id, v_want_user IN
      SELECT w.id, w.user_id
      FROM listings w
      INNER JOIN listing_items li_want ON li_want.listing_id = w.id
      INNER JOIN listing_items li_have ON li_have.listing_id = v_have_id AND li_have.item_id = li_want.item_id
      WHERE w.status = 'OPEN' AND w.side = 'WANT' AND w.user_id != v_have_user
    LOOP
      SELECT COUNT(*) INTO v_total_have FROM listing_items WHERE listing_id = v_have_id;
      SELECT COUNT(*) INTO v_total_want FROM listing_items WHERE listing_id = v_want_id;
      SELECT COUNT(*) INTO v_matched_count
      FROM listing_items li_h
      INNER JOIN listing_items li_w ON li_w.listing_id = v_want_id AND li_w.item_id = li_h.item_id
      WHERE li_h.listing_id = v_have_id;
      v_score := (
        (v_matched_count::REAL / NULLIF(v_total_have, 0)) +
        (v_matched_count::REAL / NULLIF(v_total_want, 0))
      ) / 2.0;
      SELECT jsonb_agg(
        jsonb_build_object('item_id', li_h.item_id, 'have_qty', li_h.qty, 'want_qty', li_w.qty)
      ) INTO v_matched_items
      FROM listing_items li_h
      INNER JOIN listing_items li_w ON li_w.listing_id = v_want_id AND li_w.item_id = li_h.item_id
      WHERE li_h.listing_id = v_have_id;
      RETURN QUERY SELECT gen_random_uuid(), v_have_id, v_want_id, v_have_user, v_want_user, v_score, COALESCE(v_matched_items, '[]'::jsonb);
    END LOOP;
  END LOOP;

  -- Listings WANT do usuário
  FOR v_want_id, v_want_user IN
    SELECT l.id, l.user_id
    FROM listings l
    WHERE l.status = 'OPEN' AND l.side = 'WANT' AND l.user_id = p_user_id
  LOOP
    FOR v_have_id, v_have_user IN
      SELECT h.id, h.user_id
      FROM listings h
      INNER JOIN listing_items li_have ON li_have.listing_id = h.id
      INNER JOIN listing_items li_want ON li_want.listing_id = v_want_id AND li_want.item_id = li_have.item_id
      WHERE h.status = 'OPEN' AND h.side = 'HAVE' AND h.user_id != v_want_user
    LOOP
      SELECT COUNT(*) INTO v_total_want FROM listing_items WHERE listing_id = v_want_id;
      SELECT COUNT(*) INTO v_total_have FROM listing_items WHERE listing_id = v_have_id;
      SELECT COUNT(*) INTO v_matched_count
      FROM listing_items li_w
      INNER JOIN listing_items li_h ON li_h.listing_id = v_have_id AND li_h.item_id = li_w.item_id
      WHERE li_w.listing_id = v_want_id;
      v_score := (
        (v_matched_count::REAL / NULLIF(v_total_want, 0)) +
        (v_matched_count::REAL / NULLIF(v_total_have, 0))
      ) / 2.0;
      SELECT jsonb_agg(
        jsonb_build_object('item_id', li_w.item_id, 'have_qty', li_h.qty, 'want_qty', li_w.qty)
      ) INTO v_matched_items
      FROM listing_items li_w
      INNER JOIN listing_items li_h ON li_h.listing_id = v_have_id AND li_h.item_id = li_w.item_id
      WHERE li_w.listing_id = v_want_id;
      RETURN QUERY SELECT gen_random_uuid(), v_have_id, v_want_id, v_have_user, v_want_user, v_score, COALESCE(v_matched_items, '[]'::jsonb);
    END LOOP;
  END LOOP;
END;
$$;

COMMENT ON FUNCTION public.find_matches_for_user(UUID) IS
  'Retorna matches em que o usuário participa (HAVE ou WANT). Usa listing_items.';
