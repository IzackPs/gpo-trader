# Validação do Projeto — Arquitetura, Segurança e Escalabilidade

Documento de auditoria e melhorias aplicadas (validação sénior).

---

## 1. Arquitetura

### 1.1 Estrutura

- **App Router** com separação clara: páginas públicas (`/`, `/market`, `/market/analytics`) usam `createClientPublic()` e ISR; páginas autenticadas usam `createClient()` (cookies).
- **Middleware** protege `/dashboard`, `/market/create`, `/admin`, `/trades`; redireciona não autenticados para `/auth?redirect=...`.
- **Admin:** layout partilhado com navegação; verificação `is_admin` em layout e em cada página; RLS no Supabase restringe SELECT/UPDATE de disputas e itens.

### 1.2 Decisões

- **listing_items vs JSONB:** Mantida tabela normalizada; WAP usa `listing_items` (mig 00018); app continua a ler/escrever JSONB com sync por trigger. Ver `docs/DECISAO_LISTING_ITEMS.md`.
- **ISR:** Páginas de leitura pública não usam cookies para fetch, permitindo cache e `revalidate`.

---

## 2. Segurança

### 2.1 Correções aplicadas

| Área | Problema | Solução |
|------|----------|---------|
| **Auth callback** | Parâmetro `next` permitia open redirect (ex.: `?next=https://evil.com`). | Validação `safeRedirectPath()`: apenas paths relativos (começam com `/` e não contêm `//`). |
| **Variáveis de ambiente** | Uso de `!` podia gerar erros pouco claros em runtime. | Função `getSupabaseEnv()` que lança erro explícito se URL ou ANON_KEY faltarem. |
| **Listagem de ofertas** | Sem limite; em escala podia devolver milhares de linhas. | Limite de **60** ofertas na página do mercado. |
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

- **Mercado:** limite de 60 ofertas por página (evita respostas enormes e tempo de resposta alto).
- **Itens:** limite de 200 itens em `getFilteredItems` e na carga inicial de criar oferta; busca limitada a 150 caracteres.

### 3.2 Recomendações futuras

- **Paginação no mercado:** substituir “últimas 60” por cursor/offset e “Carregar mais” ou página 2.
- **Matchmaking:** refatorar `find_matches` para usar `listing_items`; considerar cache ou tabela materializada quando o volume crescer.
- **Presença:** atualmente via RPC `update_presence_if_stale`; para escala muito maior, considerar Supabase Realtime Presence (menos writes no Postgres).

---

## 4. Qualidade de código e consistência

- **Tipos:** `types/index.ts` alinhado ao schema; evitação de `any` onde foi possível.
- **Erros:** Server Actions e fetches com tratamento de erro (log ou mensagem ao utilizador); `getFilteredItems` devolve array vazio em caso de erro.
- **Lint:** projeto com 0 erros de ESLint; avisos restantes (ex.: `next/image`, dependências de `useEffect`) documentados ou aceites como dívida técnica.

---

## 5. Checklist de validação

| Item | Estado |
|------|--------|
| Open redirect no auth callback | ✅ Corrigido |
| Limite de listagens no mercado | ✅ 60 |
| Limite e sanitização na busca de itens | ✅ 150 chars, limit 200 |
| Upload de evidências: extensão e nome seguros | ✅ MIME → ext, nome sanitizado |
| Env vars com mensagem clara em falta | ✅ getSupabaseEnv() |
| Minimização de dados no detalhe da oferta | ✅ Select explícito em profiles |
| Middleware a proteger rotas sensíveis | ✅ |
| Admin com verificação is_admin + RLS | ✅ |
| ISR em páginas públicas sem cookies | ✅ createClientPublic |

---

*Última validação: aplicadas as melhorias acima e revistos os ficheiros críticos (auth, market, create, dispute, admin, utils/supabase).*
