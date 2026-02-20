-- ============================================================
-- Sistema de Timeout e Expiração Automática
-- Resolve: Double Handshake Paradox + Ofertas Fantasma
-- ============================================================

-- 1. TIMEOUT DE TRANSAÇÕES (Double Handshake)
-- Auto-cancelamento de transações pendentes após 24 horas
-- e atribuição de strikes ao usuário que não confirmou

CREATE OR REPLACE FUNCTION public.handle_transaction_timeout()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_timeout_hours INTEGER := 24;
  v_transaction RECORD;
BEGIN
  -- Buscar transações pendentes há mais de 24 horas
  FOR v_transaction IN
    SELECT id, buyer_id, seller_id, buyer_confirmed, seller_confirmed, created_at
    FROM transactions
    WHERE status = 'PENDING_VERIFICATION'
      AND created_at < NOW() - (v_timeout_hours || ' hours')::INTERVAL
  LOOP
    -- Determinar quem não confirmou (e atribuir strike)
    IF NOT v_transaction.buyer_confirmed THEN
      -- Adicionar strike ao comprador
      UPDATE profiles
      SET strikes = strikes + 1
      WHERE id = v_transaction.buyer_id;
      
      -- Log do evento
      INSERT INTO reputation_events (user_id, change_amount, reason, source_transaction_id)
      VALUES (
        v_transaction.buyer_id,
        0,
        'Strike: Timeout na confirmação de transação (comprador não confirmou em 24h)',
        v_transaction.id
      );
    END IF;

    IF NOT v_transaction.seller_confirmed THEN
      -- Adicionar strike ao vendedor
      UPDATE profiles
      SET strikes = strikes + 1
      WHERE id = v_transaction.seller_id;
      
      -- Log do evento
      INSERT INTO reputation_events (user_id, change_amount, reason, source_transaction_id)
      VALUES (
        v_transaction.seller_id,
        0,
        'Strike: Timeout na confirmação de transação (vendedor não confirmou em 24h)',
        v_transaction.id
      );
    END IF;

    -- Cancelar a transação
    UPDATE transactions
    SET status = 'DISPUTED',
        updated_at = NOW()
    WHERE id = v_transaction.id;

    -- Desbloquear a oferta associada (se existir)
    UPDATE listings
    SET status = 'OPEN'
    WHERE id = (
      SELECT listing_id FROM transactions WHERE id = v_transaction.id
    )
    AND status = 'LOCKED';
  END LOOP;
END;
$$;

COMMENT ON FUNCTION public.handle_transaction_timeout() IS
  'Cancela transações pendentes há mais de 24h e atribui strikes aos usuários que não confirmaram. Resolve o problema do Double Handshake Paradox.';

-- 2. EXPIRAÇÃO AUTOMÁTICA DE OFERTAS (Ghosting)
-- Ofertas abertas há mais de 5 dias são automaticamente canceladas

CREATE OR REPLACE FUNCTION public.expire_old_listings()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_expiry_days INTEGER := 5;
BEGIN
  UPDATE listings
  SET status = 'CANCELLED',
      updated_at = NOW()
  WHERE status = 'OPEN'
    AND created_at < NOW() - (v_expiry_days || ' days')::INTERVAL;
END;
$$;

COMMENT ON FUNCTION public.expire_old_listings() IS
  'Cancela automaticamente ofertas abertas há mais de 5 dias. Previne acúmulo de ofertas fantasma no mercado.';

-- 3. CRON JOB (via pg_cron ou Supabase Edge Functions)
-- Nota: No Supabase, você pode criar uma Edge Function que chama essas funções
-- ou usar pg_cron se disponível. Por enquanto, documentamos como executar manualmente.

-- Para executar manualmente (ou via cron job):
-- SELECT public.handle_transaction_timeout();
-- SELECT public.expire_old_listings();

-- Exemplo de agendamento (se pg_cron estiver disponível):
-- SELECT cron.schedule('transaction-timeout', '0 * * * *', 'SELECT public.handle_transaction_timeout()');
-- SELECT cron.schedule('expire-listings', '0 2 * * *', 'SELECT public.expire_old_listings()');

-- 4. ÍNDICES para performance das queries de timeout
CREATE INDEX IF NOT EXISTS idx_transactions_timeout_check
  ON transactions(status, created_at)
  WHERE status = 'PENDING_VERIFICATION';

CREATE INDEX IF NOT EXISTS idx_listings_expiry_check
  ON listings(status, created_at)
  WHERE status = 'OPEN';
