import { createClient } from "@/utils/supabase/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ShoppingCart, Package } from "lucide-react";
import { PageContainer } from "@/components/layout/page-container";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { RankBadge } from "@/components/ui/rank-badge";
import type { RankTier } from "@/types";

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

  const { data: rows } = await supabase
    .from("order_book_by_item")
    .select("*")
    .eq("item_id", itemId);

  const orderRows = (rows ?? []) as Row[];
  const asks = orderRows.filter((r) => r.side === "HAVE");
  const bids = orderRows.filter((r) => r.side === "WANT");

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
            Livro de ofertas — quem tem (Asks) e quem quer (Bids)
          </p>
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
              ) : (
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
              )}
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
              ) : (
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
              )}
            </CardContent>
          </Card>
        </div>
      </PageContainer>
    </main>
  );
}
