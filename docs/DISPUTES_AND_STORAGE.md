# Disputas e Storage (evidências)

## Esteira de disputas

1. **Abrir disputa:** O usuário clica em "Não realizou / Golpe" na sala de troca. A aplicação chama a RPC `open_dispute(transaction_id, reason)`, que:
   - Cria um registro em `dispute_cases` com `reported_by = auth.uid()`
   - Atualiza a transação para `status = 'DISPUTED'`
2. **Chat bloqueado:** O trigger `check_trade_message_allowed` impede novas mensagens quando a transação está DISPUTED.
3. **Página de disputa:** `/trades/[id]/dispute` permite ao participante enviar evidências (upload).

## Bucket Supabase para evidências

Para o upload de prints/PDFs funcionar, crie o bucket no Supabase:

1. **Dashboard** → **Storage** → **New bucket**
2. Nome: **`dispute-evidence`**
3. **Public:** desmarcado (acesso via URL pública apenas aos arquivos que você permitir, se usar `getPublicUrl` com política restrita)
4. **Políticas (RLS):**
   - **INSERT:** usuário autenticado pode fazer upload se for comprador ou vendedor da transação ligada ao dispute. Como o path inclui `dispute_id`, você pode criar uma policy que verifica se o usuário é participante do dispute (via `dispute_cases` + `transactions`).
   - **SELECT:** participantes do dispute (e admins) podem listar/ler.

Exemplo de policy (ajuste no Dashboard ou via SQL):

```sql
-- Permitir upload para participantes da disputa
CREATE POLICY "dispute_evidence_upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'dispute-evidence'
  AND (storage.foldername(name))[1] IN (
    SELECT dc.id::text FROM dispute_cases dc
    JOIN transactions t ON t.id = dc.transaction_id
    WHERE t.buyer_id = auth.uid() OR t.seller_id = auth.uid()
  )
);

-- Permitir leitura para participantes
CREATE POLICY "dispute_evidence_read"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'dispute-evidence'
  AND (storage.foldername(name))[1] IN (
    SELECT dc.id::text FROM dispute_cases dc
    JOIN transactions t ON t.id = dc.transaction_id
    WHERE t.buyer_id = auth.uid() OR t.seller_id = auth.uid()
  )
);
```

O path usado no upload é `{disputeId}/{uuid}.{ext}`, então a primeira pasta do path é o `dispute_id`.

## Cron: garbage collection em 2h

Transações pendentes há mais de **2 horas** devem ser canceladas e a oferta desbloqueada (e strikes aplicados). Use a função:

```sql
SELECT public.expire_pending_transactions_2h();
```

**Recomendação:** agendar a cada **15–30 minutos** (ex.: no Cron do Supabase ou Edge Function), para que nenhuma transação fique órfã por mais de ~2h.

Em **Dashboard** → **Database** → **Cron Jobs** (se disponível):

- **Schedule:** `*/15 * * * *` (a cada 15 min)
- **Command:** `SELECT public.expire_pending_transactions_2h();`
