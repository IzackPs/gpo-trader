-- ============================================================
-- Sistema de Contrapropostas (Counter-Offers)
-- ============================================================

-- Tabela para armazenar contrapropostas
CREATE TABLE IF NOT EXISTS public.counter_offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  original_listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  proposer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  proposed_items JSONB NOT NULL DEFAULT '[]'::jsonb,
  message TEXT, -- Mensagem opcional do proponente
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'ACCEPTED', 'REJECTED', 'EXPIRED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days') -- Expira após 7 dias
);

CREATE INDEX idx_counter_offers_listing ON public.counter_offers(original_listing_id);
CREATE INDEX idx_counter_offers_proposer ON public.counter_offers(proposer_id);
CREATE INDEX idx_counter_offers_status ON public.counter_offers(status);

-- RLS: usuários podem ver contrapropostas relacionadas às suas ofertas
ALTER TABLE public.counter_offers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "counter_offers_select_own"
  ON public.counter_offers
  FOR SELECT
  USING (
    proposer_id = auth.uid()
    OR original_listing_id IN (
      SELECT id FROM listings WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "counter_offers_insert_own"
  ON public.counter_offers
  FOR INSERT
  WITH CHECK (proposer_id = auth.uid());

CREATE POLICY "counter_offers_update_own"
  ON public.counter_offers
  FOR UPDATE
  USING (
    proposer_id = auth.uid()
    OR original_listing_id IN (
      SELECT id FROM listings WHERE user_id = auth.uid()
    )
  );

COMMENT ON TABLE public.counter_offers IS
  'Contrapropostas enviadas para ofertas existentes. Permite negociação flexível além do modelo rígido HAVE/WANT.';

-- Função para expirar contrapropostas antigas
CREATE OR REPLACE FUNCTION public.expire_counter_offers()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE counter_offers
  SET status = 'EXPIRED',
      updated_at = NOW()
  WHERE status = 'PENDING'
    AND (expires_at < NOW() OR created_at < NOW() - INTERVAL '7 days');
END;
$$;

COMMENT ON FUNCTION public.expire_counter_offers() IS
  'Expira contrapropostas pendentes há mais de 7 dias ou que passaram da data de expiração.';
