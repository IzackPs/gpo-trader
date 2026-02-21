"use client";

import { cn } from "@/lib/utils";
import type { ItemCategory } from "@/types";

const CATEGORY_EMOJI: Record<ItemCategory, string> = {
  FRUIT: "🍎",
  WEAPON: "⚔️",
  SCROLL: "📜",
  ACCESSORY: "💎",
};

export interface ItemIconProps {
  /** URL da imagem do item (opcional). Se não houver, usa emoji por categoria. */
  iconUrl?: string | null;
  category: ItemCategory;
  name: string;
  className?: string;
  size?: "sm" | "md" | "lg";
}

const sizeClasses = {
  sm: "size-8",
  md: "size-11",
  lg: "size-14",
};

export function ItemIcon({
  iconUrl,
  category,
  name,
  className,
  size = "md",
}: ItemIconProps) {
  const sizeClass = sizeClasses[size];

  if (iconUrl?.trim()) {
    return (
      <span
        className={cn(
          "flex shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-800",
          sizeClass,
          className
        )}
        aria-hidden
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={iconUrl}
          alt=""
          className="h-full w-full object-contain"
          width={size === "sm" ? 32 : size === "md" ? 44 : 56}
          height={size === "sm" ? 32 : size === "md" ? 44 : 56}
        />
      </span>
    );
  }

  const emoji = CATEGORY_EMOJI[category] ?? "💎";
  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center rounded-xl bg-slate-800 text-2xl",
        sizeClass,
        size === "sm" && "text-lg",
        size === "lg" && "text-3xl",
        className
      )}
      aria-hidden
      title={name}
    >
      {emoji}
    </span>
  );
}
