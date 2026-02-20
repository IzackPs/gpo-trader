# Documentação Técnica — GPO Trader

Documento único de referência: do zero ao deploy em produção. Stack, ambiente, banco de dados, automações e decisões de arquitetura.

---

## 1. Visão geral do projeto

| Aspecto | Detalhe |
|--------|--------|
| **Nome** | GPO Trader – Trust Protocol |
| **Objetivo** | Mercado seguro para trocas no jogo **Grand Piece Online** (GPO), baseado em Web of Trust, reputação e confirmação dupla. |
| **Stack** | Next.js 16 (App Router), React 19, Supabase (PostgreSQL + Auth + Realtime + Storage), Tailwind CSS v4 |
| **Auth** | Discord OAuth via Supabase Auth |
| **Deploy** | Frontend: Vercel. Backend/DB: Supabase (cloud). Opcional: Edge Function para cron. |

---

## 2. Pré-requisitos e ferramentas

- **Node.js** 20+
- **npm** (ou pnpm/yarn)
- **Conta Supabase** ([supabase.com](https://supabase.com))
- **Conta Vercel** ([vercel.com](https://vercel.com)) para deploy do Next.js
- **Aplicação Discord** (Developer Portal) para OAuth: Client ID e Client Secret

---

## 3. Variáveis de ambiente

### 3.1 Desenvolvimento local

Crie na **raiz do projeto** o ficheiro `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://SEU_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-anon-key-aqui
```

- **Onde obter:** Supabase Dashboard → Project Settings → API → `Project URL` e `anon` `public` key.

**Importante:** Não commitar `.env.local`. O `.gitignore` já deve incluir `.env*` (exceto `.env.example` se existir).

### 3.2 Produção (Vercel)

Nas definições do projeto Vercel → **Settings → Environment Variables**, defina:

| Nome | Valor | Notas |
|------|--------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://SEU_PROJECT_REF.supabase.co` | Mesmo projeto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Chave anon do projeto | Pode ser exposta no cliente |

### 3.3 Edge Function (cron-jobs)

Se usar a Edge Function para cron (alternativa ao pg_cron do Supabase), defina no Supabase Dashboard → Edge Functions → cron-jobs → **Secrets**:

| Nome | Valor |
|------|--------|
| `CRON_SECRET` | Token aleatório (ex.: `openssl rand -hex 32`) |
| `SUPABASE_URL` | URL do projeto (por vezes já injetada) |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (nunca no frontend) |

---

## 4. Configuração do Supabase

### 4.1 Criar projeto

1. Dashboard Supabase → **New project**.
2. Escolha região, senha da base de dados (guardar em local seguro).
3. Após criar, anote **Project URL** e **anon key** para o `.env.local`.

### 4.2 Discord OAuth

1. [Discord Developer Portal](https://discord.com/developers/applications) → **New Application**.
2. **OAuth2** → **Redirects:** adicione:
   - Desenvolvimento: `http://localhost:3000/auth/callback`
   - Produção: `https://seu-dominio.vercel.app/auth/callback`
3. Copie **Client ID** e **Client Secret**.
4. Supabase Dashboard → **Authentication** → **Providers** → **Discord**:
   - Ativar Discord.
   - Colar Client ID e Client Secret.
5. **URL Configuration:** em "Redirect URLs" adicione as mesmas URLs de callback acima.

### 4.3 Migrações do banco de dados

As migrações devem ser executadas **por ordem numérica**. No Supabase: **SQL Editor** (ou via CLI `supabase db push`).

| Ordem | Ficheiro | Descrição |
|-------|----------|-----------|
| 1 | `00001_initial_schema.sql` | Schema inicial: profiles, items, listings, transactions, reputation_events, trade_messages, RLS, triggers básicos |
| 2 | `00002_realtime_trade_messages.sql` | Realtime para `trade_messages` |
| 3 | `00003_add_items_unique.sql` | Unicidade em items (nome/categoria) |
| 4 | `00004_reputation_trigger_ensure.sql` | Reputação ao confirmar troca |
| 5 | `00005_reputation_plus_one_discord_age.sql` | +1 XP ao confirmar; idade da conta Discord (anti-Sybil) |
| 6 | `00006_admin_items.sql` | `is_admin` em profiles; políticas para admins editarem `items` |
| 7 | `00007_weighted_market_prices.sql` | Função preço médio ponderado (WAP) |
| 8 | `00008_listings_security_validation.sql` | Trigger `validate_listing_creation` (limites por tier, idade mínima, strikes) |
| 9 | `00009_listing_items_normalized.sql` | Tabela `listing_items` (normalização; app ainda usa JSONB em `listings.items`) |
| 10 | `00010_transaction_timeout_and_auto_expiry.sql` | Timeout de transações (24h) e expiração de ofertas (5 dias) |
| 11 | `00011_matchmaking_and_presence.sql` | `find_matches`, presença (`last_seen_at`), `is_user_online` |
| 12 | `00012_counter_offers.sql` | Tabela contrapropostas |
| 13 | `00013_audit_recommendations.sql` | Ajustes de auditoria (RLS, etc.) |
| 14 | `00014_race_conditions_and_gc_2h.sql` | Concorrência e GC de transações pendentes (2h) |
| 15 | `00015_orderbook_disputes_chat_agreement.sql` | Disputas, acordo de itens, chat na troca |
| 16 | `00016_presence_rpc_and_pagination_fix.sql` | RPC de presença e correções de paginação |
| 17 | `00017_soft_deletes_isr_analytics.sql` | `is_active` em items (soft delete), validação de itens ativos, `get_market_prices_last_week()` |

**Seed (opcional):** Executar `supabase/seed.sql` no SQL Editor para popular a tabela `items` com dados iniciais.

### 4.4 Realtime

Dashboard → **Database** → **Replication**: a tabela `trade_messages` deve estar na publicação `supabase_realtime` (a migração 00002 costuma configurar). Necessário para o chat em tempo real na sala de troca.

### 4.5 Storage (disputas)

Para upload de evidências em disputas:

1. **Storage** → **New bucket** → Nome: `dispute-evidence` (privado).
2. Políticas RLS conforme `docs/DISPUTES_AND_STORAGE.md` (INSERT/SELECT para participantes da disputa).

---

## 5. Estrutura do projeto (principais pastas e ficheiros)

```
gpo-trader/
├── app/                    # Next.js App Router
│   ├── layout.tsx           # Layout raiz (Navbar, Footer)
│   ├── page.tsx             # Landing page
│   ├── globals.css
│   ├── auth/                # Login Discord, callback, erro de code
│   ├── dashboard/           # Perfil, reputação, tier, histórico
│   ├── market/              # Mercado global
│   │   ├── page.tsx         # Listagem de ofertas (ISR 15s, createClientPublic)
│   │   ├── market-client.tsx
│   │   ├── create/          # Criar oferta (protegido)
│   │   ├── [id]/            # Detalhe da oferta, aceitar
│   │   ├── item/[id]/       # Página do item
│   │   └── analytics/       # Bolsa / WAP última semana (ISR 60s)
│   ├── trades/[id]/         # Sala de troca (confirmar, disputar, chat)
│   │   └── dispute/         # Abrir disputa e enviar evidências
│   ├── admin/items/         # Admin: preços e is_active (soft delete)
│   ├── terms/
│   └── forbidden/
├── components/              # UI reutilizável (Button, Card, Navbar, etc.)
├── types/                   # TypeScript (Profile, Listing, Transaction, etc.)
├── utils/
│   └── supabase/
│       ├── server.ts        # createClient() (cookies) e createClientPublic() (sem cookies, ISR)
│       └── client.ts       # Cliente browser (SSR)
├── middleware.ts            # Proteção de rotas (dashboard, market/create, admin, trades)
├── supabase/
│   ├── migrations/          # Todas as migrações SQL (ordem 00001–00017)
│   ├── functions/cron-jobs/ # Edge Function opcional para cron
│   └── seed.sql
└── docs/                    # Documentação (este ficheiro, AUTOMATION_SETUP, etc.)
```

---

## 6. O que faz cada parte (resumo)

### 6.1 Autenticação

- **Login:** Discord OAuth. Botão "Entrar com Discord" em `/auth` redireciona para Discord e volta para `/auth/callback`.
- **Callback** (`app/auth/callback/route.ts`): Troca o `code` por sessão Supabase e redireciona para `next` (ex.: `/dashboard`) ou `/auth/auth-code-error` em falha.
- **Perfil:** O trigger `handle_new_user` no Supabase cria/atualiza `profiles` a partir de `auth.users` (username, avatar, discord_id, account_age_days).

### 6.2 Middleware

- **Ficheiro:** `middleware.ts`.
- **Rotas protegidas:** `/dashboard`, `/market/create`, `/admin`, `/trades`.
- **Comportamento:** Se não houver sessão, redireciona para `/auth?redirect=<path>`.

### 6.3 Clientes Supabase (servidor)

- **`createClient()`** (em `utils/supabase/server.ts`): Usa `cookies()` do Next.js para sessão. Usar em páginas que dependem do utilizador (dashboard, criar oferta, sala de troca, admin). Torna a rota **dinâmica** (sem ISR).
- **`createClientPublic()`**: Cliente sem cookies (apenas URL + anon key). Usar em páginas **públicas de leitura** (`/market`, `/market/analytics`) para que o Next.js possa cachear e aplicar **ISR** (`revalidate = 15` ou `60`).

### 6.4 Mercado e listagens

- **Listagem** (`/market`): Server Component com `createClientPublic()`, `revalidate = 15`. Lista ofertas OPEN com dados do perfil (username, avatar, rank_tier, last_seen_at).
- **Criar oferta** (`/market/create`): Protegido. Validação no servidor (trigger `validate_listing_creation`): conta Discord ≥ 30 dias, strikes < 3, limite de ofertas por tier (DRIFTER 1, CIVILIAN 3, MERCHANT/BROKER/YONKO 999). Apenas itens com `is_active = true` são listados.
- **Detalhe** (`/market/[id]`): Ver oferta e "Aceitar oferta". Aceitar cria transação (PENDING_VERIFICATION) e bloqueia a listing (LOCKED).

### 6.5 Sala de troca

- **`/trades/[id]`**: Comprador e vendedor confirmam a troca (double handshake). Quando ambos confirmam, a transação passa a CONFIRMED, reputação sobe (trigger `give_reputation_on_confirm`). Chat em tempo real (`trade_messages` + Realtime). Opção "Não realizou / Golpe" abre disputa.
- **Disputa** (`/trades/[id]/dispute`): Upload de evidências para o bucket `dispute-evidence`; registro em `dispute_cases`.

### 6.6 Admin

- **`/admin/items`**: Apenas utilizadores com `profiles.is_admin = true`. Editar preço (Legendary Chests) e volatilidade; **ativar/desativar** itens (soft delete). Nunca DELETE físico em `items`.

### 6.7 Analytics (Bolsa)

- **`/market/analytics`**: Chama RPC `get_market_prices_last_week()`. Preço médio ponderado (WAP) por item na última semana (transações CONFIRMED). Usa `createClientPublic()` e `revalidate = 60`.

### 6.8 Soft deletes (itens)

- Coluna `items.is_active` (default true). No admin, desativar em vez de apagar. No frontend (criar oferta, listagens), filtrar `is_active = true`. A função `validate_listing_creation` já exige itens ativos.

---

## 7. Automações (Cron)

Para não depender apenas de execução manual, agende no Supabase (Database → **Cron Jobs**) ou use a Edge Function.

| Job | Função SQL | Sugestão de schedule | Descrição |
|-----|------------|----------------------|-----------|
| Timeout transações | `SELECT public.handle_transaction_timeout();` | `0 * * * *` (hora a hora) | Cancela transações PENDING_VERIFICATION > 24h; +1 strike ao que não confirmou; desbloqueia listing |
| Expirar ofertas | `SELECT public.expire_old_listings();` | `0 2 * * *` (2h da manhã) | Listings OPEN com mais de 5 dias → CANCELLED |
| GC 2h (opcional) | `SELECT public.expire_pending_transactions_2h();` | Conforme política | Cancelar pendentes há 2h (mais agressivo) |
| Contrapropostas | `SELECT public.expire_counter_offers();` | Diário | Expira contrapropostas antigas |

**Edge Function:** `supabase/functions/cron-jobs/index.ts` pode ser chamada por um cron externo (ex.: Vercel Cron) com header `Authorization: Bearer CRON_SECRET`. Ver `docs/AUTOMATION_SETUP.md`.

---

## 8. Deploy em produção (resumo)

### 8.1 Supabase

- Projeto já criado; migrações e seed aplicados.
- Discord OAuth com redirect URL de produção.
- Cron jobs agendados (ou Edge Function com CRON_SECRET).
- Storage `dispute-evidence` e políticas criados se usar disputas com upload.

### 8.2 Vercel

1. Importar repositório Git (GitHub/GitLab) no Vercel.
2. **Environment Variables:** `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
3. Deploy: `npm run build` (Next.js). Domínio padrão ou custom.

### 8.3 Checklist pós-deploy

- [ ] Login com Discord na URL de produção.
- [ ] Callback URL em Discord e Supabase aponta para `https://seu-dominio/auth/callback`.
- [ ] Criar oferta, aceitar, confirmar troca (teste de ponta a ponta).
- [ ] Verificar `/market` e `/market/analytics` (ISR; sem erros de RLS para anon).
- [ ] Marcar primeiro admin: `UPDATE profiles SET is_admin = true WHERE id = 'uuid';`.
- [ ] Cron jobs a correr (verificar na base transações antigas e ofertas expiradas).

---

## 9. Referências rápidas

- **Tipos e schema:** `docs/TYPES_AND_SCHEMA.md`
- **Automações e cron:** `docs/AUTOMATION_SETUP.md`
- **Disputas e Storage:** `docs/DISPUTES_AND_STORAGE.md`
- **Auditoria de arquitetura:** `docs/ARCHITECTURE_AUDIT.md`
- **Consenso de preço (cron/edge):** `docs/EDGE_FUNCTION_PRICE_CONSENSUS.md`

---

*Última atualização: referente ao estado do projeto com migração 00017 (soft deletes, ISR, analytics) e documentação de usabilidade em paralelo.*
