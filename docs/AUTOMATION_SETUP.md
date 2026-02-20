# Configuração de Automações e Funcionalidades

Este documento explica como configurar e usar as funcionalidades automáticas implementadas.

## 📋 Funcionalidades Implementadas

### ✅ 1. Timeout de Transações (Double Handshake)
**Problema resolvido:** Transações pendentes indefinidamente quando um usuário não confirma.

**Solução:** Auto-cancelamento após 24 horas + atribuição de strikes.

**Como funciona:**
- Transações em `PENDING_VERIFICATION` há mais de 24h são automaticamente canceladas
- Usuário que não confirmou recebe +1 strike
- Oferta associada é desbloqueada (volta para `OPEN`)

**Configuração:**
```sql
-- Executar manualmente (ou agendar via cron):
SELECT public.handle_transaction_timeout();
```

**Agendamento (Supabase Dashboard):**
1. Vá em Database → Cron Jobs
2. Crie um novo job:
   - **Schedule:** `0 * * * *` (a cada hora)
   - **Command:** `SELECT public.handle_transaction_timeout();`

---

### ✅ 2. Expiração Automática de Ofertas (Ghosting)
**Problema resolvido:** Ofertas antigas acumulando no mercado.

**Solução:** Ofertas abertas há mais de 5 dias são automaticamente canceladas.

**Como funciona:**
- Ofertas com `status = 'OPEN'` e `created_at < NOW() - 5 days` viram `CANCELLED`
- Mantém o mercado limpo e atualizado

**Configuração:**
```sql
-- Executar manualmente:
SELECT public.expire_old_listings();
```

**Agendamento:**
- **Schedule:** `0 2 * * *` (todo dia às 2h da manhã)
- **Command:** `SELECT public.expire_old_listings();`

---

### ✅ 3. Matchmaking Automático
**Funcionalidade:** Cruza ofertas HAVE com WANT automaticamente.

**Como funciona:**
- Função `find_matches()` encontra ofertas compatíveis
- Retorna score de compatibilidade (0-1) e itens que bateram
- Componente `MatchNotifications` exibe notificações no frontend

**Uso:**
```sql
-- Buscar matches para uma oferta específica:
SELECT * FROM public.find_matches('uuid-da-oferta');

-- Buscar todos os matches:
SELECT * FROM public.find_matches();
```

**Frontend:**
- Componente `<MatchNotifications />` já está integrado na página do mercado
- Notificações aparecem no canto inferior direito quando há matches

**Melhorias futuras:**
- Criar trigger que popula a tabela `matches` automaticamente quando uma nova oferta é criada
- Adicionar notificações push/email quando há match perfeito

---

### ✅ 4. Indicadores de Presença (Online/Offline)
**Funcionalidade:** Mostra se usuários estão online (ativo nos últimos 5 minutos).

**Como funciona:**
- Coluna `last_seen_at` na tabela `profiles`
- Atualizada automaticamente quando usuário navega no site
- Componente `MarketClient` atualiza presença a cada 2 minutos

**Visual:**
- Badge verde no avatar quando online
- Texto "Online" ao lado do username
- Indicador visual nos cards de ofertas

**Função helper:**
```sql
-- Verificar se usuário está online:
SELECT public.is_user_online('uuid-do-usuario');
```

---

### ✅ 5. Sistema de Contrapropostas
**Funcionalidade:** Permite enviar contrapropostas para ofertas existentes.

**Estrutura:**
- Tabela `counter_offers` armazena propostas
- Status: PENDING, ACCEPTED, REJECTED, EXPIRED
- Expiração automática após 7 dias

**Uso futuro:**
```sql
-- Criar contraproposta:
INSERT INTO counter_offers (original_listing_id, proposer_id, proposed_items, message)
VALUES (
  'uuid-da-oferta-original',
  'uuid-do-proponente',
  '[{"item_id": 1, "qty": 2}]'::jsonb,
  'Posso adicionar mais 2 itens para fechar o negócio?'
);
```

**Expiração automática:**
```sql
SELECT public.expire_counter_offers();
```

---

## 🔧 Configuração de Cron Jobs

### Opção 1: Supabase Dashboard (Recomendado)
1. Acesse **Database → Cron Jobs**
2. Clique em **New Cron Job**
3. Configure:
   - **Name:** `transaction-timeout`
   - **Schedule:** `0 * * * *` (a cada hora)
   - **Command:** `SELECT public.handle_transaction_timeout();`
4. Repita para `expire-listings` e `expire-counter-offers`

### Opção 2: Edge Function (Alternativa)
Use a Edge Function em `supabase/functions/cron-jobs/`:

**Segurança:** A função exige o header `Authorization: Bearer <CRON_SECRET>`. Defina o secret nas variáveis de ambiente da função (Supabase Dashboard → Edge Functions → cron-jobs → Settings → Secrets). Um token aleatório (ex.: `openssl rand -hex 32`) evita que terceiros executem os jobs (DDoS, consumo de quota).

```bash
# Deploy da função
supabase functions deploy cron-jobs

# Definir secret (Dashboard ou CLI)
# CRON_SECRET=seu_token_longo_aleatorio

# Chamar via HTTP
curl -X POST https://your-project.supabase.co/functions/v1/cron-jobs \
  -H "Authorization: Bearer SEU_CRON_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"job": "transaction-timeout"}'
```

**Jobs disponíveis:** `transaction-timeout`, `expire-listings`, `expire-pending-2h` (GC em 2h).

### Opção 3: pg_cron (Se disponível)
```sql
-- Instalar extensão (se disponível)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Agendar jobs
SELECT cron.schedule(
  'transaction-timeout',
  '0 * * * *',
  'SELECT public.handle_transaction_timeout()'
);

SELECT cron.schedule(
  'expire-listings',
  '0 2 * * *',
  'SELECT public.expire_old_listings()'
);
```

---

## 📊 Monitoramento

### Verificar transações pendentes há muito tempo:
```sql
SELECT id, buyer_id, seller_id, created_at,
       NOW() - created_at AS age
FROM transactions
WHERE status = 'PENDING_VERIFICATION'
  AND created_at < NOW() - INTERVAL '20 hours'
ORDER BY created_at ASC;
```

### Verificar ofertas antigas:
```sql
SELECT id, user_id, status, created_at,
       NOW() - created_at AS age
FROM listings
WHERE status = 'OPEN'
  AND created_at < NOW() - INTERVAL '4 days'
ORDER BY created_at ASC;
```

### Verificar usuários online:
```sql
SELECT id, username, last_seen_at,
       public.is_user_online(id) AS is_online
FROM profiles
ORDER BY last_seen_at DESC NULLS LAST
LIMIT 20;
```

---

## 🚀 Próximos Passos

1. **Implementar interface de contrapropostas** no frontend
2. **Criar trigger** para popular `matches` automaticamente
3. **Adicionar notificações push** para matches perfeitos
4. **Dashboard de estatísticas** com histórico de preços
5. **Sistema de disputas** com upload de screenshots

---

## ⚠️ Notas Importantes

- **Timeouts:** Ajuste o intervalo de 24h conforme necessário (variável `v_timeout_hours`)
- **Expiração de ofertas:** Ajuste o intervalo de 5 dias conforme necessário (variável `v_expiry_days`)
- **Presença online:** Threshold de 5 minutos pode ser ajustado na função `is_user_online()`
- **Strikes:** Usuários com muitos strikes podem ser bloqueados automaticamente (implementar no futuro)
