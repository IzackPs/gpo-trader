# Decisão de Arquitetura: listing_items vs JSONB

## Decisão definitiva

- **Mantemos a tabela normalizada `listing_items`** (migrações 00009 e 00015) e **adotamo-la como fonte para consultas analíticas e futuras no backend**.
- **A aplicação continua a escrever e a ler a coluna `listings.items` (JSONB)** no fluxo de criação e exibição de ofertas. O trigger `sync_listing_items_from_jsonb` mantém `listing_items` sempre sincronizada com o JSONB.

## Justificação

1. **Integridade e performance em SQL:** Funções como `get_market_prices_last_week()` (a partir da migração 00018) passam a usar `listing_items` em vez de `jsonb_array_elements(listings.items)`, reduzindo custo de CPU e permitindo JOINs e índices normais.
2. **Sem breaking change no frontend:** O cliente continua a enviar e a receber `items` como array JSON na listing; não é necessário alterar formulários nem cards.
3. **Futuro:** Quando se quiser descontinuar o JSONB, basta passar a preencher `listings.items` a partir de `listing_items` (por trigger ou na aplicação) e depois remover a escrita direta ao JSONB. Até lá, o modelo híbrido é suportado.

## O que foi feito

- **Migração 00018:** A função `get_market_prices_last_week()` foi refatorada para usar apenas `listing_items` (JOIN em `tx_weight` + `listing_items`). Transações cujo `listing_id` não tenha linhas em `listing_items` não entram no cômputo (casos antigos ou edge cases).
- **Documentação:** Este ficheiro regista a decisão; `docs/TYPES_AND_SCHEMA.md` e `docs/ARCHITECTURE_AUDIT.md` podem referenciá-lo.

## Matchmaking (find_matches) e escalabilidade

- A função `find_matches` (00011/00013) continua a usar o JSONB `listings.items` por agora e é **calculada a pedido** (não persistida).
- **Riscos de escalabilidade:** Com muitas ofertas, chamar `find_matches` em cada acesso pode ser pesado. Listar todos os itens na criação de oferta também; por isso foi adicionado **limite de 200 itens** em `getFilteredItems` e na carga inicial da página de criar oferta (`app/market/create`).
- **Melhorias futuras:**
  1. Refatorar `find_matches` para usar `listing_items` (JOIN por `item_id`).
  2. Cache ou tabela persistente de matches (ex.: materializar resultados e atualizar por trigger ou job).
  3. Se o catálogo de itens crescer muito, considerar paginação/cursor na listagem de itens (ex.: "carregar mais" ou busca obrigatória).
