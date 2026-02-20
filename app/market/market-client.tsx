"use client";

import { MatchNotifications } from "@/components/market/match-notifications";

/** Presença é feita via Realtime Presence (PresenceProvider); sem writes na BD. */
export function MarketClient() {
  return <MatchNotifications />;
}
