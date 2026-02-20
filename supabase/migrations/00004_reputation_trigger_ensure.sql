-- Garantir que o sistema de reputação está ativo (TDD 1.0 - Coração do Trust)
-- Execute esta migration se as trocas confirmadas não estiverem dando XP.

CREATE OR REPLACE FUNCTION public.give_reputation_on_confirm()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  base_xp REAL := 10;
BEGIN
  -- Só executa quando status muda PARA CONFIRMED (não se já era CONFIRMED)
  IF NEW.status <> 'CONFIRMED' OR OLD.status = 'CONFIRMED' THEN
    RETURN NEW;
  END IF;

  -- Registra o evento de XP (auditoria)
  INSERT INTO public.reputation_events (user_id, change_amount, reason, source_transaction_id)
  VALUES
    (NEW.buyer_id, base_xp, 'Troca #' || LEFT(NEW.id::text, 8), NEW.id),
    (NEW.seller_id, base_xp, 'Troca #' || LEFT(NEW.id::text, 8), NEW.id);

  -- Soma XP no perfil de ambos (o trigger recompute_rank_tier atualiza o tier)
  UPDATE public.profiles SET reputation_score = reputation_score + base_xp WHERE id = NEW.buyer_id;
  UPDATE public.profiles SET reputation_score = reputation_score + base_xp WHERE id = NEW.seller_id;

  RETURN NEW;
END;
$$;

-- Recria o trigger (idempotente)
DROP TRIGGER IF EXISTS on_transaction_confirmed ON public.transactions;
CREATE TRIGGER on_transaction_confirmed
  AFTER UPDATE ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.give_reputation_on_confirm();

COMMENT ON FUNCTION public.give_reputation_on_confirm() IS 'TDD 1.0: Ao marcar transação como CONFIRMED, +10 XP para comprador e vendedor.';
