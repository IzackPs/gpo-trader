# Validação do Projeto — Arquitetura, Segurança e Escalabilidade

Documento de auditoria e melhorias aplicadas (validação sénior).

---

## 1. Arquitetura

### 1.1 Estrutura

- **App Router** com separação clara: páginas públicas (`/`, `/market`, `/market/analytics`) usam `createClientPublic()` e ISR; páginas autenticadas usam `createClient()` (cookies).
- **Componentes** agrupados por feature: `components/ui/`, `components/layout/`, `components/market/`, `components/trades/` (ex.: TradeChat), `components/landing/`; `lib/utils.ts` para helpers partilhados (ex.: `cn()`).
- **Middleware** protege `/dashboard`, `/market/create`, `/admin`, `/trades`; redireciona não autenticados para `/auth?redirect=...`.
- **Admin:** layout partilhado com navegação; verificação `is_admin` em layout e em cada página; RLS no Supabase restringe SELECT/UPDATE de disputas e itens.

### 1.2 Decisões

- **listing_items vs JSONB:** Fonte de verdade é **`listing_items`** (mig 00019). A app escreve em `listing_items` ao criar ofertas; o trigger `sync_listings_jsonb_from_listing_items` deriva `listings.items` (JSONB) para leitura. WAP e matchmaking usam `listing_items` (mig 00018, 00020). Ver `docs/DECISAO_LISTING_ITEMS.md`.
- **ISR:** Páginas de leitura pública não usam cookies para fetch, permitindo cache e `revalidate`.
- **Presença:** No mercado, indicador “Online” usa **Supabase Realtime Presence** (canal `market-presence`), sem writes na BD.

---

## 2. Segurança

### 2.1 Correções aplicadas

| Área | Problema | Solução |
|------|----------|---------|
| **Auth callback** | Parâmetro `next` permitia open redirect (ex.: `?next=https://evil.com`). | Validação `safeRedirectPath()`: apenas paths relativos (começam com `/` e não contêm `//`). |
| **Variáveis de ambiente** | Uso de `!` podia gerar erros pouco claros em runtime. | Função `getSupabaseEnv()` que lança erro explícito se URL ou ANON_KEY faltarem. |
| **Listagem de ofertas** | Sem limite; em escala podia devolver milhares de linhas. | **Paginação:** 24 ofertas por página + botão “Carregar mais ofertas” (`getMarketListings`). |
| **Busca de itens** | Termo de busca sem limite de tamanho (risco de abuso). | Corte em **150** caracteres (`SEARCH_MAX_LENGTH`) em `getFilteredItems`. |
| **Upload de evidências** | Extensão do ficheiro vinda do nome (ex.: `file.exe` → `.exe`). Nome do ficheiro guardado sem sanitização. | Extensão derivada apenas do MIME type (mapa fixo). Nome sanitizado (só alfanuméricos, `._-`) e truncado a 200 caracteres. |
| **Upload de evidências** | Inserção em `dispute_evidence` sem confirmar que o utilizador está autenticado antes. | Verificação de `auth.getUser()` antes do insert; mensagem de erro se sessão expirada. |
| **Dados expostos no cliente** | Detalhe da oferta usava `profiles (*)`, expondo `discord_id`, `strikes`, `account_age_days` sem necessidade. | Select restrito a `profiles (username, avatar_url, reputation_score, rank_tier)`. |

### 2.2 Já garantido pelo projeto

- **RLS** em todas as tabelas sensíveis; políticas por papel (owner, participant, admin).
- **Validação no servidor:** triggers (ex.: `validate_listing_creation`, `accept_listing_offer`) e RLS impedem bypass por cliente.
- **Admin:** acesso a `/admin/*` requer middleware (auth) + checagem `is_admin` nas páginas + RLS para UPDATE em `items` e `dispute_cases`.
- **Server Actions** que alteram estado usam `createClient()` e dependem de `auth.getUser()`; RLS aplica-se às operações no Supabase.

---

## 3. Escalabilidade

### 3.1 Melhorias aplicadas

- **Mercado:** Paginação real (24 ofertas por página) e botão “Carregar mais ofertas” (`getMarketListings(offset)`).
- **Rate limit:** Criação de ofertas (máx. 3 em 5 min) e mensagens no chat (máx. 15 em 1 min) via server actions `createListing` e `sendTradeMessage`.
- **Itens:** Busca paginada no servidor com **Full Text Search** (coluna `items.name_tsv`, mig 00021); limite de caracteres na busca (150); paginação com “Carregar mais” em criar oferta.
- **Matchmaking:** `find_matches` e `find_matches_for_user` usam a tabela **`listing_items`** (mig 00020).
- **Presença:** Supabase Realtime Presence no mercado (canal `market-presence`); sem heartbeats na BD nessa página.

### 3.2 Recomendações futuras

- **Rate limit à escala:** Para tráfego muito alto, considerar rate limit no Edge (ex.: Vercel) ou no Supabase.
- **Matchmaking:** Se o volume de ofertas crescer muito, considerar cache ou tabela materializada de matches.

---

## 4. Qualidade de código e consistência

- **Tipos:** `types/index.ts` alinhado ao schema; evitação de `any` onde foi possível.
- **Erros:** Server Actions e fetches com tratamento de erro (log ou mensagem ao utilizador); `getFilteredItems` devolve array vazio em caso de erro.
- **Lint:** projeto com 0 erros de ESLint; avisos restantes (ex.: `next/image`, dependências de `useEffect`) documentados ou aceites como dívida técnica.

**Dívida técnica:** Itens resolvidos e avisos conhecidos (middleware, lint) estão em `docs/DIVIDA_TECNICA.md`.

---

## 5. Checklist de validação

| Item | Estado |
|------|--------|
| Open redirect no auth callback | ✅ Corrigido |
| Paginação no mercado + rate limit ofertas/mensagens | ✅ getMarketListings, createListing, sendTradeMessage |
| Limite e sanitização na busca de itens | ✅ 150 chars, limit 200 |
| Upload de evidências: extensão e nome seguros | ✅ MIME → ext, nome sanitizado |
| Env vars com mensagem clara em falta | ✅ getSupabaseEnv() |
| Minimização de dados no detalhe da oferta | ✅ Select explícito em profiles |
| Middleware a proteger rotas sensíveis | ✅ |
| Admin com verificação is_admin + RLS | ✅ |
| ISR em páginas públicas sem cookies | ✅ createClientPublic |

---

*Última validação: migrações 00019–00021; listing_items fonte de verdade; Realtime Presence; rate limit; paginação mercado; FTS itens; find_matches com listing_items; docs atualizados.*
