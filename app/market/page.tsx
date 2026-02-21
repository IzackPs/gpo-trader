import { getMarketListings } from "./actions";
import { MarketPageInner } from "./market-page-inner";

/** ISR: revalidar listagem a cada 15s para reduzir carga no Supabase e servir do CDN. */
export const revalidate = 15;

export default async function MarketPage() {
  const { listings: initialListings, hasMore: initialHasMore } =
    await getMarketListings(0);

  return (
    <main>
      <MarketPageInner
        initialListings={initialListings}
        initialHasMore={initialHasMore}
      />
    </main>
  );
}
