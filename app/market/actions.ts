"use server";

import { createClientPublic } from "@/utils/supabase/server";
import type { Item, Listing } from "@/types";

export type ItemMarketStats = {
  weighted_avg_price: number;
  total_volume: number;
  trade_count: number;
};

export type GetItemWithMarketStatsResult = {
  item: Item | null;
  marketStats: ItemMarketStats | null;
};

/**
 * Retorna um item por ID e suas estatísticas de mercado (WAP, volume, trocas) da última semana.
 * Usado no submenu de detalhes do item.
 */
export async function getItemWithMarketStats(
  itemId: number
): Promise<GetItemWithMarketStatsResult> {
  const supabase = createClientPublic();

  const { data: item, error: itemError } = await supabase
    .from("items")
    .select("*")
    .eq("id", itemId)
    .single();

  if (itemError || !item) {
    return { item: null, marketStats: null };
  }

  const { data: rows } = await supabase.rpc("get_market_prices_last_week");
  const prices = (rows ?? []) as Array<{
    item_id: number;
    weighted_avg_price: number;
    total_volume: number;
    trade_count: number;
  }>;
  const marketRow = prices.find((r) => r.item_id === itemId) ?? null;

  return {
    item: item as Item,
    marketStats: marketRow
      ? {
          weighted_avg_price: marketRow.weighted_avg_price,
          total_volume: marketRow.total_volume,
          trade_count: marketRow.trade_count,
        }
      : null,
  };
}

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
