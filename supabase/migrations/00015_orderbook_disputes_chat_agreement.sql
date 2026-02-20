-- ============================================================
-- Order book (sync listing_items), disputas, acordo de itens no chat
-- ============================================================

-- 1. SYNC listing_items COM O JSONB items (trigger em INSERT/UPDATE de listings)
CREATE OR REPLACE FUNCTION public.sync_listing_items_from_jsonb()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  elem JSONB;
  v_item_id INT;
  v_qty INT;
BEGIN
  -- Só sincronizar se a tabela listing_items existir e tiver estrutura
  IF jsonb_typeof(NEW.items) != 'array' THEN
    RETURN NEW;
  END IF;

  DELETE FROM public.listing_items WHERE listing_id = NEW.id;

  FOR elem IN SELECT * FROM jsonb_array_elements(NEW.items)
  LOOP
    v_item_id := (elem->>'item_id')::int;
    v_qty := GREATEST((elem->>'qty')::int, 1);
    IF v_item_id IS NOT NULL THEN
      INSERT INTO public.listing_items (listing_id, item_id, qty)
      VALUES (NEW.id, v_item_id, v_qty);
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_listing_items_trigger ON public.listings;
CREATE TRIGGER sync_listing_items_trigger
  AFTER INSERT OR UPDATE OF items ON public.listings
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_listing_items_from_jsonb();

-- Backfill: popular listing_items a partir das listings existentes
INSERT INTO public.listing_items (listing_id, item_id, qty)
SELECT l.id, (elem->>'item_id')::int, GREATEST((elem->>'qty')::int, 1)
FROM public.listings l,
     jsonb_array_elements(l.items) AS elem
WHERE jsonb_typeof(l.items) = 'array'
  AND (elem->>'item_id')::int IS NOT NULL
ON CONFLICT (listing_id, item_id) DO NOTHING;


-- 2. VIEW: Order book por item (Bids = WANT, Asks = HAVE)
CREATE OR REPLACE VIEW public.order_book_by_item AS
SELECT
  i.id AS item_id,
  i.name AS item_name,
  i.category AS item_category,
  l.side,
  l.id AS listing_id,
  l.user_id,
  l.status AS listing_status,
  l.created_at,
  p.username,
  p.rank_tier,
  p.reputation_score,
  li.qty
FROM public.items i
JOIN public.listing_items li ON li.item_id = i.id
JOIN public.listings l ON l.id = li.listing_id AND l.status = 'OPEN'
LEFT JOIN public.profiles p ON p.id = l.user_id
ORDER BY i.id, l.side, l.created_at DESC;

COMMENT ON VIEW public.order_book_by_item IS
  'Livro de ofertas por item: Bids (WANT) e Asks (HAVE) para páginas tipo /market/item/[id].';


-- 3. ACORDO DE ITENS ANTES DO CHAT LIVRE (evitar fuga para Discord)
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS buyer_agreed_items BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS seller_agreed_items BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.transactions.buyer_agreed_items IS
  'Comprador confirmou os itens da troca; quando ambos (buyer+seller) true, chat livre é liberado.';
COMMENT ON COLUMN public.transactions.seller_agreed_items IS
  'Vendedor confirmou os itens da troca.';

-- Só permitir novas mensagens no chat quando ambos acordaram OU quando transação está CONFIRMED/DISPUTED (apenas leitura)
CREATE OR REPLACE FUNCTION public.check_trade_message_allowed()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status TEXT;
  v_buyer_agreed BOOLEAN;
  v_seller_agreed BOOLEAN;
BEGIN
  SELECT status, buyer_agreed_items, seller_agreed_items
  INTO v_status, v_buyer_agreed, v_seller_agreed
  FROM transactions
  WHERE id = NEW.transaction_id;

  IF v_status = 'DISPUTED' THEN
    RAISE EXCEPTION 'Chat bloqueado: esta transação está em disputa.';
  END IF;

  IF v_status = 'PENDING_VERIFICATION' AND (NOT v_buyer_agreed OR NOT v_seller_agreed) THEN
    RAISE EXCEPTION 'Confirme os itens da troca antes de enviar mensagens.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trade_messages_before_insert_check ON public.trade_messages;
