# Dívida técnica — Itens para evolução futura

Documento que regista os pontos levantados pela auditoria pós-validação. Itens **resolvidos** estão assinalados abaixo.

---

## Escalabilidade e performance (resolvidos)

- **Rate limit:** Aplicação passa a aplicar limite por utilizador: criação de ofertas (máx. 3 em 5 minutos) e mensagens no chat (máx. 15 em 1 minuto). Server actions `createListing` e `sendTradeMessage` fazem a verificação antes de inserir. Rate limit à escala do Supabase (Edge/externo) continua a ser recomendado no futuro.
- **Paginação real no mercado:** Página `/market` usa listagem paginada (24 ofertas por página) e botão **"Carregar mais ofertas"** que chama `getMarketListings(offset)` (server action em `app/market/actions.ts`).
- **Carga de itens na criação:** A lista de itens já era paginada no servidor com `getFilteredItems(search, category, offset)` e "Carregar mais". Foi adicionado **Full Text Search (FTS)** na coluna `name` da tabela `items` (migração 00021: `name_tsv` tsvector + GIN index); a busca usa `.textSearch('name_tsv', ...)` para melhor performance com centenas de itens.
- **Performance do matchmaking:** As funções `find_matches` e `find_matches_for_user` foram refatoradas para usar a tabela **`listing_items`** em vez de `jsonb_array_elements(listings.items)` (migração 00020).

---

## Avisos no console e lint (resolvidos)

- **next/image:** As tags `<img>` foram substituídas pelo componente otimizado `<Image>` do `next/image`: `components/ui/avatar.tsx` usa `next/image` (com `remotePatterns` para `cdn.discordapp.com` em `next.config.ts`); a página do dashboard usa o componente `Avatar` em vez de `<img>` direto. Build e lint sem avisos de imagem.
- **useEffect:** As dependências residuais foram corrigidas: `supabase` foi adicionado aos arrays de dependências em `components/market/match-notifications.tsx`, `components/market/presence-provider.tsx` e `components/trades/TradeChat.tsx`, eliminando os avisos do `react-hooks/exhaustive-deps`.

## Evoluções futuras (quando o produto escalar)

- **Middleware → proxy (Next.js 16):** Quando o Next.js descontinuar totalmente o conceito de "middleware", a lógica atual em `middleware.ts` (proteção de rotas, refresh de sessão Supabase) terá de ser migrada para a nova arquitetura baseada em **"proxy"**. A documentação e o guia de migração do Next.js devem ser consultados nessa altura; até lá, o middleware atual continua a funcionar (com aviso no build).
- **Rate limit no Edge:** O limite de requisições está hoje na camada da aplicação (Server Actions: `createListing`, `sendTradeMessage`). Em caso de DDoS ou pico anormal, o ideal será colocar rate limit **no Edge** (configuração da Vercel ou via Cloudflare) para bloquear tráfego antes de chegar ao servidor.
- **Cache de matchmaking:** Com muitas ofertas, `find_matches` e `find_matches_for_user` podem pesar no banco. A solução será usar **Views Materializadas** no PostgreSQL (atualizadas por trigger ou job) ou uma camada de **cache** (ex.: Redis) para armazenar resultados de matchmaking e invalidar com TTL ou ao publicar/remover ofertas.

---

## 1. ~~Risco de divergência estrutural: listing_items vs JSONB~~ ✅ Resolvido

### O que foi feito

- **Fonte de verdade:** Passou a ser **`listing_items`**. A aplicação escreve em `listing_items` ao criar ofertas; um trigger **`sync_listings_jsonb_from_listing_items`** (migração 00019) mantém **`listings.items` (JSONB)** derivado para leitura e compatibilidade.
- **App:** Em `app/market/create/create-listing-form.tsx`, o fluxo é: INSERT em `listings` com `items: []`, depois INSERT em `listing_items`; o trigger preenche `listings.items`.
- **RLS:** Políticas em `listing_items` para INSERT/UPDATE/DELETE pelo dono da oferta (migração 00019).
- **Documentação:** Ver `docs/DECISAO_LISTING_ITEMS.md`.

---

## 2. ~~Sistema de presença e escalabilidade~~ ✅ Resolvido

### O que foi feito

- **Supabase Realtime Presence** em vez de writes na BD. Na página do mercado (`/market`), o cliente subscreve o canal **`market-presence`**, faz **track** do `user_id` e expõe o estado de presença via **`PresenceProvider`** e **`usePresence()`**.
- **UI:** O **indicador “Online”** nos cards de oferta usa presença em tempo real (`onlineUserIds`); não é chamada a RPC `update_presence_if_stale` nem há heartbeats em `profiles.last_seen_at` a partir do mercado.
- **Componentes:** `components/market/presence-provider.tsx`, `components/market/market-listing-grid.tsx`; `components/trades/TradeChat.tsx`; `ListingCard` aceita prop opcional `isOnline` (fallback para `last_seen_at` quando usada noutros contextos).
- A coluna `last_seen_at` e a RPC `update_presence_if_stale` permanecem na BD para compatibilidade (ex.: view `matches_with_presence`); podem ser descontinuadas em limpeza futura se não forem usadas noutro fluxo.

---

## Resumo

| Ponto | Estado | Ação |
|-------|--------|------|
| **listing_items vs JSONB** | ✅ Resolvido | Fonte de verdade = `listing_items`; trigger deriva `listings.items` (mig 00019 + app). |
| **Presença (writes na BD)** | ✅ Resolvido | Realtime Presence no canal `market-presence`; sem heartbeat na BD no mercado. |
| **Rate limit** | ✅ Resolvido | Server actions: createListing (3/5 min), sendTradeMessage (15/1 min). |
| **Paginação mercado** | ✅ Resolvido | getMarketListings(offset) + "Carregar mais ofertas". |
| **FTS itens** | ✅ Resolvido | Mig 00021 name_tsv; getFilteredItems usa textSearch. |
| **find_matches listing_items** | ✅ Resolvido | Mig 00020: find_matches e find_matches_for_user usam listing_items. |
| **next/image e useEffect** | ✅ Resolvido | Avatar com next/image; dashboard com Avatar; deps de useEffect corrigidas (supabase). |
| **Middleware → proxy** | 📋 Futuro | Migrar quando Next.js descontinuar middleware. |
| **Rate limit no Edge** | 📋 Futuro | Vercel/Cloudflare para DDoS e picos. |
| **Cache matchmaking** | 📋 Futuro | Views materializadas ou Redis quando o volume crescer. |

---

*Última atualização: next/image e useEffect resolvidos; evoluções futuras (middleware→proxy, rate limit Edge, cache matchmaking) documentadas.*
