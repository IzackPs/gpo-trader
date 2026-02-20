-- ============================================================
-- Normalização: Tabela listing_items (Opcional - Futuro)
-- ============================================================
-- Ver também: docs/TYPES_AND_SCHEMA.md (estado atual: não usada pela app)
--
-- Esta migração cria uma tabela normalizada para substituir
-- o JSONB items na tabela listings.
--
-- ATENÇÃO: Esta migração NÃO migra dados existentes.
-- Para aplicar em produção, você precisaria:
-- 1. Criar a tabela listing_items
-- 2. Migrar dados do JSONB para a nova tabela
-- 3. Atualizar código da aplicação para usar listing_items
-- 4. Remover a coluna items JSONB (ou mantê-la como backup)
--
-- Por enquanto, deixamos a coluna items JSONB como está
-- para não quebrar código existente.

-- Tabela normalizada de itens por oferta
CREATE TABLE IF NOT EXISTS public.listing_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  item_id INTEGER NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,
  qty INTEGER NOT NULL DEFAULT 1 CHECK (qty > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(listing_id, item_id) -- Evita duplicatas
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_listing_items_listing_id ON public.listing_items(listing_id);
CREATE INDEX IF NOT EXISTS idx_listing_items_item_id ON public.listing_items(item_id);

-- RLS: usuários autenticados podem ler listing_items de ofertas públicas
ALTER TABLE public.listing_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "listing_items_select_public"
  ON public.listing_items
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.listings
      WHERE listings.id = listing_items.listing_id
        AND listings.status IN ('OPEN', 'LOCKED')
    )
  );

COMMENT ON TABLE public.listing_items IS
  'Tabela normalizada para itens de ofertas. Substitui o JSONB items da tabela listings para melhor integridade referencial e queries complexas.';

COMMENT ON COLUMN public.listing_items.listing_id IS
  'Referência à oferta (listing)';

COMMENT ON COLUMN public.listing_items.item_id IS
  'Referência ao item do jogo (integridade referencial garantida)';

COMMENT ON COLUMN public.listing_items.qty IS
  'Quantidade do item nesta oferta (>= 1)';

-- Exemplo de query útil com a tabela normalizada:
-- SELECT l.*, li.item_id, li.qty, i.name, i.category
-- FROM listings l
-- JOIN listing_items li ON li.listing_id = l.id
-- JOIN items i ON i.id = li.item_id
-- WHERE l.status = 'OPEN'
--   AND i.id = 123; -- Buscar todas as ofertas que incluem o item 123
