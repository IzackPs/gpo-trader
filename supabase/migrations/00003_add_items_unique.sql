-- Opcional: evita duplicatas por (name, category) em re-seeds
CREATE UNIQUE INDEX IF NOT EXISTS idx_items_name_category ON public.items (name, category);
