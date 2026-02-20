"use client";

import { useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import { MatchNotifications } from "@/components/market/match-notifications";

export function MarketClient() {
  const supabase = createClient();

  useEffect(() => {
    // Atualizar presença do usuário quando a página carrega
    async function updatePresence() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      // Chamar função RPC para atualizar last_seen_at
      // Alternativamente, podemos fazer um UPDATE direto se RLS permitir
      await supabase
        .from("profiles")
        .update({ last_seen_at: new Date().toISOString() })
        .eq("id", user.id);
    }

    updatePresence();

    // Atualizar presença a cada 2 minutos enquanto a página está aberta
    const interval = setInterval(updatePresence, 2 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  return <MatchNotifications />;
}
