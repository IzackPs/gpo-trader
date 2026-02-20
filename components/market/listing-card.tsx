import Link from "next/link";
import { ArrowRightLeft } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { RankBadge } from "@/components/ui/rank-badge";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import type { Listing, RankTier } from "@/types";

function isUserOnline(lastSeenAt?: string | null): boolean {
  if (!lastSeenAt) return false;
  const lastSeen = new Date(lastSeenAt);
  const now = new Date();
  const minutesAgo = (now.getTime() - lastSeen.getTime()) / (1000 * 60);
  return minutesAgo < 5; // Online se ativo nos últimos 5 minutos
}

interface ListingCardProps {
  listing: Listing;
  /** Quando fornecido (Realtime Presence), usa em vez de last_seen_at */
  isOnline?: boolean;
}

export function ListingCard({ listing, isOnline }: ListingCardProps) {
  const profile = listing.profiles;
  const itemCount = Array.isArray(listing.items) ? listing.items.length : 0;
  const rep = profile?.reputation_score ?? 0;
  const showOnline = isOnline !== undefined ? isOnline : (profile?.last_seen_at ? isUserOnline(profile.last_seen_at) : false);

  return (
    <Card className="relative overflow-hidden transition-colors hover:border-cyan-500/20">
      <Badge
        variant={listing.side === "HAVE" ? "have" : "want"}
        className="absolute right-0 top-0 rounded-bl-lg rounded-tr-none"
      >
        {listing.side === "HAVE" ? "Vendendo" : "Comprando"}
      </Badge>

      <CardContent className="p-5 pt-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="relative">
            <Avatar src={profile?.avatar_url ?? undefined} alt="" />
            {showOnline && (
                <span
                  className="absolute bottom-0 right-0 size-3 rounded-full border-2 border-slate-950 bg-emerald-500"
                  aria-label="Online"
                  title="Online"
                />
              )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="truncate text-sm font-semibold text-slate-50">
                {profile?.username ?? "Usuário"}
              </p>
              {profile?.rank_tier && (
                <RankBadge tier={profile.rank_tier as RankTier} showLabel={false} />
              )}
              {showOnline && (
                <span className="text-xs text-emerald-400 font-medium">Online</span>
              )}
            </div>
            <p className="text-xs text-slate-400">
              Rep: <span className="font-mono text-emerald-400">{rep.toFixed(0)}</span>
            </p>
          </div>
        </div>

        <div className="rounded-lg border border-white/10 bg-slate-950/50 p-3">
          <p className="text-sm text-slate-300">
            <span className="font-semibold text-slate-50">{itemCount}</span>{" "}
            {itemCount === 1 ? "item" : "itens"} no pacote
          </p>
          <p className="mt-0.5 text-xs text-slate-500">
            Clique para ver detalhes
          </p>
        </div>
      </CardContent>

      <CardFooter className="p-5 pt-0">
        <Link
          href={`/market/${listing.id}`}
          className="flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-white/10 px-4 text-sm font-semibold text-slate-200 transition-colors hover:bg-white/5 hover:border-cyan-500/30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-500"
        >
          Ver proposta
          <ArrowRightLeft size={16} className="shrink-0" aria-hidden />
        </Link>
      </CardFooter>
    </Card>
  );
}
