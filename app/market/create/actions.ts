"use server";

import { createClient } from "@/utils/supabase/server";
import type { Item, ItemCategory } from "@/types";

const CATEGORIES: ItemCategory[] = [
  "FRUIT",
  "WEAPON",
  "SCROLL",
  "ACCESSORY",
];

/** Tamanho da página na paginação (permite "Carregar mais" e evita limite cego). */
const ITEMS_PAGE_SIZE = 50;
/** Comprimento máximo do termo de busca (evita abuso e queries pesadas). */
const SEARCH_MAX_LENGTH = 150;

/** Rate limit: máx. ofertas criadas por usuário nos últimos N minutos. */
const LISTING_RATE_LIMIT_WINDOW_MINUTES = 5;
const LISTING_RATE_LIMIT_MAX = 3;

export type GetFilteredItemsResult = { items: Item[]; hasMore: boolean };

/**
 * Busca itens no servidor com filtro por nome (Full Text Search em name_tsv, migração 00021) e categoria, com paginação.
 * Debounce no frontend (300ms) antes de chamar reduz chamadas ao pesquisar.
 */
export async function getFilteredItems(
  search?: string,
  category?: ItemCategory | "ALL",
  offset = 0
): Promise<GetFilteredItemsResult> {
  const supabase = await createClient();

  let query = supabase
    .from("items")
    .select("*")
    .eq("is_active", true)
    .order("category", { ascending: true })
    .order("name", { ascending: true })
    .range(offset, offset + ITEMS_PAGE_SIZE - 1);

  const searchTrim = search?.trim().slice(0, SEARCH_MAX_LENGTH);
  if (searchTrim) {
    // Full Text Search na coluna name_tsv (migração 00021). Requer que a migração esteja aplicada.
    query = query.textSearch("name_tsv", searchTrim, {
      type: "plain",
      config: "portuguese",
    });
  }

  if (category && category !== "ALL" && CATEGORIES.includes(category)) {
    query = query.eq("category", category);
  }

  const { data, error } = await query;

  if (error) {
    console.error("getFilteredItems:", error);
    return { items: [], hasMore: false };
  }

  const items = (data as Item[]) ?? [];
  return { items, hasMore: items.length === ITEMS_PAGE_SIZE };
}

export type CreateListingResult = { error?: string; listingId?: string };

/**
 * Cria oferta com rate limit (máx. LISTING_RATE_LIMIT_MAX por LISTING_RATE_LIMIT_WINDOW_MINUTES).
 */
export async function createListing(
  side: "HAVE" | "WANT",
  selectedItemIds: number[]
): Promise<CreateListingResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado." };
  if (selectedItemIds.length === 0) return { error: "Selecione pelo menos 1 item." };

  const windowStart = new Date(Date.now() - LISTING_RATE_LIMIT_WINDOW_MINUTES * 60 * 1000).toISOString();
  const { count, error: countError } = await supabase
    .from("listings")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .gte("created_at", windowStart);

  if (countError || (count ?? 0) >= LISTING_RATE_LIMIT_MAX) {
    return {
      error:
        "Muitas ofertas criadas nos últimos minutos. Aguarde antes de criar outra.",
    };
  }

  const { data: newListing, error: insertListingError } = await supabase
    .from("listings")
    .insert({
      user_id: user.id,
      side,
      items: [],
      status: "OPEN",
    })
    .select("id")
    .single();

  if (insertListingError || !newListing?.id) {
    return { error: insertListingError?.message ?? "Erro ao criar oferta." };
  }

  const { error: insertItemsError } = await supabase.from("listing_items").insert(
    selectedItemIds.map((item_id) => ({
      listing_id: newListing.id,
      item_id,
      qty: 1,
    }))
  );

  if (insertItemsError) {
    return { error: insertItemsError.message };
  }

  return { listingId: newListing.id };
}
