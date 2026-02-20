# Checklist MVP — Deploy na Vercel

Use este documento para validar o projeto antes e depois de subir o MVP na Vercel.

---

## 1. Validação local (antes do deploy)

- [ ] **Variáveis de ambiente:** Existe `.env.local` com `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- [ ] **Build:** `npm run build` termina com sucesso.
- [ ] **Lint:** `npm run lint` sem erros (avisos de `next/image` ou `useEffect` deps são aceitáveis).
- [ ] **TypeScript:** `npx tsc --noEmit` sem erros.
- [ ] **Supabase:** Migrações 00001–00021 aplicadas no projeto (SQL Editor ou `supabase db push`). A migração 00021 (`name_tsv`) é necessária para a busca de itens em “Criar oferta” (FTS); sem ela, a pesquisa por nome falha.
- [ ] **Supabase Auth:** Discord OAuth configurado; redirect URL inclui `http://localhost:3000/auth/callback`.
- [ ] **Supabase Realtime:** Tabela `trade_messages` na publicação `supabase_realtime`.
- [ ] **Storage (opcional):** Bucket `dispute-evidence` criado e políticas RLS configuradas se usar disputas com upload.

---

## 2. Configuração na Vercel

- [ ] Repositório conectado (GitHub/GitLab).
- [ ] **Environment Variables** em Settings → Environment Variables:
  - `NEXT_PUBLIC_SUPABASE_URL` = URL do projeto Supabase
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = chave anon pública
- [ ] Variáveis aplicadas a **Production** (e opcionalmente Preview).
- [ ] **Build Command:** `npm run build` (default).
- [ ] **Output:** Next.js (detetado automaticamente).

---

## 3. Pós-deploy (Supabase em produção)

- [ ] **Discord OAuth:** Em Redirects, adicionar a URL de produção (ex.: `https://seu-app.vercel.app/auth/callback`).
- [ ] **Supabase URL Configuration:** Adicionar a mesma URL em Authentication → URL Configuration.
- [ ] **Teste de login:** Abrir o site em produção e fazer login com Discord; verificar redirect e sessão.
- [ ] **Teste de fluxo:** Criar oferta, aceitar (noutro user ou mesmo), confirmar troca; opcional: abrir disputa e enviar prova.
- [ ] **Admin:** Marcar um utilizador como admin no SQL Editor:  
  `UPDATE public.profiles SET is_admin = true WHERE id = 'uuid-do-utilizador';`  
  Depois aceder a `/admin/items` e `/admin/disputes`.

---

## 4. Avisos conhecidos (não bloqueiam o MVP)

- **Build:** Durante `next build`, a página `/market/analytics` pode mostrar um aviso do PostgREST sobre `get_market_prices_last_week` se o schema cache não tiver a função (ex.: build sem DB). A página é dinâmica (ƒ) e funcionará em runtime quando o Supabase tiver a migração aplicada.
- **Middleware:** Next.js 16 pode mostrar aviso de "middleware" deprecado em favor de "proxy"; o middleware atual continua a funcionar.
- **Lint:** Avisos de `next/image` e dependências de `useEffect` podem ficar para iteração posterior.

---

## 5. Comandos úteis

```bash
npm install
npm run build
npm run lint
npx tsc --noEmit
```

---

*Última atualização: migrações 00001–00021; rate limit (ofertas e mensagens); paginação mercado; FTS em itens; Realtime Presence; listing_items como fonte de verdade.*
