-- Habilitar Supabase Realtime para trade_messages (chat da sala de troca)
ALTER PUBLICATION supabase_realtime ADD TABLE public.trade_messages;
