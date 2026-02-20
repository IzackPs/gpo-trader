-- Weighted Consensus: preço sugerido por item com base nas últimas N transações CONFIRMED
-- Pesos: YONKO 5x, BROKER 3x, MERCHANT 1x; DRIFTER/CIVILIAN ignorados (peso 0)

CREATE OR REPLACE FUNCTION public.get_market_prices(p_limit_transactions int DEFAULT 50)
RETURNS TABLE (item_id int, suggested_price real)
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
  last_tx AS (
    SELECT t.id, t.listing_id, t.final_items_exchanged, t.implied_value, t.buyer_id, t.seller_id
    FROM transactions t
    WHERE t.status = 'CONFIRMED'
    ORDER BY t.created_at DESC
    LIMIT p_limit_transactions
  ),
  tx_weight AS (
    SELECT lt.id, lt.listing_id, lt.final_items_exchanged, COALESCE(lt.implied_value, 0) AS implied_value,
      (COALESCE(b.w, 0) + COALESCE(s.w, 0)) / 2.0 AS w
    FROM last_tx lt
    LEFT JOIN tier_weight b ON b.id = lt.buyer_id
    LEFT JOIN tier_weight s ON s.id = lt.seller_id
    WHERE (COALESCE(b.w, 0) + COALESCE(s.w, 0)) > 0
  ),
  -- Itens: listing.items se existir, senão final_items_exchanged (array [{ item_id, qty }])
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
  )
  SELECT o.item_id,
    (SUM(o.value_per_unit * o.w) / NULLIF(SUM(o.w), 0))::real AS suggested_price
  FROM observations o
  GROUP BY o.item_id
  ORDER BY o.item_id;
$$;

COMMENT ON FUNCTION public.get_market_prices(int) IS
  'Preço sugerido por item (média ponderada) das últimas N transações CONFIRMED. Pesos: YONKO 5, BROKER 3, MERCHANT 1.';

-- VIEW fixa: últimas 50 transações (para Admin / dashboards)
CREATE OR REPLACE VIEW public.calculate_market_prices
WITH (security_invoker = true)
AS
  SELECT * FROM public.get_market_prices(50);

COMMENT ON VIEW public.calculate_market_prices IS
  'Preço sugerido por item (weighted consensus) com base nas últimas 50 transações CONFIRMED.';

-- Permissões: leitura para usuários autenticados
GRANT EXECUTE ON FUNCTION public.get_market_prices(int) TO authenticated;
GRANT SELECT ON public.calculate_market_prices TO authenticated;
