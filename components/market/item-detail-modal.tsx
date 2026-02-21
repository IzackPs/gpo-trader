"use client";

import { useEffect, useState } from "react";
import { X, TrendingUp, Package, Coins } from "lucide-react";
import { getItemWithMarketStats } from "@/app/market/actions";
import type { Item } from "@/types";
import { ItemIcon } from "./item-icon";

const CATEGORY_LABELS: Record<string, string> = {
  FRUIT: "Fruta",
  WEAPON: "Arma",
  SCROLL: "Pergaminho",
  ACCESSORY: "Acessório",
};

interface ItemDetailModalProps {
  open: boolean;
  onClose: () => void;
  /** ID do item a exibir. Quando open e itemId são definidos, os detalhes são carregados. */
  itemId: number | null;
}

export function ItemDetailModal({
  open,
  onClose,
  itemId,
}: ItemDetailModalProps) {
  const [item, setItem] = useState<Item | null>(null);
  const [marketStats, setMarketStats] = useState<{
    weighted_avg_price: number;
    total_volume: number;
    trade_count: number;
  } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || itemId == null) {
      setItem(null);
      setMarketStats(null);
      return;
    }
    setLoading(true);
    getItemWithMarketStats(itemId)
      .then(({ item: i, marketStats: ms }) => {
        setItem(i ?? null);
        setMarketStats(ms ?? null);
      })
      .finally(() => setLoading(false));
  }, [open, itemId]);

  if (!open) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
        aria-hidden
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="item-detail-title"
        className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-white/10 bg-slate-900 shadow-xl"
      >
        <div className="flex items-center justify-between border-b border-white/10 p-4">
          <h2 id="item-detail-title" className="text-lg font-semibold text-slate-50">
            Detalhes do item
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-white/10 hover:text-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-500"
            aria-label="Fechar"
          >
            <X size={20} aria-hidden />
          </button>
        </div>

        <div className="p-4" onClick={(e) => e.stopPropagation()}>
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400">
              <div className="size-10 animate-pulse rounded-full bg-slate-700" />
              <p className="mt-3 text-sm">A carregar…</p>
            </div>
          ) : item ? (
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <ItemIcon
                  iconUrl={item.icon_url}
                  category={item.category}
                  name={item.name}
                  size="lg"
                  className="shrink-0"
                />
                <div className="min-w-0">
                  <p className="font-bold text-slate-50">{item.name}</p>
                  <p className="text-sm text-slate-400">
                    {CATEGORY_LABELS[item.category] ?? item.category}
                  </p>
                </div>
              </div>

              <div className="grid gap-3 rounded-xl border border-white/10 bg-slate-950/50 p-4">
                <div className="flex items-center gap-3">
                  <span className="flex size-9 items-center justify-center rounded-lg bg-amber-500/20 text-amber-400">
                    <Coins size={18} aria-hidden />
                  </span>
                  <div>
                    <p className="text-xs text-slate-500">Preço em Legendary Chests</p>
                    <p className="font-mono font-semibold text-slate-100">
                      {item.market_value_leg_chests}
                    </p>
                  </div>
                </div>

                {marketStats ? (
                  <>
                    <div className="flex items-center gap-3">
                      <span className="flex size-9 items-center justify-center rounded-lg bg-cyan-500/20 text-cyan-400">
                        <TrendingUp size={18} aria-hidden />
                      </span>
                      <div>
                        <p className="text-xs text-slate-500">Preço médio (WAP) — última semana</p>
                        <p className="font-mono font-semibold text-slate-100">
                          {marketStats.weighted_avg_price.toFixed(2)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="flex size-9 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400">
                        <Package size={18} aria-hidden />
                      </span>
                      <div>
                        <p className="text-xs text-slate-500">Volume de mercado (última semana)</p>
                        <p className="font-mono font-semibold text-slate-100">
                          {marketStats.total_volume.toFixed(2)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-sm text-slate-400">
                      <span>Trocas na última semana</span>
                      <span className="font-mono text-slate-200">{marketStats.trade_count}</span>
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-slate-500">
                    Ainda não há dados de mercado para este item na última semana.
                  </p>
                )}

                {typeof item.volatility === "number" && (
                  <div className="flex items-center justify-between border-t border-white/10 pt-3 text-sm">
                    <span className="text-slate-500">Volatilidade</span>
                    <span className="font-mono text-slate-300">{item.volatility}</span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <p className="py-8 text-center text-slate-500">Item não encontrado.</p>
          )}
        </div>
      </div>
    </>
  );
}
