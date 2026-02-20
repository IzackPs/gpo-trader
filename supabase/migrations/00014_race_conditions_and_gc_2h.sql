-- ============================================================
-- Blindagem contra race conditions (SELECT FOR UPDATE)
-- + Garbage collection em 2h (transações órfãs)
-- ============================================================

-- 1. ACEITAR OFERTA COM LOCK EXPLÍCITO (evita duas transactions para a mesma listing)
CREATE OR REPLACE FUNCTION public.accept_listing_offer(p_listing_id UUID, p_buyer_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_seller_id UUID;
  v_transaction_id UUID;
BEGIN
  -- Lock explícito na linha da oferta: primeira requisição que chegar segura o lock
  SELECT user_id INTO v_seller_id
  FROM public.listings
  WHERE id = p_listing_id
    AND status = 'OPEN'
  FOR UPDATE;

  IF v_seller_id IS NULL THEN
    RAISE EXCEPTION 'Oferta não encontrada ou já foi aceita por outro usuário';
  END IF;

  IF v_seller_id = p_buyer_id THEN
    RAISE EXCEPTION 'Você não pode aceitar sua própria oferta';
  END IF;

  -- Atualizar status (já temos o lock)
  UPDATE public.listings
  SET status = 'LOCKED',
      updated_at = NOW()
  WHERE id = p_listing_id;

  -- Criar a transação
  INSERT INTO public.transactions (listing_id, buyer_id, seller_id, status)
  VALUES (p_listing_id, p_buyer_id, v_seller_id, 'PENDING_VERIFICATION')
  RETURNING id INTO v_transaction_id;

  RETURN v_transaction_id;
END;
$$;

COMMENT ON FUNCTION public.accept_listing_offer(UUID, UUID) IS
  'Aceita oferta com SELECT FOR UPDATE: garante atomicidade e evita duas transações para a mesma listing.';


-- 2. GARBAGE COLLECTION EM 2 HORAS (transações órfãs: unlock listing + strikes)
CREATE OR REPLACE FUNCTION public.expire_pending_transactions_2h()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_transaction RECORD;
BEGIN
  FOR v_transaction IN
    SELECT id, buyer_id, seller_id, buyer_confirmed, seller_confirmed, listing_id
    FROM transactions
    WHERE status = 'PENDING_VERIFICATION'
      AND created_at < NOW() - INTERVAL '2 hours'
  LOOP
    IF NOT v_transaction.buyer_confirmed THEN
      UPDATE profiles SET strikes = strikes + 1 WHERE id = v_transaction.buyer_id;
      INSERT INTO reputation_events (user_id, change_amount, reason, source_transaction_id)
      VALUES (
        v_transaction.buyer_id,
        0,
        'Strike: Timeout na confirmação (comprador não confirmou em 2h)',
        v_transaction.id
      );
    END IF;
    IF NOT v_transaction.seller_confirmed THEN
      UPDATE profiles SET strikes = strikes + 1 WHERE id = v_transaction.seller_id;
      INSERT INTO reputation_events (user_id, change_amount, reason, source_transaction_id)
      VALUES (
        v_transaction.seller_id,
        0,
        'Strike: Timeout na confirmação (vendedor não confirmou em 2h)',
        v_transaction.id
      );
    END IF;

    UPDATE transactions SET status = 'DISPUTED', updated_at = NOW() WHERE id = v_transaction.id;

    IF v_transaction.listing_id IS NOT NULL THEN
      UPDATE listings SET status = 'OPEN', updated_at = NOW()
      WHERE id = v_transaction.listing_id AND status = 'LOCKED';
    END IF;
  END LOOP;
END;
$$;

COMMENT ON FUNCTION public.expire_pending_transactions_2h() IS
  'Cancela transações pendentes há mais de 2h: unlock da oferta, strikes e status DISPUTED. Rodar via cron a cada 15–30 min.';
