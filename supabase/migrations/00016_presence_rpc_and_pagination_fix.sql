-- ============================================================
-- Presença: UPDATE só se last_seen_at for antigo (evita WAL/heartbeat em escala)
-- + Documentação para migrar para Realtime Presence no futuro
-- ============================================================

-- RPC leve: só atualiza last_seen_at se for NULL ou mais antigo que p_max_age_minutes.
-- Reduz writes em cenários com muitas abas abertas (ex.: 1000 users = 500 updates/min vira muito menos).
CREATE OR REPLACE FUNCTION public.update_presence_if_stale(
  p_user_id UUID,
  p_max_age_minutes INT DEFAULT 5
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
  SET last_seen_at = NOW(),
      updated_at = NOW()
  WHERE id = p_user_id
    AND (
      last_seen_at IS NULL
      OR last_seen_at < NOW() - (p_max_age_minutes || ' minutes')::INTERVAL
    );
END;
$$;

COMMENT ON FUNCTION public.update_presence_if_stale(UUID, INT) IS
  'Atualiza last_seen_at apenas se estiver NULL ou mais antigo que p_max_age_minutes. Use com Page Visibility (não polling cego) para reduzir writes. Ideal futuro: Supabase Realtime Presence (canal em memória, zero writes no Postgres).';

GRANT EXECUTE ON FUNCTION public.update_presence_if_stale(UUID, INT) TO authenticated;
