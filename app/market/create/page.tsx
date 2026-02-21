import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { PageContainer } from "@/components/layout/page-container";
import { CreateListingForm } from "./create-listing-form";
import { CreatePageHeader } from "./create-page-header";
import { TIER_LIMITS } from "@/types";
import type { Item, RankTier } from "@/types";

export default async function CreateListingPage() {
  const supabase = await createClient();

  // Verificar autenticação
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth");
  }

  // Buscar dados em paralelo (Server Component)
  const [itemsRes, profileRes, countRes] = await Promise.all([
    supabase
      .from("items")
      .select("*")
      .eq("is_active", true)
      .order("category", { ascending: true })
      .order("name", { ascending: true })
      .limit(50),
    supabase
      .from("profiles")
      .select("rank_tier, account_age_days, strikes")
      .eq("id", user.id)
      .single(),
    supabase
      .from("listings")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("status", "OPEN"),
  ]);

  // Tratamento de erros
  if (itemsRes.error) {
    throw new Error(`Erro ao buscar itens: ${itemsRes.error.message}`);
  }

  if (profileRes.error || !profileRes.data) {
    throw new Error(
      `Erro ao buscar perfil: ${profileRes.error?.message || "Perfil não encontrado"}`
    );
  }

  const items = (itemsRes.data as Item[]) || [];
  const rankTier = (profileRes.data.rank_tier as RankTier) || "DRIFTER";
  const accountAgeDays = profileRes.data.account_age_days || 0;
  const strikes = profileRes.data.strikes ?? 0;
  const openListingsCount = countRes.count || 0;
  const maxListings = TIER_LIMITS[rankTier].maxListings;

  return (
    <main>
      <PageContainer maxWidth="lg" className="space-y-6">
        <CreatePageHeader
          openListingsCount={openListingsCount}
          maxListings={maxListings}
        />

        <CreateListingForm
          items={items}
          rankTier={rankTier}
          accountAgeDays={accountAgeDays}
          strikes={strikes}
          openListingsCount={openListingsCount}
          maxListings={maxListings}
        />
      </PageContainer>
    </main>
  );
}
