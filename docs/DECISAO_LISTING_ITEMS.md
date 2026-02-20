# Decisão de Arquitetura: listing_items vs JSONB

## Decisão definitiva (atual)

- **Fonte de verdade:** A tabela normalizada **`listing_items`** é a fonte de verdade para os itens de cada oferta (migrações 00009, 00015, **00019**).
- **Escrita:** A aplicação **escreve em `listing_items`** ao criar ofertas (server action `createListing`: INSERT em `listings` com `items: []`, depois INSERT em `listing_items`).
- **Leitura:** O trigger **`sync_listings_jsonb_from_listing_items`** (migração 00019) mantém **`listings.items` (JSONB)** derivado a partir de `listing_items`. A leitura nas páginas e em funções que ainda usam o JSONB continua a funcionar sem alteração de contrato.

## Justificação

1. **Integridade e performance:** WAP (`get_market_prices_last_week`, mig 00018), matchmaking (`find_matches`, `find_matches_for_user`, mig 00020) e analytics usam `listing_items` (JOINs, índices). Uma única fonte de escrita evita divergência.
2. **Compatibilidade:** O JSONB `listings.items` continua a ser preenchido por trigger, pelo que o frontend e qualquer código que leia `listing.items` não precisam de mudar.
3. **RLS:** A migração 00019 adiciona políticas em `listing_items` para INSERT/UPDATE/DELETE pelo dono da oferta.

## O que foi feito

- **Migração 00018:** WAP usa apenas `listing_items`.
- **Migração 00019:** Trigger invertido: escrita em `listing_items` → trigger atualiza `listings.items`; RLS em `listing_items`; app passa a usar `createListing` e INSERT em `listing_items`.
- **Migração 00020:** `find_matches` e `find_matches_for_user` refatoradas para usar `listing_items` em vez de `jsonb_array_elements(listings.items)`.
- **Documentação:** `docs/DIVIDA_TECNICA.md` regista o estado (resolvido); `docs/DOCUMENTACAO_TECNICA.md` descreve o fluxo atual.

## Matchmaking e escalabilidade

- **find_matches / find_matches_for_user:** Já usam **`listing_items`** (migração 00020). São calculadas a pedido (não persistidas).
- **Busca de itens:** `getFilteredItems` tem paginação e **Full Text Search** (coluna `items.name_tsv`, migração 00021) para escalar com muitos itens.
- **Futuro:** Se o volume de matches crescer muito, considerar cache ou tabela materializada de matches.
