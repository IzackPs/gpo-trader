"use client";

import { useState, useMemo } from "react";
import { Plus, Trash2, ArrowRightLeft, ThumbsUp, Minus, ThumbsDown } from "lucide-react";
import { useLocale } from "@/contexts/LocaleContext";
import { t } from "@/lib/i18n";
import type { Item } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const MAX_QTY = 999;

type Row = { item_id: number; qty: number };

interface TradeCalculatorClientProps {
  items: Item[];
}

export function TradeCalculatorClient({ items }: TradeCalculatorClientProps) {
  const { locale } = useLocale();
  const [give, setGive] = useState<Row[]>([]);
  const [receive, setReceive] = useState<Row[]>([]);

  const addRow = (side: "give" | "receive") => {
    const first = items[0];
    if (!first) return;
    const row: Row = { item_id: first.id, qty: 1 };
    if (side === "give") setGive((prev) => [...prev, row]);
    else setReceive((prev) => [...prev, row]);
  };

  const removeRow = (side: "give" | "receive", index: number) => {
    if (side === "give") setGive((prev) => prev.filter((_, i) => i !== index));
    else setReceive((prev) => prev.filter((_, i) => i !== index));
  };

  const updateRow = (side: "give" | "receive", index: number, field: "item_id" | "qty", value: number) => {
    const setter = side === "give" ? setGive : setReceive;
    setter((prev) =>
      prev.map((r, i) =>
        i === index ? { ...r, [field]: field === "qty" ? Math.max(1, Math.min(MAX_QTY, value)) : value } : r
      )
    );
  };

  const totalValue = (rows: Row[]) =>
    rows.reduce((sum, r) => {
      const item = items.find((i) => i.id === r.item_id);
      return sum + (item ? item.market_value_leg_chests * r.qty : 0);
    }, 0);

  const totalGive = useMemo(() => totalValue(give), [give, items]);
  const totalReceive = useMemo(() => totalValue(receive), [receive, items]);

  const diff = totalReceive - totalGive;
  const percentDiff = totalGive > 0 ? (diff / totalGive) * 100 : 0;

  let verdict: "good" | "bad" | "fair" = "fair";
  let verdictLabel = t(locale, "calculator.fairTrade");
  let verdictDesc = t(locale, "calculator.fairTradeDesc");
  if (percentDiff > 5) {
    verdict = "good";
    verdictLabel = t(locale, "calculator.goodTrade");
    verdictDesc = t(locale, "calculator.goodTradeDesc", { percent: percentDiff.toFixed(0) });
  } else if (percentDiff < -5) {
    verdict = "bad";
    verdictLabel = t(locale, "calculator.badTrade");
    verdictDesc = t(locale, "calculator.badTradeDesc", { percent: Math.abs(percentDiff).toFixed(0) });
  }

  const renderSide = (side: "give" | "receive", rows: Row[], title: string) => (
    <Card className="flex flex-1 flex-col border-white/10">
      <CardContent className="p-4">
        <h2 className="mb-3 text-sm font-semibold text-slate-300">{title}</h2>
        <div className="space-y-2">
          {rows.map((row, index) => {
            const item = items.find((i) => i.id === row.item_id);
            return (
              <div
                key={`${side}-${index}`}
                className="flex flex-wrap items-center gap-2 rounded-lg border border-white/10 bg-slate-950/50 p-2"
              >
                <select
                  value={row.item_id}
                  onChange={(e) => updateRow(side, index, "item_id", Number(e.target.value))}
                  className="min-w-[120px] flex-1 rounded border border-white/10 bg-slate-800 px-2 py-1.5 text-sm text-slate-100 focus:border-cyan-500 focus:outline-none"
                >
                  {items.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.name}
                    </option>
                  ))}
                </select>
                <span className="text-slate-500">×</span>
                <input
                  type="number"
                  min={1}
                  max={MAX_QTY}
                  value={row.qty}
                  onChange={(e) => updateRow(side, index, "qty", parseInt(e.target.value, 10) || 1)}
                  className="w-16 rounded border border-white/10 bg-slate-800 px-2 py-1.5 text-center text-sm text-slate-100 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                />
                {item && (
                  <span className="text-xs text-slate-400">
                    = {(item.market_value_leg_chests * row.qty).toFixed(1)} 💎
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => removeRow(side, index)}
                  className="rounded p-1.5 text-slate-400 transition-colors hover:bg-red-500/20 hover:text-red-400 focus-visible:outline-2 focus-visible:outline-cyan-500"
                  aria-label={t(locale, "common.removeRow")}
                >
                  <Trash2 size={16} aria-hidden />
                </button>
              </div>
            );
          })}
        </div>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="mt-3 w-full"
          leftIcon={<Plus size={16} />}
          onClick={() => addRow(side)}
        >
          {t(locale, "calculator.addItem")}
        </Button>
        <p className="mt-3 text-right font-mono text-sm text-cyan-400">
          {t(locale, "calculator.total")}: {totalValue(rows).toFixed(1)} 💎
        </p>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-stretch">
        {renderSide("give", give, t(locale, "calculator.youGive"))}
        <div className="flex flex-col items-center justify-center gap-2 text-theme-muted lg:px-2">
          <ArrowRightLeft size={28} aria-hidden />
          <span className="text-xs font-medium">{t(locale, "calculator.swap")}</span>
        </div>
        {renderSide("receive", receive, t(locale, "calculator.youReceive"))}
      </div>

      {(give.length > 0 || receive.length > 0) && (
        <Card
          className={`border-2 ${
            verdict === "good"
              ? "border-emerald-500/50 bg-emerald-500/10"
              : verdict === "bad"
                ? "border-red-500/50 bg-red-500/10"
                : "border-slate-600 bg-slate-800/30"
          }`}
        >
          <CardContent className="flex flex-col items-center gap-4 p-6 sm:flex-row sm:justify-between">
            <div className="flex items-center gap-3">
              {verdict === "good" && <ThumbsUp size={32} className="text-emerald-400" aria-hidden />}
              {verdict === "bad" && <ThumbsDown size={32} className="text-red-400" aria-hidden />}
              {verdict === "fair" && <Minus size={32} className="text-slate-400" aria-hidden />}
              <div>
                <p className="text-lg font-bold text-slate-50">{verdictLabel}</p>
                <p className="text-sm text-theme-secondary">{verdictDesc}</p>
              </div>
            </div>
            <div className="text-right font-mono text-sm">
              <p className="text-theme-secondary">{t(locale, "calculator.difference")}: {diff >= 0 ? "+" : ""}{diff.toFixed(1)} 💎</p>
              <p className="text-slate-300">({percentDiff >= 0 ? "+" : ""}{percentDiff.toFixed(1)}%)</p>
            </div>
          </CardContent>
        </Card>
      )}

      {give.length === 0 && receive.length === 0 && (
        <p className="text-center text-sm text-theme-muted">
          {t(locale, "calculator.addItemsHint")}
        </p>
      )}
    </div>
  );
}
