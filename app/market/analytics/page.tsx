import { createClientPublic } from "@/utils/supabase/server";
import Link from "next/link";
import { ArrowLeft, TrendingUp } from "lucide-react";
import { PageContainer } from "@/components/layout/page-container";
import { SectionHeader } from "@/components/layout/section-header";
import { Card, CardContent } from "@/components/ui/card";

/** Cache da bolsa: revalidar a cada 60s. Dados vêm de createClientPublic() (sem cookies) para ISR efetivo. */
export const revalidate = 60;

export const metadata = {
  title: "Market / Economy | GPO Trader",
  description: "Weighted average price of items in the last week based on confirmed trades.",
};

type MarketPriceRow = {
  item_id: number;
  item_name: string;
  item_category: string;
  weighted_avg_price: number;
  total_volume: number;
  trade_count: number;
};

export default async function MarketAnalyticsPage() {
  const supabase = createClientPublic();
  const { data: rows, error } = await supabase.rpc("get_market_prices_last_week");

  if (error) {
    console.error("get_market_prices_last_week:", error);
  }

  const prices = (rows ?? []) as MarketPriceRow[];

  return (
    <main>
      <PageContainer maxWidth="lg" className="space-y-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Link
              href="/market"
              className="inline-flex items-center gap-2 text-sm text-slate-400 transition-colors hover:text-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 rounded mb-4"
            >
              <ArrowLeft size={18} aria-hidden /> Back to market
            </Link>
            <SectionHeader
              title="Market / Economy"
              description="Weighted average price (WAP) of items in the last week, based on confirmed trades. Sorted by volume."
            />
          </div>
        </div>

        <Card as="section" aria-label="Last week prices">
          <CardContent className="p-0">
            {prices.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="flex size-16 items-center justify-center rounded-full bg-slate-800 mb-4">
                  <TrendingUp className="text-slate-500" size={32} aria-hidden />
                </div>
                <p className="text-slate-400">
                  No price data for the last week yet. Confirmed trades feed this table.
                </p>
                <Link href="/market" className="mt-4 text-sm text-blue-400 hover:underline">
                  View offers on market
                </Link>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-700 bg-slate-800/50">
                      <th className="px-4 py-3 font-semibold text-slate-300">Item</th>
                      <th className="px-4 py-3 font-semibold text-slate-300">Categoria</th>
                      <th className="px-4 py-3 font-semibold text-slate-300 text-right">Preço médio (WAP)</th>
                      <th className="px-4 py-3 font-semibold text-slate-300 text-right">Volume</th>
                      <th className="px-4 py-3 font-semibold text-slate-300 text-right">Trocas</th>
                    </tr>
                  </thead>
                  <tbody>
                    {prices.map((row) => (
                      <tr key={row.item_id} className="border-b border-slate-800 hover:bg-slate-800/30 transition-colors">
                        <td className="px-4 py-3 font-medium text-slate-100">{row.item_name}</td>
                        <td className="px-4 py-3 text-slate-400">{row.item_category}</td>
                        <td className="px-4 py-3 text-slate-200 text-right tabular-nums">
                          {row.weighted_avg_price.toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-slate-300 text-right tabular-nums">
                          {row.total_volume.toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-slate-400 text-right tabular-nums">
                          {Number(row.trade_count)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </PageContainer>
    </main>
  );
}
