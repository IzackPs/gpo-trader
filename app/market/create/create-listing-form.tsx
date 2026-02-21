"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Check,
  Info,
  Minus,
  PackagePlus,
  Plus,
  AlertCircle,
  Search,
  X,
} from "lucide-react";
import type { Item, ItemCategory, RankTier } from "@/types";
import { MAX_STRIKES_BEFORE_BLOCK } from "@/types";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ItemDetailModal } from "@/components/market/item-detail-modal";
import { ItemIcon } from "@/components/market/item-icon";
import type { SelectedItem } from "./actions";
import { getFilteredItems, createListing } from "./actions";
import { useLocale } from "@/contexts/LocaleContext";
import { t } from "@/lib/i18n";

const MAX_ITEMS_PER_LISTING = 10;
const MAX_QTY = 30;
const MIN_QTY = 1;

const CATEGORY_LABELS: Record<ItemCategory, { pt: string; en: string }> = {
  FRUIT: { pt: "Frutas", en: "Fruits" },
  WEAPON: { pt: "Armas", en: "Weapons" },
  SCROLL: { pt: "Pergaminhos", en: "Scrolls" },
  ACCESSORY: { pt: "Acessórios", en: "Accessories" },
};

const CATEGORIES: ItemCategory[] = [
  "FRUIT",
  "WEAPON",
  "SCROLL",
  "ACCESSORY",
];

interface CreateListingFormProps {
  items: Item[];
  rankTier: RankTier;
  accountAgeDays: number;
  strikes: number;
  openListingsCount: number;
  maxListings: number;
}

