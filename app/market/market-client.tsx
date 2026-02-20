"use client";

import { useEffect, useRef } from "react";
import { createClient } from "@/utils/supabase/client";
import { MatchNotifications } from "@/components/market/match-notifications";

const PRESENCE_MIN_INTERVAL_MS = 2 * 60 * 1000; // Só envia heartbeat se passou 2 min desde o último
const RPC_MAX_AGE_MINUTES = 5; // RPC só faz UPDATE se last_seen_at for mais antigo que 5 min

export function MarketClient() {
  const supabase = createClient();
  const lastPresenceAt = useRef<number>(0);

  useEffect(() => {
    async function updatePresenceIfStale() {
      const now = Date.now();
      if (now - lastPresenceAt.current < PRESENCE_MIN_INTERVAL_MS) return;

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      lastPresenceAt.current = now;
      await supabase.rpc("update_presence_if_stale", {
        p_user_id: user.id,
        p_max_age_minutes: RPC_MAX_AGE_MINUTES,
      });
    }

    updatePresenceIfStale();

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        updatePresenceIfStale();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, []);

  return <MatchNotifications />;
}
