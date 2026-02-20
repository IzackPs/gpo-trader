"use server";

import { createClient } from "@/utils/supabase/server";
import type { Item, ItemCategory } from "@/types";

const CATEGORIES: ItemCategory[] = [
  "FRUIT",
  "WEAPON",
  "SCROLL",
  "ACCESSORY",
];

/** Limite máximo de itens por busca (evita sobrecarga com catálogo grande). */
const ITEMS_QUERY_LIMIT = 200;

/**
 * Busca itens no servidor com filtro por nome (ilike) e categoria.
 * Limitado a ITEMS_QUERY_LIMIT para escalabilidade.
 */
export async function getFilteredItems(
  search?: string,
  category?: ItemCategory | "ALL"
): Promise<Item[]> {
  const supabase = await createClient();

  let query = supabase
    .from("items")
    .select("*")
    .eq("is_active", true)
    .order("category", { ascending: true })
    .order("name", { ascending: true })
    .limit(ITEMS_QUERY_LIMIT);

  const searchTrim = search?.trim();
  if (searchTrim) {
    query = query.ilike("name", `%${searchTrim}%`);
  }

  if (category && category !== "ALL" && CATEGORIES.includes(category)) {
    query = query.eq("category", category);
  }

  const { data, error } = await query;

  if (error) {
    console.error("getFilteredItems:", error);
    return [];
  }

  return (data as Item[]) ?? [];
}
