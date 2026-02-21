"use client";

import { useState } from "react";
import { getMarketListings } from "@/app/market/actions";
import { MarketListingGrid } from "@/components/market/market-listing-grid";
import { useLocale } from "@/contexts/LocaleContext";
import { t } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import type { Listing } from "@/types";

export function MarketWithLoadMore({
  initialListings,
  initialHasMore,
}: {
  initialListings: Listing[];
  initialHasMore: boolean;
}) {
  const { locale } = useLocale();
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
            {loading ? t(locale, "common.loading") : t(locale, "market.loadMore")}
          </Button>
        </div>
      )}
    </>
  );
}
