# Edge Function: Consenso de Preço (Cron)

## Objetivo (TDD §3.1)

Atualizar `market_value_leg_chests` e `volatility` dos itens a cada **1 hora**, usando transações confirmadas das últimas 24h e **média ponderada por tier** do usuário.

## Lógica

1. **Buscar transações** das últimas 24h com `status = 'CONFIRMED'`.
2. **Filtrar** transações onde ambos (comprador e vendedor) têm `rank_tier` pelo menos `'MERCHANT'` (opcional: TDD diz "Tier < MERCHANT" para remover ruído — interpretação: excluir contas muito novas ou usar peso 0.1 para DRIFTER).
3. **Filtro de Hampel (MAD)** para remover outliers e possível manipulação.
4. **Média ponderada** por peso do tier:
   - DRIFTER: 0.1  
   - CIVILIAN: 0.5  
   - MERCHANT: 1.0  
   - BROKER: 2.5  
   - YONKO: 10.0  

5. **Atualizar** `items.market_value_leg_chests` e `items.volatility` (desvio padrão das últimas 24h).

## Implementação sugerida (Supabase Edge Function + Cron)

- **Runtime:** Deno (Supabase Edge Functions).
- **Trigger:** Cron (ex.: `0 * * * *` = a cada hora) chamando a função via `pg_cron` ou serviço externo (Vercel Cron, etc.) que invoca a URL da Edge Function com um secret.
- **Segurança:** Usar `service_role` ou um secret no header para a chamada do cron; não expor a função publicamente.

## Exemplo de chamada (pseudo-SQL no Edge ou em uma função PL/pgSQL)

```sql
-- Peso por tier (pode vir de uma tabela config)
-- Para cada item_id presente em final_items_exchanged (ou listing.items):
-- 1. Extrair implied_value por transação
-- 2. Aplicar Hampel (mediana, MAD, descartar |x - med| > k*MAD)
-- 3. Calcular média ponderada pelos pesos dos usuários
-- 4. UPDATE items SET market_value_leg_chests = ..., volatility = stddev
```

A implementação completa pode ser em **PL/pgSQL** (Database Function chamada pelo cron do Supabase) ou em **TypeScript** na Edge Function que usa o client Supabase com `service_role` para fazer os SELECTs e UPDATEs.

## Referência TDD

- §3.1 O Algoritmo de Consenso de Preço (Cron Job)
- Frequência: 1h | Moeda: Legendary Chests | Filtro: Hampel + peso por tier
