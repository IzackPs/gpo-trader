import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/utils/supabase/server";
import { PageContainer } from "@/components/layout/page-container";
import { CreateListingForm } from "./create-listing-form";
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
      .order("name", { ascending: true }),
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
        <Link
          href="/market"
          className="inline-flex items-center gap-2 text-sm text-slate-400 transition-colors hover:text-slate-50 focus-visible:rounded focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-500"
        >
          <ArrowLeft size={18} aria-hidden />
          Voltar para o mercado
        </Link>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-50 sm:text-3xl">
              Nova oferta
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Escolha o tipo de oferta e os itens. Máximo 4 itens por oferta.
            </p>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <span>Ofertas ativas:</span>
            <span className="font-medium tabular-nums text-slate-300">
              {openListingsCount}/{maxListings}
            </span>
          </div>
        </div>

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
