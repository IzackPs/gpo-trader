"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { useLocale } from "@/contexts/LocaleContext";
import { t } from "@/lib/i18n";

const MOCK = {
  totalTrades: 1247,
  volume: "42.5k",
  activeUsers: 389,
};

export function LiveStats() {
  const { locale } = useLocale();
  const [stats, setStats] = useState(MOCK);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    Promise.all([
      supabase
        .from("transactions")
        .select("id", { count: "exact", head: true })
        .eq("status", "CONFIRMED"),
      supabase
        .from("transactions")
        .select("implied_value")
        .eq("status", "CONFIRMED"),
      supabase.from("profiles").select("id", { count: "exact", head: true }),
    ])
      .then(([tradesRes, volumeRes, usersRes]) => {
        const totalTrades = tradesRes.count ?? 0;
        const profilesCount = usersRes.count ?? 0;
        const volumeSum = (volumeRes.data ?? []).reduce(
          (acc, r) => acc + (Number(r.implied_value) || 0),
          0
        );
        const volumeStr =
          volumeSum >= 1000
            ? `${(volumeSum / 1000).toFixed(1)}k`
            : String(Math.round(volumeSum));
        setStats({
          totalTrades,
          volume: volumeStr,
          activeUsers: profilesCount,
        });
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  const formatTrades = (n: number) =>
    n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);

  return (
    <section
      className="border-y border-white/10 bg-slate-950/60 py-6"
      aria-label={locale === "en" ? "Live stats" : "Estatísticas ao vivo"}
    >
      <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-center gap-x-12 gap-y-4 px-4 sm:px-6">
        <div className="flex items-baseline gap-2">
          <span className="text-slate-500">{t(locale, "home.statsTrades")}:</span>
          <span
            className="text-2xl font-bold tabular-nums text-cyan-400"
            aria-live="polite"
          >
            {loaded ? formatTrades(stats.totalTrades) : "—"}
          </span>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-slate-500">{t(locale, "home.statsVolume")}:</span>
          <span
            className="text-2xl font-bold tabular-nums text-cyan-400"
            aria-live="polite"
          >
            {loaded ? stats.volume : "—"}
          </span>
          <span className="text-sm text-slate-500">leg chests</span>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-slate-500">{t(locale, "home.statsUsers")}:</span>
          <span
            className="text-2xl font-bold tabular-nums text-cyan-400"
            aria-live="polite"
          >
            {loaded ? formatTrades(stats.activeUsers) : "—"}
          </span>
        </div>
      </div>
    </section>
  );
}
