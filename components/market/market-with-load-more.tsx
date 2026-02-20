"use client";

import { useState } from "react";
import { getMarketListings } from "@/app/market/actions";
import { MarketListingGrid } from "@/components/market/market-listing-grid";
import { Button } from "@/components/ui/button";
import type { Listing } from "@/types";

const LABEL_LOAD_MORE = "Carregar mais ofertas";

export function MarketWithLoadMore({
  initialListings,
  initialHasMore,
}: {
  initialListings: Listing[];
  initialHasMore: boolean;
}) {
  const [listings, setListings] = useState<Listing[]>(initialListings);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [loading, setLoading] = useState(false);

  async function loadMore() {
    if (loading || !hasMore) return;
    setLoading(true);
    const { listings: next, hasMore: more } = await getMarketListings(listings.length);
    setListings((prev) => [...prev, ...next]);
    setHasMore(more);
    setLoading(false);
  }

  return (
    <>
      <MarketListingGrid listings={listings} />
      {hasMore && (
        <div className="col-span-full flex justify-center pt-4">
          <Button
            variant="secondary"
            size="md"
            onClick={loadMore}
            disabled={loading}
            aria-busy={loading}
          >
            {loading ? "A carregar…" : LABEL_LOAD_MORE}
          </Button>
        </div>
      )}
    </>
  );
}
