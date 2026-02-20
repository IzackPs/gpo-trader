"use server";

import { createClientPublic } from "@/utils/supabase/server";
import type { Listing } from "@/types";

const MARKET_PAGE_SIZE = 24;

export type GetMarketListingsResult = {
  listings: Listing[];
  hasMore: boolean;
};

/**
 * Listagem paginada do mercado (ofertas OPEN).
 * Usado para "Carregar mais" na página /market.
 */
export async function getMarketListings(
  offset = 0
): Promise<GetMarketListingsResult> {
  const supabase = createClientPublic();

  const { data: rawListings, error } = await supabase
    .from("listings")
    .select(
      `
      *,
      profiles (username, avatar_url, reputation_score, rank_tier, last_seen_at)
    `
    )
    .eq("status", "OPEN")
    .order("created_at", { ascending: false })
    .range(offset, offset + MARKET_PAGE_SIZE - 1);

  if (error) {
    console.error("getMarketListings:", error);
    return { listings: [], hasMore: false };
  }

  const listings = (rawListings ?? []) as Listing[];
  return {
    listings,
    hasMore: listings.length === MARKET_PAGE_SIZE,
  };
}
