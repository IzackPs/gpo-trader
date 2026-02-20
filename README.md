# GPO Trader – Trust Protocol

Mercado seguro para **Grand Piece Online** baseado em **Web of Trust** e consenso ponderado. Next.js + Supabase.

## Stack

- **Frontend:** Next.js 16 (App Router)
- **Backend/Auth/DB:** Supabase (PostgreSQL, Auth com Discord OAuth, Realtime)

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
- **Mercado:** Listagens em `/market`, criar em `/market/create`, detalhe em `/market/[id]`. Aceitar oferta trava a listing e cria transação.
- **Sala de troca:** `/trades/[id]` – confirmação dupla, disputa e chat em tempo real.
- **Dashboard:** `/dashboard` – reputação, tier e histórico de XP.
- **Reputação:** Trigger `give_reputation_on_confirm` ao marcar transação como CONFIRMED; tier recalculado por trigger em `profiles`.

Documentação do algoritmo de **consenso de preço** (cron): `docs/EDGE_FUNCTION_PRICE_CONSENSUS.md`.

### Admin – preços dos itens

Após rodar a migration `00006_admin_items.sql`, marque seu usuário como admin no SQL Editor do Supabase:

```sql
UPDATE public.profiles SET is_admin = true WHERE id = 'seu-user-uuid';
```

(O UUID está em Authentication → Users → seu usuário.)

Depois acesse **/admin/items**: você pode editar o preço (em Legendary Chests) e a volatilidade de cada item sem rodar SQL.

## TDD

O design está no documento **TDD: GPO Trader Trust Protocol** (visão geral, arquitetura de dados, handshake, gamificação, roadmap e segurança).
