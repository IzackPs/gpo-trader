# Dívida técnica — Itens para evolução futura

Documento que regista os pontos levantados pela auditoria pós-validação. Itens **resolvidos** estão assinalados abaixo.

---

## Escalabilidade e performance (resolvidos)

- **Rate limit:** Aplicação passa a aplicar limite por utilizador: criação de ofertas (máx. 3 em 5 minutos) e mensagens no chat (máx. 15 em 1 minuto). Server actions `createListing` e `sendTradeMessage` fazem a verificação antes de inserir. Rate limit à escala do Supabase (Edge/externo) continua a ser recomendado no futuro.
- **Paginação real no mercado:** Página `/market` usa listagem paginada (24 ofertas por página) e botão **"Carregar mais ofertas"** que chama `getMarketListings(offset)` (server action em `app/market/actions.ts`).
- **Carga de itens na criação:** A lista de itens já era paginada no servidor com `getFilteredItems(search, category, offset)` e "Carregar mais". Foi adicionado **Full Text Search (FTS)** na coluna `name` da tabela `items` (migração 00021: `name_tsv` tsvector + GIN index); a busca usa `.textSearch('name_tsv', ...)` para melhor performance com centenas de itens.
- **Performance do matchmaking:** As funções `find_matches` e `find_matches_for_user` foram refatoradas para usar a tabela **`listing_items`** em vez de `jsonb_array_elements(listings.items)` (migração 00020).

---

## Avisos no console (conhecidos, não bloqueiam)

- **Middleware (Next.js 16):** O framework pode exibir aviso de que "middleware" está a ser descontinuado em favor de "proxy". O middleware atual continua a funcionar; a migração para a nova convenção ficará para uma versão futura do Next.js.
- **Lint:** Avisos inofensivos relacionados a `next/image` (uso de `<img>` em alguns componentes) e dependências de `useEffect` foram aceites como dívida técnica para agilizar a entrega. Podem ser corrigidos em iterações posteriores.

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

---

*Última atualização: escalabilidade (rate limit, paginação mercado, FTS, find_matches) e avisos documentados.*
