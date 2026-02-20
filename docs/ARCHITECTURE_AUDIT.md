# Auditoria de Arquitetura — GPO Trader

**Visão:** Arquiteto sênior  
**Escopo:** Projeto completo (infraestrutura, segurança, frontend, dados)  
**Data:** 2025

---

## 1. Visão geral do projeto

| Aspecto | Estado |
|--------|--------|
| Stack | Next.js 16, React 19, Supabase (PostgreSQL + Auth), Tailwind v4 |
| Estrutura | App Router, Server + Client Components, RLS |
| Migrações | 12 arquivos, evolução consistente |

**Pontos fortes:** Uso correto de Server Components onde faz sentido, validações críticas no banco (trigger em `listings`), RLS em todas as tabelas sensíveis, documentação de automações.

---

## 2. Banco de dados e migrações

### 2.1 Schema e integridade

- **ENUMs** alinhados ao domínio (rank_tier, transaction_status, etc.).
- **FKs** bem definidas (profiles → auth.users, listings → profiles, transactions → listings/profiles).
- **Constraints:** `items_array_check` em listings; trigger `validate_listing_creation` cobre anti-Sybil, limites por tier e formato do JSONB.

**Problema identificado:** Tabela `listing_items` (00009) existe mas não é usada; `listings.items` continua JSONB. Risco de divergência se no futuro parte do código usar `listing_items` e outra parte o JSONB.

**Recomendação:** Ou migrar de fato para `listing_items` (dados + código) ou remover a migração 00009 até haver plano claro de migração.

### 2.2 RLS (Row Level Security)

| Tabela | SELECT | INSERT | UPDATE | DELETE |
|--------|--------|--------|--------|--------|
| profiles | Todos | — (trigger) | Dono | — |
| items | Todos | — | Apenas admin (00006) | — |
| listings | OPEN/LOCKED ou dono | Dono | Dono | Dono |
| transactions | Buyer ou Seller | Buyer | Buyer ou Seller | — |
| reputation_events | Dono | — (apenas triggers) | — | — |
| trade_messages | Participantes | Participantes | — | — |

- **Transações:** Só o `buyer_id` pode INSERT (quem aceita a oferta). Consistente com o fluxo “aceitar oferta”.
- **reputation_events:** Sem policy de INSERT para usuários; apenas funções SECURITY DEFINER escrevem. Correto.

**Gap:** Não há policy de INSERT em `reputation_events` para o role que a app usa; as funções que fazem INSERT são SECURITY DEFINER, então executam com dono da função e contornam RLS. OK.

### 2.3 Funções e triggers

- **handle_new_user:** Cria/atualiza profile a partir de auth.users; trata Discord e idade.
- **validate_listing_creation:** Anti-Sybil (30 dias), limite por tier, estrutura do JSONB e existência de `item_id` em `items`.
- **give_reputation_on_confirm:** +10 XP ao passar para CONFIRMED; trigger em UPDATE.
- **recompute_rank_tier:** Atualiza tier por reputação (e account_age_days para CIVILIAN).
- **handle_transaction_timeout:** Cancela transações pendentes >24h e aplica strikes (SECURITY DEFINER).
- **expire_old_listings:** Cancela listings OPEN com mais de 5 dias.
- **matches_different_users_trigger:** Impede match entre o mesmo usuário (substitui CHECK com subquery).

**Consistência:** Limites de tier (1, 3, 999) estão na função `validate_listing_creation` e em `types/index.ts` (TIER_LIMITS). Manter os dois em sync ao alterar regras.

### 2.4 find_matches (00011)

- Retorna tabela com match_id, listing_have_id, listing_want_id, have_user_id, want_user_id, match_score, matched_items.
- Lógica: para cada listing HAVE em OPEN, busca listings WANT com overlap de item_id; calcula score e itens batidos.
- **Atenção:** `match_id` é `gen_random_uuid()` por linha; a tabela `matches` não é preenchida por essa função. O componente `MatchNotifications` chama `find_matches()` e usa o retorno em memória; não há persistência de matches. Documentar ou passar a persistir na tabela `matches` se quiser histórico/notificações persistentes.

---

## 3. Segurança

### 3.1 Autenticação e autorização

- Auth via Supabase (OAuth/Discord); callback em `app/auth/callback/route.ts`.
- Páginas protegidas fazem `getUser()` e `redirect("/auth")` ou `redirect("/")` quando não autenticado (ex.: create listing, dashboard, trade room).
- **Ausência de middleware:** Rotas como `/dashboard`, `/market/create`, `/admin/*`, `/trades/[id]` não têm middleware; a proteção é em cada page/layout. Funciona, mas qualquer nova rota protegida pode ser esquecida.

**Recomendação:** Introduzir `middleware.ts` que proteja por path (ex.: `/dashboard`, `/market/create`, `/admin`, `/trades`) e redirecione não autenticados para `/auth`, centralizando a regra.

### 3.2 Admin

- `profiles.is_admin` controla quem pode dar UPDATE em `items` (policy 00006).
- Páginas em `app/admin/items` usam Server/Client e só mostram conteúdo para admin; a real proteção é o RLS (apenas admin consegue UPDATE em items).

**Recomendação:** No Server Component da página admin, checar `is_admin` e retornar 403 ou redirect se não for admin, para evitar flash de UI antes do RLS falhar.

### 3.3 Dados sensíveis

- Nenhum segredo em repositório (apenas `.env.local` com Supabase URL/Key).
- Service Role Key não deve ser usado no client; Edge Function `cron-jobs` usa variável de ambiente (service role no Supabase).

---

