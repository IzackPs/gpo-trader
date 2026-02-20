-- ============================================================
-- Full Text Search (FTS) na coluna name da tabela items
-- Melhora performance da busca quando há muitos itens.
-- ============================================================

-- Coluna tsvector gerada a partir de name (configuração portuguesa)
ALTER TABLE public.items
  ADD COLUMN IF NOT EXISTS name_tsv tsvector
  GENERATED ALWAYS AS (to_tsvector('portuguese', name)) STORED;

CREATE INDEX IF NOT EXISTS idx_items_name_tsv ON public.items USING GIN (name_tsv);

COMMENT ON COLUMN public.items.name_tsv IS
  'Índice de busca full-text sobre name. Usado por getFilteredItems quando há termo de busca.';
