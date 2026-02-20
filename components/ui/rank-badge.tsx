import { cn } from "@/lib/utils";
import type { RankTier } from "@/types";

const TIER_LABELS: Record<RankTier, string> = {
  DRIFTER: "Drifter",
  CIVILIAN: "Civilian",
  MERCHANT: "Merchant",
  BROKER: "Broker",
  YONKO: "Yonko",
};

const TIER_STYLES: Record<RankTier, string> = {
  DRIFTER: "bg-slate-600 text-slate-200",
  CIVILIAN: "bg-slate-500 text-white",
  MERCHANT: "bg-emerald-600 text-white",
  BROKER: "bg-amber-600 text-slate-900",
  YONKO: "bg-purple-600 text-white",
};

export interface RankBadgeProps {
  tier: RankTier;
  className?: string;
  showLabel?: boolean;
}

export function RankBadge({
  tier,
  className,
  showLabel = true,
}: RankBadgeProps) {
  const label = TIER_LABELS[tier];
  return (
    <span
      role="img"
      aria-label={`Rank: ${label}`}
      title={label}
      className={cn(
        "inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider",
        TIER_STYLES[tier],
        className
      )}
    >
      {showLabel ? label : tier.charAt(0)}
    </span>
  );
}
