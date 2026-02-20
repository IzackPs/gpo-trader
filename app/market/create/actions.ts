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

export type GetFilteredItemsResult = { items: Item[]; hasMore: boolean };

/**
 * Busca itens no servidor com filtro por nome (ilike) e categoria, com paginação.
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
    const safeSearch = searchTrim.replace(/[%_\\]/g, "\\$&");
    query = query.ilike("name", `%${safeSearch}%`);
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
