-- Admin: permitir que usuários marcados como admin atualizem preços dos itens (sem rodar SQL).

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT false;

-- Apenas admins podem atualizar a tabela items (preço e volatilidade).
CREATE POLICY "Only admins can update items"
  ON public.items FOR UPDATE
  USING (
    (SELECT is_admin FROM public.profiles WHERE id = auth.uid()) = true
  )
  WITH CHECK (
    (SELECT is_admin FROM public.profiles WHERE id = auth.uid()) = true
  );

COMMENT ON COLUMN public.profiles.is_admin IS 'Se true, usuário pode editar preços em /admin/items. Definir manualmente: UPDATE profiles SET is_admin = true WHERE id = ''seu-uuid'';';
