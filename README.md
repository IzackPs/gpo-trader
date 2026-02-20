# GPO Trader – Trust Protocol

Mercado seguro para **Grand Piece Online** baseado em **Web of Trust** e consenso ponderado. Next.js + Supabase.

## Documentação

| Documento | Conteúdo |
|-----------|----------|
| **[Documentação Técnica](docs/DOCUMENTACAO_TECNICA.md)** | Do zero ao ar: stack, variáveis de ambiente, migrações 00001–00021, deploy (Vercel + Supabase), estrutura, cron, ISR, RLS, rate limit, paginação, FTS, referências. |
| **[Documentação de Usabilidade](docs/DOCUMENTACAO_USABILIDADE.md)** | Guia para utilizadores: login, criar oferta, aceitar e confirmar troca, disputas, dashboard, Bolsa/Economia, admin, limites e “Carregar mais”. |
| **[Deploy Vercel — Passo a passo](docs/DEPLOY_VERCEL_PASSO_A_PASSO.md)** | Do zero ao online: contas, Supabase, migrações 00001–00021, Discord OAuth, GitHub, Vercel, callbacks de produção. |
| **[Checklist MVP Vercel](docs/MVP_VERCEL_CHECKLIST.md)** | Validação antes e depois do deploy: build, env, migrações, OAuth em produção, testes. |
| **[Dívida técnica](docs/DIVIDA_TECNICA.md)** | Estado das dívidas: listing_items (resolvido), Realtime Presence (resolvido), rate limit, paginação mercado, FTS, find_matches; avisos conhecidos. |

## Stack

- **Frontend:** Next.js 16 (App Router), React 19, Tailwind CSS v4
- **Backend/Auth/DB:** Supabase (PostgreSQL, Auth com Discord OAuth, Realtime, Realtime Presence)

## Setup

### 1. Variáveis de ambiente

Crie `.env.local` na raiz:

```env
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-anon-key
```

No [Supabase Dashboard](https://supabase.com/dashboard): Authentication → Providers → Discord (habilitar e preencher Client ID/Secret). Em URL Configuration, adicione `http://localhost:3000/auth/callback` (e a URL de produção quando fizer deploy).

### 2. Banco de dados

No Supabase: SQL Editor ou via CLI:

1. Rode as migrations em ordem:
   - `supabase/migrations/00001_initial_schema.sql`
   - `supabase/migrations/00002_realtime_trade_messages.sql`
   - `supabase/migrations/00003_add_items_unique.sql`
   - `supabase/migrations/00004_reputation_trigger_ensure.sql` (reputação ao confirmar troca)
   - `supabase/migrations/00005_reputation_plus_one_discord_age.sql` (**obrigatório**) — define +1 XP ao confirmar troca e calcula **idade da conta Discord** pelo snowflake (não pelo tempo de login no site).
   - `supabase/migrations/00006_admin_items.sql` — adiciona `is_admin` em `profiles` e permissão para admins atualizarem preços em `items`.
   - Migrações **00007** a **00021** (listagens, disputas, WAP, soft deletes, listing_items como fonte de verdade, matchmaking com listing_items, FTS em itens). Aplique em ordem numérica ou use `supabase db push`. Ver [Documentação Técnica](docs/DOCUMENTACAO_TECNICA.md) para a lista completa.

2. Opcional – seed de itens:
   - `supabase/seed.sql`

(Se usar Supabase CLI: `supabase db push` e depois execute o conteúdo de `seed.sql` no SQL Editor.)

### 3. Realtime (chat)

No Dashboard: Database → Replication – a tabela `trade_messages` deve estar na publicação `supabase_realtime` (a migration `00002` faz isso).

### 4. Rodar o app

```bash
npm install
npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000). Entre com Discord, crie ofertas no Mercado e use o handshake (confirmar troca / disputar) na sala de troca.

## Estrutura principal

- **Auth:** Discord OAuth; callback em `/auth/callback`; perfil criado/atualizado por trigger `handle_new_user`.
- **Mercado:** Listagens em `/market` com paginação (24 por página) e botão **“Carregar mais ofertas”**; criar oferta em `/market/create` (server action `createListing`, rate limit 3 ofertas / 5 min); detalhe em `/market/[id]`. Itens da oferta: fonte de verdade em `listing_items`; `listings.items` (JSONB) é derivado por trigger. Indicador “Online” no mercado usa **Supabase Realtime Presence** (canal `market-presence`), sem writes na BD.
- **Sala de troca:** `/trades/[id]` – confirmação dupla, disputa e chat em tempo real; envio de mensagens via server action com rate limit (15 msg / 1 min).
- **Dashboard:** `/dashboard` – reputação, tier e histórico de XP.
- **Reputação:** Trigger `give_reputation_on_confirm` ao marcar transação como CONFIRMED; tier recalculado por trigger em `profiles`.
- **Busca de itens:** Em criar oferta, busca paginada no servidor com **Full Text Search** (coluna `items.name_tsv`, migração 00021). Matchmaking (`find_matches`, `find_matches_for_user`) usa tabela `listing_items` (migração 00020).

Documentação do algoritmo de **consenso de preço** (cron): `docs/EDGE_FUNCTION_PRICE_CONSENSUS.md`.

### Admin – preços dos itens

Após rodar a migration `00006_admin_items.sql`, marque seu usuário como admin no SQL Editor do Supabase:

```sql
UPDATE public.profiles SET is_admin = true WHERE id = 'seu-user-uuid';
```

(O UUID está em Authentication → Users → seu usuário.)

Depois acesse **/admin/items** (preços e ativar/desativar itens) e **/admin/disputes** (listar e resolver disputas com status e notas).

## TDD

O design está no documento **TDD: GPO Trader Trust Protocol** (visão geral, arquitetura de dados, handshake, gamificação, roadmap e segurança).
