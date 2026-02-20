"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { Bell, X, ArrowRightLeft } from "lucide-react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";

interface Match {
  match_id: string;
  listing_have_id: string;
  listing_want_id: string;
  have_user_id: string;
  want_user_id: string;
  match_score: number;
  matched_items: Array<{
    item_id: number;
    have_qty: number;
    want_qty: number;
  }>;
}

export function MatchNotifications() {
  const supabase = createClient();
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  useEffect(() => {
    async function fetchMatches() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      // RPC otimizada: retorna apenas matches deste usuário
      const { data, error } = await supabase.rpc("find_matches_for_user", {
        p_user_id: user.id,
      });

      if (error) {
        console.error("Erro ao buscar matches:", error);
        setLoading(false);
        return;
      }

      setMatches((data as Match[]) || []);
      setLoading(false);
    }

    fetchMatches();
  }, [supabase]);

  if (loading || matches.length === 0) {
    return null;
  }

  const visibleMatches = matches.filter((m) => !dismissed.has(m.match_id));

  if (visibleMatches.length === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
      {visibleMatches.map((match) => (
        <Card
          key={match.match_id}
          className="glass border-cyan-500/30 shadow-lg shadow-cyan-500/10"
        >
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-cyan-500/20 text-cyan-400">
                <Bell size={20} aria-hidden />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-slate-50">
                      Match encontrado!
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      {match.match_score >= 0.8
                        ? "Match perfeito"
                        : match.match_score >= 0.5
                          ? "Match parcial"
                          : "Possível match"}
                      {" "}
                      ({Math.round(match.match_score * 100)}%)
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {match.matched_items.length} item(s) compatível(is)
                    </p>
                  </div>
                  <button
                    onClick={() =>
                      setDismissed((prev) => new Set([...prev, match.match_id]))
                    }
                    className="shrink-0 rounded p-1 text-slate-500 transition-colors hover:bg-slate-800 hover:text-slate-300"
                    aria-label="Fechar notificação"
                  >
                    <X size={16} aria-hidden />
                  </button>
                </div>
                <Link
                  href={`/market/${match.listing_have_id}`}
                  className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-cyan-500/20 px-3 py-2 text-xs font-medium text-cyan-300 transition-colors hover:bg-cyan-500/30"
                >
                  Ver oferta
                  <ArrowRightLeft size={14} aria-hidden />
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
