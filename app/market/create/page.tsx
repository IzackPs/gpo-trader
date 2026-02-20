"use client";

import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Check,
  PackagePlus,
  AlertCircle,
  Search,
  X,
} from "lucide-react";
import Link from "next/link";
import { TIER_LIMITS, MIN_ACCOUNT_AGE_DAYS, type RankTier } from "@/types";
import type { Item, ItemCategory } from "@/types";
import { PageContainer } from "@/components/layout/page-container";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

const CATEGORY_LABELS: Record<ItemCategory, string> = {
  FRUIT: "Frutas",
  WEAPON: "Armas",
  SCROLL: "Pergaminhos",
  ACCESSORY: "Acessórios",
};

const CATEGORIES: ItemCategory[] = [
  "FRUIT",
  "WEAPON",
  "SCROLL",
  "ACCESSORY",
];

export default function CreateListingPage() {
  const supabase = createClient();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [openListingsCount, setOpenListingsCount] = useState(0);
  const [rankTier, setRankTier] = useState<RankTier>("DRIFTER");
  const [accountAgeDays, setAccountAgeDays] = useState(0);

  const [side, setSide] = useState<"HAVE" | "WANT">("HAVE");
  const [selectedItems, setSelectedItems] = useState<number[]>([]);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<ItemCategory | "ALL">(
    "ALL"
  );

  const maxListings = TIER_LIMITS[rankTier].maxListings;
  const atLimit = openListingsCount >= maxListings;
  const accountTooNew = accountAgeDays < MIN_ACCOUNT_AGE_DAYS;

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchSearch =
        !search.trim() ||
        item.name.toLowerCase().includes(search.trim().toLowerCase());
      const matchCategory =
        categoryFilter === "ALL" || item.category === categoryFilter;
      return matchSearch && matchCategory;
    });
  }, [items, search, categoryFilter]);

  useEffect(() => {
    async function fetchData() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }
      const [itemsRes, profileRes, countRes] = await Promise.all([
        supabase
          .from("items")
          .select("*")
          .order("category", { ascending: true })
          .order("name", { ascending: true }),
        supabase
          .from("profiles")
          .select("rank_tier, account_age_days")
          .eq("id", user.id)
          .single(),
        supabase
          .from("listings")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .eq("status", "OPEN"),
      ]);
      if (itemsRes.data) setItems(itemsRes.data as Item[]);
      if (profileRes.data?.rank_tier)
        setRankTier(profileRes.data.rank_tier as RankTier);
      if (typeof profileRes.data?.account_age_days === "number")
        setAccountAgeDays(profileRes.data.account_age_days);
      setOpenListingsCount(countRes.count ?? 0);
      setLoading(false);
    }
    fetchData();
  }, []);

  const toggleItem = (id: number) => {
    setError(null);
    if (selectedItems.includes(id)) {
      setSelectedItems((prev) => prev.filter((item) => item !== id));
    } else {
      if (selectedItems.length >= 4) {
        setError("Máximo de 4 itens por troca.");
        return;
      }
      setSelectedItems((prev) => [...prev, id]);
    }
  };

  const removeSelected = (id: number) => {
    setError(null);
    setSelectedItems((prev) => prev.filter((item) => item !== id));
  };

  const handleSubmit = async () => {
    setError(null);
    if (selectedItems.length === 0) {
      setError("Selecione pelo menos 1 item.");
      return;
    }
    if (accountTooNew) {
      setError(
        `Conta Discord muito nova. É necessário ter pelo menos ${MIN_ACCOUNT_AGE_DAYS} dias de conta para criar ofertas (anti-Sybil).`
      );
      return;
    }
    if (atLimit) {
      setError(
        `Limite de ofertas ativas atingido (${maxListings} para seu tier). Cancele uma oferta ou suba de nível.`
      );
      return;
    }

    setSubmitting(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      router.push("/");
      return;
    }

    const itemsJson = selectedItems.map((id) => ({ item_id: id, qty: 1 }));
    const { error: insertError } = await supabase.from("listings").insert({
      user_id: user.id,
      side,
      items: itemsJson,
      status: "OPEN",
    });

    if (insertError) {
      setError(insertError.message);
      setSubmitting(false);
    } else {
      router.push("/market");
      router.refresh();
    }
  };

  const selectedItemsDetails = useMemo(
    () => selectedItems.map((id) => items.find((i) => i.id === id)).filter(Boolean) as Item[],
    [selectedItems, items]
  );

  return (
    <main>
      <PageContainer maxWidth="lg" className="space-y-6">
        <Link
          href="/market"
          className="inline-flex items-center gap-2 text-sm text-slate-400 transition-colors hover:text-slate-50 focus-visible:rounded focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-500"
        >
          <ArrowLeft size={18} aria-hidden />
          Voltar para o mercado
        </Link>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-50 sm:text-3xl">
              Nova oferta
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Escolha o tipo de oferta e os itens. Máximo 4 itens por oferta.
            </p>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <span>Ofertas ativas:</span>
            <span className="font-medium tabular-nums text-slate-300">
              {openListingsCount}/{maxListings}
            </span>
          </div>
        </div>

        {accountTooNew && (
          <Alert variant="warning" className="flex gap-3">
            <AlertCircle className="mt-0.5 size-5 shrink-0" aria-hidden />
            <div>
              <p className="font-medium">Conta Discord muito nova</p>
              <p>
                Para evitar abusos, só é possível criar ofertas com contas com
                pelo menos {MIN_ACCOUNT_AGE_DAYS} dias. Sua conta tem{" "}
                {accountAgeDays} dia(s).
              </p>
            </div>
          </Alert>
        )}

        {atLimit && !accountTooNew && (
          <Alert variant="warning" className="flex gap-3">
            <AlertCircle className="mt-0.5 size-5 shrink-0" aria-hidden />
            <div>
              <p className="font-medium">Limite de ofertas ativas atingido</p>
              <p>
                Seu tier ({rankTier}) permite no máximo {maxListings} oferta(s)
                aberta(s). Cancele uma oferta no mercado ou complete trocas para
                subir de nível.
              </p>
            </div>
          </Alert>
        )}

        {error && (
          <Alert variant="error">
            <p>{error}</p>
          </Alert>
        )}

        {/* Tipo de oferta */}
        <Card className="glass border-white/10">
          <CardContent className="p-4 sm:p-5">
            <p className="mb-3 text-sm font-medium text-slate-300">
              Tipo de oferta
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
                Eu tenho (Vender)
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
                Eu quero (Comprar)
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
              Selecione os itens
            </h2>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative flex-1 sm:w-56">
                <Search
                  className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-500"
                  aria-hidden
                />
                <Input
                  type="search"
                  placeholder="Buscar por nome..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                  aria-label="Buscar itens por nome"
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
                  Todos
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
                    {CATEGORY_LABELS[cat]}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Selecionados (chips) */}
          {selectedItems.length > 0 && (
            <div className="glass flex flex-wrap items-center gap-2 rounded-xl border border-white/10 p-3">
              <span className="text-xs font-medium text-slate-500">
                Selecionados ({selectedItems.length}/4):
              </span>
              {selectedItemsDetails.map((item) => (
                <span
                  key={item.id}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-cyan-500/20 px-2.5 py-1.5 text-sm font-medium text-cyan-200"
                >
                  {item.name}
                  <button
                    type="button"
                    onClick={() => removeSelected(item.id)}
                    className="rounded p-0.5 transition-colors hover:bg-cyan-500/30 focus-visible:outline-2 focus-visible:outline-cyan-500"
                    aria-label={`Remover ${item.name}`}
                  >
                    <X size={14} aria-hidden />
                  </button>
                </span>
              ))}
            </div>
          )}

          {loading ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {Array.from({ length: 15 }).map((_, i) => (
                <Skeleton key={i} className="aspect-square rounded-xl" />
              ))}
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="rounded-xl border border-white/10 bg-slate-900/30 py-12 text-center">
              <p className="text-slate-500">
                {search.trim() || categoryFilter !== "ALL"
                  ? "Nenhum item encontrado com esses filtros."
                  : "Nenhum item cadastrado."}
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
                  Limpar filtros
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {filteredItems.map((item) => {
                const isSelected = selectedItems.includes(item.id);
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => toggleItem(item.id)}
                    className={`relative flex aspect-square flex-col items-center justify-center gap-2 rounded-xl border-2 p-3 transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-500 ${
                      isSelected
                        ? "border-cyan-500 bg-cyan-500/10 shadow-[0_0_20px_rgba(6,182,212,0.2)]"
                        : "border-slate-700/80 bg-slate-900/50 hover:border-slate-600 hover:bg-slate-800/50"
                    }`}
                    aria-pressed={isSelected}
                    aria-label={`${item.name}${isSelected ? ", selecionado" : ""}`}
                  >
                    {isSelected && (
                      <span className="absolute right-2 top-2 flex size-6 items-center justify-center rounded-full bg-cyan-500">
                        <Check size={14} className="text-slate-950" aria-hidden />
                      </span>
                    )}
                    <span
                      className={`flex size-11 items-center justify-center rounded-xl text-2xl ${
                        isSelected ? "bg-cyan-500/20" : "bg-slate-800"
                      }`}
                      aria-hidden
                    >
                      {item.category === "FRUIT"
                        ? "🍎"
                        : item.category === "WEAPON"
                          ? "⚔️"
                          : item.category === "SCROLL"
                            ? "📜"
                            : "💎"}
                    </span>
                    <span
                      className={`line-clamp-2 text-center text-xs font-medium leading-tight ${
                        isSelected ? "text-slate-50" : "text-slate-400"
                      }`}
                    >
                      {item.name}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        <div className="sticky bottom-0 border-t border-white/10 bg-slate-950/95 py-4 backdrop-blur sm:py-6">
          <Button
            variant="primary"
            size="lg"
            className="w-full sm:max-w-xs"
            leftIcon={submitting ? undefined : <PackagePlus size={20} />}
            isLoading={submitting}
            disabled={
              selectedItems.length === 0 || atLimit || accountTooNew
            }
            onClick={handleSubmit}
          >
            {submitting ? "Publicando…" : "Publicar oferta"}
          </Button>
        </div>
      </PageContainer>
    </main>
  );
}
