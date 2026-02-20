# Tipos TypeScript e Schema do Banco

## Gerar tipos a partir do Supabase

Para manter os tipos do frontend alinhados ao schema do PostgreSQL, use a CLI do Supabase:

```bash
# Script no package.json (usa Supabase local)
npm run gen:types
```

Ou manualmente:

```bash
# Com projeto linkado (supabase link)
npx supabase gen types typescript --project-id SEU_PROJECT_ID > types/database.gen.ts
# Ou com Supabase local
npx supabase gen types typescript --local > types/database.gen.ts
```

Depois, você pode re-exportar ou estender em `types/index.ts`:

```ts
// types/index.ts
// import type { Database } from './database.gen';
// export type Profile = Database['public']['Tables']['profiles']['Row'];
```

Os tipos manuais em `types/index.ts` (Profile, Listing, etc.) foram definidos para o domínio da aplicação; ao introduzir `database.gen.ts`, prefira gradualmente substituir por tipos derivados do `Database` ou manter os atuais e usar os gerados apenas para validação/consistência.

## Tabela `listing_items` (migração 00009)

A migração **00009_listing_items_normalized.sql** cria a tabela `listing_items` (listing_id, item_id, qty) para normalizar os itens das ofertas.

- **Estado atual:** A tabela existe no banco, mas **não é usada** pela aplicação. As ofertas continuam usando a coluna `listings.items` (JSONB).
- **Uso:** Quando houver migração completa (cópia dos dados do JSONB para `listing_items` e alteração do código para ler/escrever apenas em `listing_items`), a coluna `listings.items` poderá ser descontinuada ou mantida como legado.
- **Até lá:** Não misturar os dois modelos (evitar uma parte do código usar JSONB e outra usar `listing_items`) para não gerar inconsistência.
