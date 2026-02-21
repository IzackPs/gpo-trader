import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  ShieldCheck,
  TrendingUp,
  Package,
  ArrowRightLeft,
  Award,
  Clock,
  CheckCircle2,
} from "lucide-react";
import { PageContainer } from "@/components/layout/page-container";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import type { RankTier } from "@/types";

const TIER_LABELS: Record<RankTier, string> = {
  DRIFTER: "Drifter",
  CIVILIAN: "Civilian",
  MERCHANT: "Merchant",
  BROKER: "Broker",
  YONKO: "Yonko",
};

const TIER_COLORS: Record<RankTier, string> = {
  DRIFTER: "from-slate-500 to-slate-700",
  CIVILIAN: "from-slate-400 to-slate-600",
  MERCHANT: "from-emerald-500 to-emerald-700",
  BROKER: "from-amber-500 to-amber-700",
  YONKO: "from-purple-500 to-purple-800",
};

const NEXT_TIER_REP: Record<RankTier, number | null> = {
  DRIFTER: 50,
  CIVILIAN: 50,
  MERCHANT: 500,
  BROKER: 1000,
  YONKO: null,
};

const TIER_DESCRIPTIONS: Record<RankTier, string> = {
  DRIFTER: "Max 1 active offer. Prove you're real.",
  CIVILIAN: "Max 3 offers. Level up with trades.",
  MERCHANT: "Unlimited offers. History available.",
  BROKER: "Verified profile. Access to auctions.",
  YONKO: "Market maker. Dispute moderator.",
};

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/");

  const rep = Number(profile.reputation_score) || 0;
  const tier = (profile.rank_tier as RankTier) ?? "DRIFTER";
  const nextRep = NEXT_TIER_REP[tier];
  const progress = nextRep ? Math.min(100, (rep / nextRep) * 100) : 100;

  const [
    { data: recentEvents },
    { count: openListings },
    { data: pendingTrades },
    { data: completedTrades },
  ] = await Promise.all([
    supabase
      .from("reputation_events")
      .select("change_amount, reason, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(10),
    supabase
      .from("listings")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("status", "OPEN"),
    supabase
      .from("transactions")
      .select("id, buyer_id, seller_id, buyer:buyer_id(username, avatar_url), seller:seller_id(username, avatar_url)")
      .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
      .eq("status", "PENDING_VERIFICATION")
      .order("created_at", { ascending: false })
      .limit(10),
    supabase
      .from("transactions")
      .select("id, buyer_id, seller_id, buyer:buyer_id(username, avatar_url), seller:seller_id(username, avatar_url)")
      .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
      .eq("status", "CONFIRMED")
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  const avatarUrl =
    profile.avatar_url ??
    (user.user_metadata?.avatar_url as string | undefined) ??
    "https://cdn.discordapp.com/embed/avatars/0.png";

  type TxRow = {
    id: string;
    buyer_id: string;
    seller_id: string;
    buyer?: { username?: string; avatar_url?: string };
    seller?: { username?: string; avatar_url?: string };
  };

  const pending = (pendingTrades ?? []) as TxRow[];
  const completed = (completedTrades ?? []) as TxRow[];

  return (
    <main>
      <PageContainer maxWidth="sm" className="space-y-8">
        <h1 className="text-2xl font-bold tracking-tight text-slate-50">
          Meu perfil
        </h1>

        {/* Minha reputação */}
        <Card>
          <CardHeader className="flex flex-row items-center gap-4">
            <Avatar
              src={avatarUrl}
              alt=""
              width={64}
              height={64}
              className="border-2 border-slate-700"
            />
            <div className="min-w-0">
              <CardTitle className="text-xl">{profile.username}</CardTitle>
              <p className="text-sm text-slate-400">Tier: {TIER_LABELS[tier]}</p>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Reputação</span>
                <span className="font-mono text-emerald-400">{rep.toFixed(0)} XP</span>
              </div>
              <div
                className="h-3 overflow-hidden rounded-full bg-slate-800"
                role="progressbar"
                aria-valuenow={progress}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="Progress to next tier"
              >
                <div
                  className={`h-full bg-linear-to-r ${TIER_COLORS[tier]} transition-all duration-500`}
                  style={{ width: `${progress}%` }}
                />
              </div>
              {nextRep != null && rep < nextRep && (
                <p className="text-xs text-slate-500">
                  Next tier in{" "}
                  <span className="text-slate-300">{Math.ceil(nextRep - rep)}</span> XP
                </p>
              )}
            </div>
            <p className="flex items-center gap-2 text-xs text-slate-500">
              <ShieldCheck size={14} aria-hidden />
              Discord account: {profile.account_age_days} days · Strikes: {profile.strikes}
            </p>
          </CardContent>
        </Card>

        <Card className={`bg-linear-to-r ${TIER_COLORS[tier]} bg-opacity-10 border-slate-700`}>
          <CardContent className="flex items-center gap-3 p-4">
            <Award className="size-7 shrink-0 text-slate-100" aria-hidden />
            <div>
              <p className="font-semibold text-slate-50">{TIER_LABELS[tier]}</p>
              <p className="text-sm text-slate-300">{TIER_DESCRIPTIONS[tier]}</p>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-2 gap-4">
          <Link
            href="/market/create"
            className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 transition-colors hover:border-blue-500/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
          >
            <Package className="text-blue-400 mb-2" size={24} aria-hidden />
            <p className="font-semibold text-slate-50">Active offers</p>
            <p className="text-2xl font-mono text-slate-50">{openListings ?? 0}</p>
          </Link>
          <Link
            href="/market"
            className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 transition-colors hover:border-emerald-500/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
          >
            <ArrowRightLeft className="text-emerald-400 mb-2" size={24} aria-hidden />
            <p className="font-semibold text-slate-50">Market</p>
            <p className="text-sm text-slate-400">View offers</p>
          </Link>
        </div>

        {/* Pending trades */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Clock size={18} aria-hidden />
              Pending trades
            </CardTitle>
            <p className="text-sm text-slate-500">
              Confirm or wait for the other party to confirm.
            </p>
          </CardHeader>
          <CardContent>
            {pending.length === 0 ? (
              <p className="text-sm text-slate-500">No pending trades.</p>
            ) : (
              <ul className="space-y-2" role="list">
                {pending.map((tx) => {
                  const other = tx.buyer_id === user.id ? tx.seller : tx.buyer;
                  return (
                    <li key={tx.id}>
                      <Link
                        href={`/trades/${tx.id}`}
                        className="flex items-center gap-3 rounded-lg border border-slate-800 p-3 transition-colors hover:bg-slate-800/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
                      >
                        <Avatar
                          src={other?.avatar_url}
                          className="size-10 shrink-0"
                        />
                        <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-200">
                          with {other?.username ?? "User"}
                        </span>
                        <span className="text-xs text-slate-500">
                          View room →
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Completed history */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CheckCircle2 size={18} aria-hidden />
              Completed history
            </CardTitle>
            <p className="text-sm text-slate-500">
              Trades you and the other party have confirmed.
            </p>
          </CardHeader>
          <CardContent>
            {completed.length === 0 ? (
              <p className="text-sm text-slate-500">No completed trades yet.</p>
            ) : (
              <ul className="space-y-2" role="list">
                {completed.map((tx) => {
                  const other = tx.buyer_id === user.id ? tx.seller : tx.buyer;
                  return (
                    <li key={tx.id}>
                      <Link
                        href={`/trades/${tx.id}`}
                        className="flex items-center gap-3 rounded-lg border border-slate-800 p-3 transition-colors hover:bg-slate-800/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
                      >
                        <Avatar
                          src={other?.avatar_url}
                          className="size-10 shrink-0"
                        />
                        <span className="min-w-0 flex-1 truncate text-sm text-slate-300">
                          with {other?.username ?? "User"}
                        </span>
                        <span className="text-xs text-emerald-500">Completed</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Recent reputation events */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp size={18} aria-hidden />
              Recent reputation events
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentEvents && recentEvents.length > 0 ? (
              <ul className="space-y-2" role="list">
                {recentEvents.map((ev, i) => (
                  <li
                    key={ev.reason + String(ev.created_at) + i}
                    className="flex justify-between border-b border-slate-800 py-2 text-sm last:border-0"
                  >
                    <span className="truncate pr-2 text-slate-400">{ev.reason}</span>
                    <span
                      className={
                        ev.change_amount >= 0 ? "text-emerald-400" : "text-red-400"
                      }
                    >
                      {ev.change_amount >= 0 ? "+" : ""}
                      {ev.change_amount}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-500">
                Complete trades to earn XP and appear here.
              </p>
            )}
          </CardContent>
        </Card>
      </PageContainer>
    </main>
  );
}
