# Deploy na Vercel — Do zero ao online

Guia em ordem: do projeto vazio até o site no ar. Siga os passos na sequência.

---

## Parte 1 — Contas e projeto Supabase

### Passo 1 — Contas necessárias

- [ ] **Supabase:** [supabase.com](https://supabase.com) → criar conta e fazer login.
- [ ] **Vercel:** [vercel.com](https://vercel.com) → login com GitHub (recomendado).
- [ ] **Discord:** [discord.com/developers/applications](https://discord.com/developers/applications) → conta Discord para criar a app OAuth.

### Passo 2 — Criar projeto no Supabase

1. No Supabase Dashboard → **New project**.
2. Nome do projeto (ex.: `gpo-trader`), região, senha da base de dados (guarde-a).
3. Esperar o projeto ficar pronto.
4. Ir a **Project Settings** (ícone engrenagem) → **API**.
5. Copiar e guardar:
   - **Project URL** (ex.: `https://xxxxx.supabase.co`)
   - **anon public** (chave longa sob “Project API keys”).

---

## Parte 2 — Banco de dados (migrações)

### Passo 3 — Aplicar migrações no Supabase

1. No Supabase Dashboard → **SQL Editor**.
2. Abrir cada ficheiro de migração **por ordem** (do repositório: pasta `supabase/migrations/`):
   - `00001_initial_schema.sql` → colar no editor → **Run**.
   - `00002_realtime_trade_messages.sql` → **Run**.
   - `00003_add_items_unique.sql` → **Run**.
   - `00004_reputation_trigger_ensure.sql` → **Run**.
   - `00005_reputation_plus_one_discord_age.sql` → **Run**.
   - `00006_admin_items.sql` → **Run**.
   - `00007_weighted_market_prices.sql` → **Run**.
   - `00008_listings_security_validation.sql` → **Run**.
   - `00009_listing_items_normalized.sql` → **Run**.
   - `00010_transaction_timeout_and_auto_expiry.sql` → **Run**.
   - `00011_matchmaking_and_presence.sql` → **Run**.
   - `00012_counter_offers.sql` → **Run**.
   - `00013_audit_recommendations.sql` → **Run**.
   - `00014_race_conditions_and_gc_2h.sql` → **Run**.
   - `00015_orderbook_disputes_chat_agreement.sql` → **Run**.
   - `00016_presence_rpc_and_pagination_fix.sql` → **Run**.
   - `00017_soft_deletes_isr_analytics.sql` → **Run**.
   - `00018_listing_items_wap_admin_disputes.sql` → **Run**.
   - `00019_listing_items_source_of_truth.sql` → **Run** (listing_items como fonte de verdade; JSONB derivado).
   - `00020_find_matches_use_listing_items.sql` → **Run** (matchmaking usa listing_items).
   - `00021_items_full_text_search.sql` → **Run** (FTS na busca de itens).
3. (Opcional) Abrir `supabase/seed.sql`, colar no SQL Editor e **Run** para popular itens iniciais.

### Passo 4 — Realtime

1. **Database** → **Replication**.
2. Confirmar que a tabela **trade_messages** está na publicação **supabase_realtime** (a migração 00002 já faz isso). Se não estiver, adicionar.

---

## Parte 3 — Discord OAuth

### Passo 5 — Criar aplicação no Discord

1. [Discord Developer Portal](https://discord.com/developers/applications) → **New Application** (ex.: nome "GPO Trader").
2. Menu **OAuth2** → **Redirects** → **Add Redirect**:
   - Por agora: `http://localhost:3000/auth/callback`
   - (A URL de produção será adicionada depois do deploy.)
3. Em **OAuth2** → **General**: copiar **Client ID** e **Client Secret** (Reset Secret se precisar).

### Passo 6 — Ligar Discord ao Supabase

1. Supabase Dashboard → **Authentication** → **Providers**.
2. Abrir **Discord** → ativar (Enable).
3. Colar **Client ID** e **Client Secret** do Discord.
4. **Save**.
5. Ir a **Authentication** → **URL Configuration**.
6. Em **Redirect URLs** adicionar: `http://localhost:3000/auth/callback` (produção será adicionada depois).

---

## Parte 4 — Código no GitHub

### Passo 7 — Repositório no GitHub

1. Criar um repositório novo no GitHub (ex.: `gpo-trader`), vazio, sem README.
2. No teu PC, na pasta do projeto (onde está o `package.json`), no terminal:

```bash
git init
git remote add origin https://github.com/TEU_USER/gpo-trader.git
git add .
git commit -m "Initial commit - MVP"
git branch -M main
git push -u origin main
```

(Substituir `TEU_USER` e `gpo-trader` pelo teu utilizador e nome do repo.)

---

## Parte 5 — Deploy na Vercel

### Passo 8 — Importar projeto na Vercel

1. [vercel.com](https://vercel.com) → **Add New** → **Project**.
2. **Import** do repositório GitHub: escolher o repo (ex.: `gpo-trader`).
3. **Import** (pode deixar Framework Preset = Next.js e Root Directory em branco).

### Passo 9 — Variáveis de ambiente na Vercel

Antes de fazer **Deploy**:

1. Na página do projeto (Configure), abrir **Environment Variables**.
2. Adicionar:

| Name | Value |
|------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | A **Project URL** do Supabase (Passo 2) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | A chave **anon public** do Supabase (Passo 2) |

3. Escopo: marcar **Production** (e **Preview** se quiser que deploys de branch também funcionem).
4. **Save**.

### Passo 10 — Fazer o deploy

1. Clicar **Deploy**.
2. Esperar o build terminar. No final terás um link tipo `https://gpo-trader-xxx.vercel.app`.

---

## Parte 6 — Produção: Discord e Supabase

### Passo 11 — Callback de produção no Discord

1. Discord Developer Portal → a tua aplicação → **OAuth2** → **Redirects**.
2. **Add Redirect**: colar a URL do site + `/auth/callback`, por exemplo:
   - `https://gpo-trader-xxx.vercel.app/auth/callback`
   - (ou o teu domínio custom se já o tiveres configurado na Vercel.)
3. **Save Changes**.

### Passo 12 — Callback de produção no Supabase

1. Supabase → **Authentication** → **URL Configuration**.
2. Em **Redirect URLs** adicionar a mesma URL de callback de produção, por exemplo:
   - `https://gpo-trader-xxx.vercel.app/auth/callback`
3. **Save**.

---

## Parte 7 — Validar no ar

### Passo 13 — Testar o site

1. Abrir o link da Vercel (ex.: `https://gpo-trader-xxx.vercel.app`).
2. Clicar em **Login** (ou equivalente) e escolher **Discord**.
3. Autorizar no Discord e voltar ao site — deves estar logado.
4. Testar: **Mercado** → criar uma oferta; noutra sessão (ou outro user) aceitar e confirmar troca (e chat, se usares).

### Passo 14 — (Opcional) Dar admin a um utilizador

1. Fazer login no site com a conta que queres ser admin.
2. Supabase → **SQL Editor** e executar (substituir pelo teu user id; podes ver em **Authentication** → **Users**):

```sql
UPDATE public.profiles SET is_admin = true WHERE id = 'UUID_DO_TEU_USER';
```

3. Recarregar o site e aceder a **/admin/items** e **/admin/disputes** (o botão Admin aparece na nav para admins).

---

## Resumo rápido

| # | O quê |
|---|--------|
| 1 | Contas: Supabase, Vercel, Discord Dev |
| 2 | Criar projeto Supabase e copiar URL + anon key |
| 3 | Correr as 21 migrações no SQL Editor (por ordem) |
| 4 | Confirmar Realtime em `trade_messages` |
| 5 | Criar app Discord e adicionar redirect `localhost` |
| 6 | Supabase Auth: ativar Discord e URL `localhost` |
| 7 | Subir código para GitHub |
| 8 | Vercel: importar repo |
| 9 | Vercel: definir `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| 10 | Deploy na Vercel |
| 11 | Discord: adicionar redirect da URL de produção |
| 12 | Supabase: adicionar redirect da URL de produção |
| 13 | Testar login e fluxo no site |
| 14 | (Opcional) Marcar um user como admin no SQL |

---

*Para mais detalhes (Storage de disputas, Edge Functions, etc.) ver [Documentação Técnica](DOCUMENTACAO_TECNICA.md) e [Checklist MVP](MVP_VERCEL_CHECKLIST.md).*