## 4. Frontend e aplicação

### 4.1 Estrutura App Router

- **Server Components:** `app/page.tsx`, `app/market/page.tsx`, `app/market/create/page.tsx`, `app/market/[id]/page.tsx`, `app/trades/[id]/page.tsx`, `app/dashboard/page.tsx`, `app/admin/items/page.tsx`. Boa divisão de fetch no servidor.
- **Client Components:** Formulários (create listing), TradeChat, MatchNotifications, MarketClient (presença), LiveStats, Navbar. Coerente com interatividade.

### 4.2 Cliente Supabase

- **Server:** `utils/supabase/server.ts` com `createServerClient` e cookies; uso com `await createClient()`.
- **Client:** `utils/supabase/client.ts` com `createBrowserClient`. Uso correto em componentes client.

### 4.3 Tipos (types/index.ts)

- Alinhados ao schema (RankTier, ItemCategory, Listing, Transaction, Profile, etc.).
- `Profile` inclui `last_seen_at` e `is_admin`; `TIER_LIMITS` e `MIN_ACCOUNT_AGE_DAYS` centralizados.
- **Risco:** Se o backend mudar (novo enum, nova coluna obrigatória), o TypeScript não enxerga; não há geração de tipos a partir do Supabase. Recomendação futura: `supabase gen types typescript` e re-exportar ou estender em `types/index.ts`.

### 4.4 Presença (last_seen_at)

- `MarketClient` faz UPDATE em `profiles` com `last_seen_at` a cada carga e a cada 2 minutos.
- RLS em profiles: UPDATE apenas `auth.uid() = id`, então o usuário só atualiza o próprio perfil. Correto.

### 4.5 MatchNotifications

- **Implementado:** Usa `find_matches_for_user(p_user_id)` (RPC que retorna apenas matches do usuário). A tabela `matches` não é preenchida por essa função; os resultados são calculados sob demanda. Ver migração 00013.

---

## 5. Fluxos críticos

### 5.1 Criar oferta

1. Server Component carrega itens, perfil, contagem de listings OPEN.
2. Client Component envia INSERT em `listings` com `user_id`, `side`, `items` (JSONB).
3. Trigger `validate_listing_creation` valida idade, limite de tier, formato e itens existentes. Seguro.

### 5.2 Aceitar oferta e criar transação

- **Implementado:** Server Action chama a RPC `accept_listing_offer(p_listing_id, p_buyer_id)` (migração 00013), que de forma atômica: (1) UPDATE listing para LOCKED onde status = OPEN, (2) INSERT em transactions. Evita race e listing LOCKED órfã.

### 5.3 Confirmar troca e disputa

- Confirmar: UPDATE com buyer_confirmed ou seller_confirmed; se ambos true, outro UPDATE seta status CONFIRMED. Trigger dá reputação.
- Disputar: UPDATE status DISPUTED. Não há fluxo de resolução (upload de provas, decisão admin) ainda; apenas estado.

---

## 6. Automações e jobs

- **00010:** `handle_transaction_timeout()` e `expire_old_listings()`.
- **00012:** `expire_counter_offers()`.
- Execução: via cron do Supabase (SQL) ou Edge Function `cron-jobs` (documentado em AUTOMATION_SETUP.md).
- Edge Function usa POST com body `{ "job": "transaction-timeout" }` e Service Role para chamar RPC. Garantir que a rota da Edge Function não seja chamável publicamente sem segredo (ex.: verificar header ou secret).

---

## 7. O que pode piorar se não for tratado

1. **Lista de itens grande na criação de oferta:** Tudo carregado no servidor e filtrado no client. Com centenas de itens, considerar paginação ou busca no servidor (ilike / FTS).
2. **find_matches sem filtro:** Retornar todos os matches pode ficar pesado; filtrar por usuário ou por listing no banco.
3. **Sem rate limit na API:** Supabase não aplica rate limit por padrão; abusos podem vir de INSERT em listings ou em mensagens. Avaliar rate limit no Edge ou em outro ponto.
4. **Strikes:** Implementado: com 3 ou mais strikes o usuário não pode criar ofertas (trigger `validate_listing_creation` + constante `MAX_STRIKES_BEFORE_BLOCK` em types).
5. **Estado DISPUTED sem fluxo:** Não há tela de disputa nem papel de admin para resolver. Importante para confiança do mercado.

---

## 8. Resumo de recomendações prioritárias (status pós-implementação)

| Prioridade | Ação | Status |
|------------|------|--------|
| Alta | Middleware para rotas protegidas (/dashboard, /market/create, /admin, /trades). | Feito: `middleware.ts` |
| Alta | Admin: checar is_admin no servidor e 403/redirect. | Feito: redirect para `/forbidden` |
| Média | Matchmaking: RPC por user_id. | Feito: `find_matches_for_user` + doc |
| Média | Política de strikes (bloqueio após N strikes). | Feito: 3 strikes em trigger + UI |
| Baixa | Transação atômica aceitar oferta. | Feito: `accept_listing_offer` RPC |
| Baixa | listing_items (00009) e tipos Supabase. | Doc: `docs/TYPES_AND_SCHEMA.md` + script `gen:types` |

---

## 9. Conclusão

O projeto está bem estruturado para um marketplace de trocas com reputação: regras críticas no banco, RLS consistente, separação Server/Client clara e evolução controlada por migrações. Os principais riscos são operacionais (timeout/expiry precisam rodar via cron), UX/performance (matchmaking e listas grandes) e completar fluxos (disputas, consequência de strikes). Com as recomendações acima, a base fica mais robusta e preparada para crescimento.
