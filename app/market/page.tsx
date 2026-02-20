import { PlusCircle, TrendingUp } from "lucide-react";
import Link from "next/link";
import { PageContainer } from "@/components/layout/page-container";
import { SectionHeader } from "@/components/layout/section-header";
import { Button } from "@/components/ui/button";
import { MarketClient } from "./market-client";
import { MarketWithLoadMore } from "@/components/market/market-with-load-more";
import { PresenceProvider } from "@/components/market/presence-provider";
import { getMarketListings } from "./actions";

/** ISR: revalidar listagem a cada 15s para reduzir carga no Supabase e servir do CDN. */
export const revalidate = 15;

export default async function MarketPage() {
  const { listings: initialListings, hasMore: initialHasMore } =
    await getMarketListings(0);

  return (
    <main>
      <PresenceProvider>
        <PageContainer maxWidth="lg" className="space-y-8">
          <SectionHeader
            title="Mercado global"
            description="Ofertas recentes de jogadores verificados."
            actions={
              <div className="flex flex-wrap items-center gap-2">
                <Link href="/market/analytics">
                  <Button variant="secondary" size="md" leftIcon={<TrendingUp size={18} />}>
                    Bolsa / Economia
                  </Button>
                </Link>
                <Link href="/market/create">
                  <Button variant="primary" size="md" leftIcon={<PlusCircle size={20} />}>
                    Criar oferta
                  </Button>
                </Link>
              </div>
            }
          />

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <MarketWithLoadMore
              initialListings={initialListings}
              initialHasMore={initialHasMore}
            />
          </div>
        </PageContainer>
        <MarketClient />
      </PresenceProvider>
    </main>
  );
}