CREATE TRIGGER trade_messages_before_insert_check
  BEFORE INSERT ON public.trade_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.check_trade_message_allowed();


-- 4. ESTEIRA DE DISPUTAS (tabelas + trigger ao passar para DISPUTED)
CREATE TABLE IF NOT EXISTS public.dispute_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
  reported_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'UNDER_REVIEW', 'RESOLVED', 'CLOSED')),
  admin_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(transaction_id)
);

CREATE TABLE IF NOT EXISTS public.dispute_evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dispute_id UUID NOT NULL REFERENCES public.dispute_cases(id) ON DELETE CASCADE,
  uploaded_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  file_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dispute_cases_transaction ON public.dispute_cases(transaction_id);
CREATE INDEX IF NOT EXISTS idx_dispute_cases_status ON public.dispute_cases(status);
CREATE INDEX IF NOT EXISTS idx_dispute_evidence_dispute ON public.dispute_evidence(dispute_id);

ALTER TABLE public.dispute_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dispute_evidence ENABLE ROW LEVEL SECURITY;

CREATE POLICY "dispute_cases_select_participants"
  ON public.dispute_cases FOR SELECT
  USING (
    reported_by = auth.uid()
    OR transaction_id IN (
      SELECT id FROM transactions WHERE buyer_id = auth.uid() OR seller_id = auth.uid()
    )
  );

CREATE POLICY "dispute_evidence_select_dispute"
  ON public.dispute_evidence FOR SELECT
  USING (
    dispute_id IN (SELECT id FROM dispute_cases WHERE dispute_cases.reported_by = auth.uid()
      OR transaction_id IN (SELECT id FROM transactions WHERE buyer_id = auth.uid() OR seller_id = auth.uid()))
  );

CREATE POLICY "dispute_evidence_insert_participant"
  ON public.dispute_evidence FOR INSERT
  WITH CHECK (
    uploaded_by = auth.uid()
    AND dispute_id IN (
      SELECT id FROM dispute_cases dc
      JOIN transactions t ON t.id = dc.transaction_id
      WHERE t.buyer_id = auth.uid() OR t.seller_id = auth.uid()
    )
  );

-- RPC para abrir disputa (registra quem acionou = auth.uid())
CREATE OR REPLACE FUNCTION public.open_dispute(p_transaction_id UUID, p_reason TEXT DEFAULT NULL)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_buyer_id UUID;
  v_seller_id UUID;
  v_reported_by UUID;
  v_dispute_id UUID;
BEGIN
  v_reported_by := auth.uid();
  IF v_reported_by IS NULL THEN
    RAISE EXCEPTION 'Não autenticado';
  END IF;

  SELECT buyer_id, seller_id INTO v_buyer_id, v_seller_id
  FROM transactions
  WHERE id = p_transaction_id;

  IF v_buyer_id IS NULL THEN
    RAISE EXCEPTION 'Transação não encontrada';
  END IF;

  IF v_reported_by != v_buyer_id AND v_reported_by != v_seller_id THEN
    RAISE EXCEPTION 'Apenas comprador ou vendedor podem abrir disputa';
  END IF;

  INSERT INTO public.dispute_cases (transaction_id, reported_by, reason, status)
  VALUES (p_transaction_id, v_reported_by, p_reason, 'OPEN')
  ON CONFLICT (transaction_id) DO UPDATE SET
    reason = COALESCE(EXCLUDED.reason, dispute_cases.reason),
    updated_at = NOW()
  RETURNING id INTO v_dispute_id;

  UPDATE public.transactions
  SET status = 'DISPUTED', updated_at = NOW()
  WHERE id = p_transaction_id;

  RETURN v_dispute_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.open_dispute(UUID, TEXT) TO authenticated;

COMMENT ON FUNCTION public.open_dispute(UUID, TEXT) IS
  'Abre disputa na transação e registra quem acionou (reported_by). Use em vez de UPDATE direto no status.';

COMMENT ON TABLE public.dispute_cases IS
  'Esteira de disputas: cada transação DISPUTED gera um caso para análise e upload de provas.';
