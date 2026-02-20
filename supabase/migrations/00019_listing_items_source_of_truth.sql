-- ============================================================
-- listing_items como fonte de verdade; listings.items derivado (JSONB)
-- Resolve dívida técnica: app passa a escrever em listing_items;
-- trigger mantém listings.items em sync para leitura.
-- ============================================================

-- 1. Remover o trigger que sincronizava JSONB → listing_items
DROP TRIGGER IF EXISTS sync_listing_items_trigger ON public.listings;

-- 2. Função: ao alterar listing_items, atualizar listings.items (JSONB) a partir da tabela
CREATE OR REPLACE FUNCTION public.sync_listings_jsonb_from_listing_items()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_listing_id UUID;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_listing_id := OLD.listing_id;
  ELSE
    v_listing_id := NEW.listing_id;
  END IF;

  UPDATE public.listings
  SET items = COALESCE(
    (
      SELECT jsonb_agg(
        jsonb_build_object('item_id', li.item_id, 'qty', li.qty)
        ORDER BY li.item_id
      )
      FROM public.listing_items li
      WHERE li.listing_id = v_listing_id
    ),
    '[]'::jsonb
  )
  WHERE id = v_listing_id;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

-- 3. Trigger em listing_items: após INSERT/UPDATE/DELETE, atualizar listings.items
DROP TRIGGER IF EXISTS sync_listings_jsonb_trigger ON public.listing_items;
CREATE TRIGGER sync_listings_jsonb_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.listing_items
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_listings_jsonb_from_listing_items();

COMMENT ON FUNCTION public.sync_listings_jsonb_from_listing_items() IS
  'Mantém listings.items (JSONB) em sync com listing_items. Fonte de verdade é listing_items.';

-- 4. RLS: dono da oferta pode inserir/atualizar/apagar linhas em listing_items
CREATE POLICY "listing_items_insert_owner"
  ON public.listing_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.listings l
      WHERE l.id = listing_items.listing_id AND l.user_id = auth.uid()
    )
  );

CREATE POLICY "listing_items_update_owner"
  ON public.listing_items FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.listings l
      WHERE l.id = listing_items.listing_id AND l.user_id = auth.uid()
    )
  );

CREATE POLICY "listing_items_delete_owner"
  ON public.listing_items FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.listings l
      WHERE l.id = listing_items.listing_id AND l.user_id = auth.uid()
    )
  );
