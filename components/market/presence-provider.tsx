"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { createClient } from "@/utils/supabase/client";

const CHANNEL_NAME = "market-presence";

type PresenceContextValue = {
  onlineUserIds: Set<string>;
};

const PresenceContext = createContext<PresenceContextValue | null>(null);

export function usePresence(): PresenceContextValue {
  const ctx = useContext(PresenceContext);
  return ctx ?? { onlineUserIds: new Set() };
}

export function PresenceProvider({ children }: { children: React.ReactNode }) {
  const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(new Set());
  const supabase = createClient();

  const updatePresenceState = useCallback((state: Record<string, unknown>) => {
    const ids = new Set<string>();
    for (const key of Object.keys(state)) {
      const val = state[key];
      const list = Array.isArray(val) ? val : val && typeof val === "object" ? Object.values(val) : [];
      for (const p of list) {
        const payload = p as { user_id?: string };
        if (payload?.user_id) ids.add(payload.user_id);
      }
    }
    setOnlineUserIds(ids);
  }, []);

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;

    async function setup() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      channel = supabase.channel(CHANNEL_NAME, {
        config: { presence: { key: user.id } },
      });

      channel
        .on("presence", { event: "sync" }, () => {
          if (channel) updatePresenceState(channel.presenceState() as Record<string, unknown>);
        })
        .on("presence", { event: "join" }, () => {
          if (channel) updatePresenceState(channel.presenceState() as Record<string, unknown>);
        })
        .on("presence", { event: "leave" }, () => {
          if (channel) updatePresenceState(channel.presenceState() as Record<string, unknown>);
        })
        .subscribe(async (status) => {
          if (status !== "SUBSCRIBED" || !channel) return;
          await channel.track({ user_id: user.id, online_at: new Date().toISOString() });
        });
    }

    setup();
    return () => {
      if (channel) {
        channel.untrack().then(() => supabase.removeChannel(channel!));
      }
    };
  }, [updatePresenceState]);

  const value = useMemo(
    () => ({ onlineUserIds }),
    [onlineUserIds]
  );

  return (
    <PresenceContext.Provider value={value}>
      {children}
    </PresenceContext.Provider>
  );
}
