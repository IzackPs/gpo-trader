import { createClient } from "@/utils/supabase/server";
import { ArrowRightLeft, PlusCircle } from "lucide-react";
import Link from "next/link";
import { PageContainer } from "@/components/layout/page-container";
import { SectionHeader } from "@/components/layout/section-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ListingCard } from "@/components/market/listing-card";
import type { Listing } from "@/types";

export default async function MarketPage() {
  const supabase = await createClient();

  const { data: rawListings, error } = await supabase
    .from("listings")
    .select(`
      *,
      profiles (username, avatar_url, reputation_score, rank_tier)
    `)
    .eq("status", "OPEN")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Erro Supabase:", error);
  }

  const listings = (rawListings ?? []) as Listing[];

  return (
    <main>
      <PageContainer maxWidth="lg" className="space-y-8">
        <SectionHeader
          title="Mercado global"
          description="Ofertas recentes de jogadores verificados."
          actions={
            <Link href="/market/create">
              <Button variant="primary" size="md" leftIcon={<PlusCircle size={20} />}>
                Criar oferta
              </Button>
            </Link>
          }
        />

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {listings.length === 0 ? (
            <Card
              as="section"
              className="col-span-full flex flex-col items-center justify-center border-dashed py-16 text-center"
              aria-label="Estado vazio"
            >
              <CardContent className="flex flex-col items-center gap-4 p-0">
                <div className="flex size-16 items-center justify-center rounded-full bg-slate-800">
                  <ArrowRightLeft className="text-slate-500" size={32} aria-hidden />
                </div>
                <div className="space-y-1">
                  <h2 className="text-xl font-semibold text-slate-50">
                    O mercado está vazio
                  </h2>
                  <p className="text-slate-500">
                    Seja o primeiro a listar um item e ganhe reputação.
                  </p>
                </div>
                <Link href="/market/create">
                  <Button variant="primary" size="md">
                    Criar primeira oferta
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            listings.map((listing) => (
              <ListingCard key={listing.id} listing={listing} />
            ))
          )}
        </div>
      </PageContainer>
    </main>
  );
}
