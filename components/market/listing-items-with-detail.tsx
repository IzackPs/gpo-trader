"use client";

import { useState } from "react";
import { Info } from "lucide-react";
import { useLocale } from "@/contexts/LocaleContext";
import { t } from "@/lib/i18n";
import { ItemDetailModal } from "./item-detail-modal";
import { ItemIcon } from "./item-icon";

type ItemDetail = {
  id: number;
  name: string;
  category: string;
  icon_url: string | null;
  market_value_leg_chests?: number;
  is_active?: boolean;
};

type Entry = { item_id: number; qty?: number };

interface ListingItemsWithDetailProps {
  entries: Entry[];
  itemsDetails: ItemDetail[] | null | undefined;
}

export function ListingItemsWithDetail({
  entries,
  itemsDetails,
}: ListingItemsWithDetailProps) {
  const { locale } = useLocale();
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailItemId, setDetailItemId] = useState<number | null>(null);

  if (entries.length === 0) {
    return (
      <p className="py-4 text-center text-slate-500">{t(locale, "listingDetail.noItems")}</p>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {entries.map((entry, index) => {
          const item = itemsDetails?.find((i) => i.id === entry.item_id);
          const discontinued = !item || item.is_active === false;
          return (
            <div
              key={`${entry.item_id}-${index}`}
              className={`flex items-center gap-4 rounded-lg border p-4 ${
                discontinued
                  ? "border-amber-800/50 bg-amber-500/5"
                  : "border-slate-800 bg-slate-950"
              }`}
            >
              <ItemIcon
                iconUrl={item?.icon_url ?? null}
                category={(item?.category as "FRUIT" | "WEAPON" | "SCROLL" | "ACCESSORY") ?? "ACCESSORY"}
                name={item?.name ?? "Item"}
                size="md"
                className="shrink-0"
              />
              <div className="min-w-0 flex-1">
                <h3 className="font-bold text-white">
                  {discontinued ? (
                    <span className="text-amber-400/90">
                      {item?.name ?? "Item"}{" "}
                      <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-xs font-normal text-amber-300">
                        {t(locale, "listingDetail.discontinued")}
                      </span>
                    </span>
                  ) : (
                    item?.name
                  )}
                  {(entry.qty ?? 1) > 1 && (
                    <span className="ml-1.5 font-normal text-slate-400">× {entry.qty}</span>
                  )}
                </h3>
                <p className="text-xs text-slate-400">{item?.category ?? "—"}</p>
              </div>
              {!discontinued && (
                <div className="flex items-center gap-2">
                  <p className="text-sm font-mono text-emerald-400">
                    {item?.market_value_leg_chests != null && (entry.qty ?? 1) > 1
                      ? `${(item.market_value_leg_chests * (entry.qty ?? 1)).toFixed(0)} 💎`
                      : `${item?.market_value_leg_chests} 💎`}
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setDetailItemId(entry.item_id);
                      setDetailOpen(true);
                    }}
                    className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-white/10 hover:text-cyan-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-500"
                    aria-label={`${locale === "en" ? "View details for" : "Ver detalhes de"} ${item?.name ?? "item"}`}
                    title={locale === "en" ? "View item details" : "Ver detalhes do item"}
                  >
                    <Info size={18} aria-hidden />
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <ItemDetailModal
        open={detailOpen}
        onClose={() => {
          setDetailOpen(false);
          setDetailItemId(null);
        }}
        itemId={detailItemId}
      />
    </>
  );
}
