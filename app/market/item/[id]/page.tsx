import { createClient } from "@/utils/supabase/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ShoppingCart, Package } from "lucide-react";
import { PageContainer } from "@/components/layout/page-container";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { RankBadge } from "@/components/ui/rank-badge";
import type { RankTier } from "@/types";

const ORDER_BOOK_PAGE_SIZE = 50;
const FETCH_SIZE = ORDER_BOOK_PAGE_SIZE + 1; // Pedir 51: se vier 51, há próxima página (evita off-by-one)

type Row = {
  item_id: number;
  item_name: string;
  item_category: string;
  side: string;
  listing_id: string;
  user_id: string;
  listing_status: string;
  created_at: string;
  username: string | null;
  rank_tier: RankTier | null;
  reputation_score: number | null;
  qty: number;
};

export default async function OrderBookItemPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const itemId = parseInt(id, 10);
  if (Number.isNaN(itemId)) return notFound();

  const supabase = await createClient();

  const { data: item } = await supabase
    .from("items")
    .select("id, name, category")
    .eq("id", itemId)
    .single();

  if (!item) return notFound();

  const [asksRes, bidsRes] = await Promise.all([
    supabase
      .from("order_book_by_item")
      .select("*")
      .eq("item_id", itemId)
      .eq("side", "HAVE")
      .order("created_at", { ascending: false })
      .limit(FETCH_SIZE),
    supabase
      .from("order_book_by_item")
      .select("*")
      .eq("item_id", itemId)
      .eq("side", "WANT")
      .order("created_at", { ascending: false })
      .limit(FETCH_SIZE),
  ]);

  const rawAsks = (asksRes.data ?? []) as Row[];
  const rawBids = (bidsRes.data ?? []) as Row[];
  const hasMoreAsks = rawAsks.length > ORDER_BOOK_PAGE_SIZE;
  const hasMoreBids = rawBids.length > ORDER_BOOK_PAGE_SIZE;
  const asks = hasMoreAsks ? rawAsks.slice(0, ORDER_BOOK_PAGE_SIZE) : rawAsks;
  const bids = hasMoreBids ? rawBids.slice(0, ORDER_BOOK_PAGE_SIZE) : rawBids;

  return (
    <main>
      <PageContainer maxWidth="lg" className="space-y-8">
        <Link
          href="/market"
          className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-slate-50"
        >
          <ArrowLeft size={18} aria-hidden />
          Voltar ao mercado
        </Link>

        <div>
          <h1 className="text-2xl font-bold text-slate-50 sm:text-3xl">
            {item.name}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Livro de ofertas — quem tem (Asks) e quem quer (Bids). Exibindo até{" "}
            {ORDER_BOOK_PAGE_SIZE} por lado.
          </p>
          {/* Escalabilidade futura: paginação (.range(offset, offset+limit)), "Carregar mais" ou infinite scroll; Supabase Realtime para novas ofertas sem recarregar. */}
        </div>

        <div className="grid gap-8 lg:grid-cols-2">
          <Card>
            <CardContent className="p-6">
              <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-50">
                <Package size={20} className="text-emerald-400" aria-hidden />
                Quem tem (Asks)
              </h2>
              {asks.length === 0 ? (
                <p className="text-sm text-slate-500">Nenhuma oferta de venda no momento.</p>
              ) : hasMoreAsks ? (
                <p className="mb-2 text-xs text-slate-500">
                  Mostrando as {ORDER_BOOK_PAGE_SIZE} mais recentes. Há mais ofertas disponíveis.
                </p>
              ) : null}
              {asks.length > 0 ? (
                <ul className="space-y-3">
                  {asks.map((r) => (
                    <li key={r.listing_id}>
                      <Link
                        href={`/market/${r.listing_id}`}
                        className="flex items-center gap-3 rounded-lg border border-white/10 p-3 transition-colors hover:bg-white/5"
                      >
                        <Avatar className="size-10 shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-slate-100">{r.username ?? "—"}</p>
                          <p className="text-xs text-slate-500">
                            Qtd: {r.qty} · Rep: {(r.reputation_score ?? 0).toFixed(0)}
                          </p>
                        </div>
                        {r.rank_tier && (
                          <RankBadge tier={r.rank_tier} showLabel={false} />
                        )}
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-50">
                <ShoppingCart size={20} className="text-amber-400" aria-hidden />
                Quem quer (Bids)
              </h2>
              {bids.length === 0 ? (
                <p className="text-sm text-slate-500">Nenhuma oferta de compra no momento.</p>
              ) : hasMoreBids ? (
                <p className="mb-2 text-xs text-slate-500">
                  Mostrando as {ORDER_BOOK_PAGE_SIZE} mais recentes. Há mais ofertas disponíveis.
                </p>
              ) : null}
              {bids.length > 0 ? (
                <ul className="space-y-3">
                  {bids.map((r) => (
                    <li key={r.listing_id}>
                      <Link
                        href={`/market/${r.listing_id}`}
                        className="flex items-center gap-3 rounded-lg border border-white/10 p-3 transition-colors hover:bg-white/5"
                      >
                        <Avatar className="size-10 shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-slate-100">{r.username ?? "—"}</p>
                          <p className="text-xs text-slate-500">
                            Qtd: {r.qty} · Rep: {(r.reputation_score ?? 0).toFixed(0)}
                          </p>
                        </div>
                        {r.rank_tier && (
                          <RankBadge tier={r.rank_tier} showLabel={false} />
                        )}
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </PageContainer>
    </main>
  );
}