export function CreateListingForm({
  items,
  rankTier,
  accountAgeDays,
  strikes,
  openListingsCount,
  maxListings,
}: CreateListingFormProps) {
  const router = useRouter();
  const { locale } = useLocale();

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [side, setSide] = useState<"HAVE" | "WANT">("HAVE");
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<ItemCategory | "ALL">(
    "ALL"
  );
  const [displayItems, setDisplayItems] = useState<Item[]>(items);
  const [hasMore, setHasMore] = useState(items.length >= 50);
  const [filterLoading, setFilterLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailItemId, setDetailItemId] = useState<number | null>(null);

  const atLimit = openListingsCount >= maxListings;
  const accountTooNew = accountAgeDays < 30;
  const blockedByStrikes = strikes >= MAX_STRIKES_BEFORE_BLOCK;

  useEffect(() => {
    setDisplayItems(items);
  }, [items]);

  const fetchFiltered = useCallback(async (s: string, cat: ItemCategory | "ALL") => {
    setFilterLoading(true);
    const result = await getFilteredItems(s || undefined, cat, 0);
    setDisplayItems(result.items);
    setHasMore(result.hasMore);
    setFilterLoading(false);
  }, []);

  const loadMore = useCallback(async () => {
    setLoadingMore(true);
    const result = await getFilteredItems(
      search.trim() || undefined,
      categoryFilter,
      displayItems.length
    );
    setDisplayItems((prev) => [...prev, ...result.items]);
    setHasMore(result.hasMore);
    setLoadingMore(false);
  }, [search, categoryFilter, displayItems.length]);

  useEffect(() => {
    if (!search.trim() && categoryFilter === "ALL") {
      setDisplayItems(items);
      setHasMore(items.length >= 50);
      return;
    }
    const t = setTimeout(() => {
      fetchFiltered(search, categoryFilter);
    }, 300);
    return () => clearTimeout(t);
  }, [search, categoryFilter, fetchFiltered, items]);

  const filteredItems = displayItems;

  const toggleItem = (id: number) => {
    setError(null);
    const idx = selectedItems.findIndex((s) => s.item_id === id);
    if (idx >= 0) {
      setSelectedItems((prev) => prev.filter((s) => s.item_id !== id));
    } else {
      if (selectedItems.length >= MAX_ITEMS_PER_LISTING) {
        setError(t(locale, "create.maxItemsError"));
        return;
      }
      setSelectedItems((prev) => [...prev, { item_id: id, qty: 1 }]);
    }
  };

  const removeSelected = (itemId: number) => {
    setError(null);
    setSelectedItems((prev) => prev.filter((s) => s.item_id !== itemId));
  };

  const updateQty = (itemId: number, delta: number) => {
    setSelectedItems((prev) =>
      prev.map((s) =>
        s.item_id === itemId
          ? { ...s, qty: Math.min(MAX_QTY, Math.max(MIN_QTY, s.qty + delta)) }
          : s
      )
    );
  };

  const setQty = (itemId: number, value: number) => {
    const qty = Math.min(MAX_QTY, Math.max(MIN_QTY, value));
    setSelectedItems((prev) =>
      prev.map((s) => (s.item_id === itemId ? { ...s, qty } : s))
    );
  };

  const handleSubmit = async () => {
    setError(null);
    if (selectedItems.length === 0) {
      setError(t(locale, "errors.selectOneItem"));
      return;
    }

    // Validações do cliente (UX) - mas o banco também valida
    if (blockedByStrikes) {
      setError(t(locale, "errors.accountBlocked", { count: strikes }));
      return;
    }
    if (accountTooNew) {
      setError(t(locale, "errors.accountTooNew"));
      return;
    }
    if (atLimit) {
      setError(t(locale, "errors.atLimit", { max: maxListings }));
      return;
    }

    setSubmitting(true);
    const result = await createListing(side, selectedItems);
    if (result.error) {
      setError(result.error);
      setSubmitting(false);
      return;
    }
    router.push("/market");
    router.refresh();
  };

  const selectedItemsDetails = useMemo(
    () =>
      selectedItems.map((s) => {
        const item = displayItems.find((i) => i.id === s.item_id) ?? items.find((i) => i.id === s.item_id);
        return item ? { ...item, qty: s.qty } : null;
      }).filter(Boolean) as (Item & { qty: number })[],
    [selectedItems, displayItems, items]
  );

  return (
    <div className="space-y-6">
      {blockedByStrikes && (
        <Alert variant="error" className="flex gap-3">
          <AlertCircle className="mt-0.5 size-5 shrink-0" aria-hidden />
          <div>
            <p className="font-medium">{t(locale, "create.alertBlockedTitle")}</p>
            <p>
              {locale === "en"
                ? `Your account has ${strikes} strike(s). After ${MAX_STRIKES_BEFORE_BLOCK} strikes, you cannot create new offers. Contact moderation.`
                : `Sua conta acumulou ${strikes} strike(s). Após ${MAX_STRIKES_BEFORE_BLOCK} strikes, não é possível criar novas ofertas. Entre em contato com a moderação.`}
            </p>
          </div>
        </Alert>
      )}

      {accountTooNew && (
        <Alert variant="warning" className="flex gap-3">
          <AlertCircle className="mt-0.5 size-5 shrink-0" aria-hidden />
          <div>
            <p className="font-medium">{t(locale, "create.alertTooNewTitle")}</p>
            <p>
              {locale === "en"
                ? `To prevent abuse, only accounts with at least 30 days can create offers. Your account has ${accountAgeDays} day(s).`
                : `Para evitar abusos, só é possível criar ofertas com contas com pelo menos 30 dias. Sua conta tem ${accountAgeDays} dia(s).`}
            </p>
          </div>
        </Alert>
      )}

      {atLimit && !accountTooNew && (
        <Alert variant="warning" className="flex gap-3">
          <AlertCircle className="mt-0.5 size-5 shrink-0" aria-hidden />
          <div>
            <p className="font-medium">{t(locale, "create.alertAtLimitTitle")}</p>
            <p>
              {locale === "en"
                ? `Your tier (${rankTier}) allows up to ${maxListings} open offer(s). Cancel an offer on the market or complete trades to level up.`
                : `Seu tier (${rankTier}) permite no máximo ${maxListings} oferta(s) aberta(s). Cancele uma oferta no mercado ou complete trocas para subir de nível.`}
            </p>
          </div>
        </Alert>
      )}

      {error && (
        <Alert variant="error">
          <p>{error}</p>
        </Alert>
      )}

      <Card className="glass border-white/10">
        <CardContent className="p-4 sm:p-5">
          <p className="mb-3 text-sm font-medium text-slate-300">
            {t(locale, "create.typeLabel")}
          </p>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setSide("HAVE")}
              className={`rounded-xl py-3.5 text-sm font-semibold transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-500 ${
                side === "HAVE"
                  ? "bg-emerald-600 text-white shadow-lg shadow-emerald-500/20"
                  : "bg-slate-800/80 text-slate-500 hover:bg-slate-700/80 hover:text-slate-300"
              }`}
              aria-pressed={side === "HAVE"}
            >
              {t(locale, "create.have")}
            </button>
            <button
              type="button"
              onClick={() => setSide("WANT")}
              className={`rounded-xl py-3.5 text-sm font-semibold transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-500 ${
                side === "WANT"
                  ? "bg-amber-600 text-white shadow-lg shadow-amber-500/20"
                  : "bg-slate-800/80 text-slate-500 hover:bg-slate-700/80 hover:text-slate-300"
              }`}
              aria-pressed={side === "WANT"}
            >
              {t(locale, "create.want")}
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Filtros + Itens */}
      <section aria-labelledby="items-heading" className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2
            id="items-heading"
            className="text-base font-medium text-slate-300"
          >
            {t(locale, "create.selectItems")}
          </h2>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 sm:w-56">
              <Search
                className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-500"
                aria-hidden
              />
              <Input
                type="search"
                placeholder={t(locale, "create.searchPlaceholder")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
                aria-label={t(locale, "common.searchItems")}
              />
            </div>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => setCategoryFilter("ALL")}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-500 ${
                  categoryFilter === "ALL"
                    ? "bg-cyan-500/20 text-cyan-400"
                    : "bg-slate-800/80 text-slate-500 hover:bg-slate-700 hover:text-slate-300"
                }`}
                aria-pressed={categoryFilter === "ALL"}
              >
                {t(locale, "create.allCategories")}
              </button>
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategoryFilter(cat)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-500 ${
                    categoryFilter === cat
                      ? "bg-cyan-500/20 text-cyan-400"
                      : "bg-slate-800/80 text-slate-500 hover:bg-slate-700 hover:text-slate-300"
                  }`}
                  aria-pressed={categoryFilter === cat}
                >
                  {CATEGORY_LABELS[cat][locale]}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Selecionados (chips) com quantidade */}
        {selectedItems.length > 0 && (
          <div className="glass flex flex-wrap items-center gap-3 rounded-xl border border-white/10 p-3">
            <span className="text-xs font-medium text-slate-500 w-full sm:w-auto">
              {t(locale, "create.selected")} ({selectedItems.length}/{MAX_ITEMS_PER_LISTING}) — {t(locale, "create.maxPerItem")}:
            </span>
            {selectedItemsDetails.map((item) => (
              <div
                key={item.id}
                className="inline-flex items-center gap-1.5 rounded-lg bg-cyan-500/20 px-2.5 py-1.5 text-sm font-medium text-cyan-200"
              >
                <ItemIcon iconUrl={item.icon_url} category={item.category} name={item.name} size="sm" className="shrink-0" />
                <span className="min-w-[4ch]">{item.name}</span>
                <div className="flex items-center gap-0.5 rounded bg-slate-800/80">
                  <button
                    type="button"
                    onClick={() => updateQty(item.id, -1)}
                    disabled={item.qty <= MIN_QTY}
                    className="rounded p-1 transition-colors hover:bg-cyan-500/30 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-cyan-500"
                    aria-label={`${t(locale, "common.less")} ${item.name}`}
                  >
                    <Minus size={12} aria-hidden />
                  </button>
                  <input
                    type="number"
                    min={MIN_QTY}
                    max={MAX_QTY}
                    value={item.qty}
                    onChange={(e) => setQty(item.id, parseInt(e.target.value, 10) || MIN_QTY)}
                    className="w-9 rounded bg-transparent py-0.5 text-center text-cyan-200 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                    aria-label={`${t(locale, "common.quantity")} ${item.name}`}
                  />
                  <button
                    type="button"
                    onClick={() => updateQty(item.id, 1)}
                    disabled={item.qty >= MAX_QTY}
                    className="rounded p-1 transition-colors hover:bg-cyan-500/30 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-cyan-500"
                    aria-label={`${t(locale, "common.more")} ${item.name}`}
                  >
                    <Plus size={12} aria-hidden />
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => removeSelected(item.id)}
                  className="rounded p-0.5 transition-colors hover:bg-cyan-500/30 focus-visible:outline-2 focus-visible:outline-cyan-500"
                  aria-label={`${t(locale, "common.remove")} ${item.name}`}
                >
                  <X size={14} aria-hidden />
                </button>
              </div>
            ))}
          </div>
        )}

        {filterLoading ? (
          <div className="rounded-xl border border-white/10 bg-slate-900/30 py-12 text-center">
            <p className="text-slate-500">{t(locale, "create.searching")}</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="rounded-xl border border-white/10 bg-slate-900/30 py-12 text-center">
            <p className="text-slate-500">
              {search.trim() || categoryFilter !== "ALL"
                ? t(locale, "create.noResults")
                : t(locale, "create.noItems")}
            </p>
            {(search.trim() || categoryFilter !== "ALL") && (
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setCategoryFilter("ALL");
                }}
                className="mt-2 text-sm text-cyan-400 hover:underline"
              >
                {t(locale, "create.clearFilters")}
              </button>
            )}
          </div>
        ) : (
          <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {filteredItems.map((item) => {
              const isSelected = selectedItems.some((s) => s.item_id === item.id);
              return (
                <div
                  key={item.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => toggleItem(item.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      toggleItem(item.id);
                    }
                  }}
                  className={`relative flex aspect-square flex-col items-center justify-center gap-2 rounded-xl border-2 p-3 transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-500 cursor-pointer ${
                    isSelected
                      ? "border-cyan-500 bg-cyan-500/10 shadow-[0_0_20px_rgba(6,182,212,0.2)]"
                      : "border-slate-700/80 bg-slate-900/50 hover:border-slate-600 hover:bg-slate-800/50"
                  }`}
                  aria-pressed={isSelected}
                  aria-label={`${item.name}${isSelected ? `, ${t(locale, "common.selected")}` : ""}`}
                >
                  {isSelected && (
                    <span className="absolute right-2 top-2 flex size-6 items-center justify-center rounded-full bg-cyan-500">
                      <Check
                        size={14}
                        className="text-slate-950"
                        aria-hidden
                      />
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDetailItemId(item.id);
                      setDetailOpen(true);
                    }}
                    className="absolute left-2 top-2 flex size-6 items-center justify-center rounded-full bg-slate-700/80 text-slate-400 hover:bg-slate-600 hover:text-slate-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-500"
                    aria-label={`${t(locale, "create.viewDetails")}: ${item.name}`}
                    title={t(locale, "create.viewDetails")}
                  >
                    <Info size={12} aria-hidden />
                  </button>
                  <ItemIcon
                    iconUrl={item.icon_url}
                    category={item.category}
                    name={item.name}
                    size="md"
                    className={isSelected ? "bg-cyan-500/20" : ""}
                  />
                  <span
                    className={`line-clamp-2 text-center text-xs font-medium leading-tight ${
                      isSelected ? "text-slate-50" : "text-slate-400"
                    }`}
                  >
                    {item.name}
                  </span>
                </div>
              );
            })}
          </div>
          {hasMore && (
            <div className="flex justify-center pt-4">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={filterLoading || loadingMore}
                onClick={loadMore}
              >
                {loadingMore ? t(locale, "create.loadingMore") : t(locale, "create.loadMore")}
              </Button>
            </div>
          )}
          </>
        )}
      </section>

      <div className="sticky bottom-0 border-t border-white/10 bg-slate-950/95 py-4 backdrop-blur sm:py-6">
        <Button
          variant="primary"
          size="lg"
          className="w-full sm:max-w-xs"
          leftIcon={submitting ? undefined : <PackagePlus size={20} />}
          isLoading={submitting}
          disabled={selectedItems.length === 0 || atLimit || accountTooNew || blockedByStrikes || selectedItems.some((s) => s.qty < MIN_QTY || s.qty > MAX_QTY)}
          onClick={handleSubmit}
        >
          {submitting ? t(locale, "create.publishing") : t(locale, "create.publish")}
        </Button>
      </div>

      <ItemDetailModal
        open={detailOpen}
        onClose={() => { setDetailOpen(false); setDetailItemId(null); }}
        itemId={detailItemId}
      />
    </div>
  );
}
