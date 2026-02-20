"use server";

import { createClient } from "@/utils/supabase/server";
import type { Item, ItemCategory } from "@/types";

const CATEGORIES: ItemCategory[] = [
  "FRUIT",
  "WEAPON",
  "SCROLL",
  "ACCESSORY",
];

/**
 * Busca itens no servidor com filtro por nome (ilike) e categoria.
 * Evita carregar milhares de itens no client; o banco faz a pesquisa.
 */
export async function getFilteredItems(
  search?: string,
  category?: ItemCategory | "ALL"
): Promise<Item[]> {
  const supabase = await createClient();

  let query = supabase
    .from("items")
    .select("*")
    .order("category", { ascending: true })
    .order("name", { ascending: true });

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
