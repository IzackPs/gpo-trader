import { createClient } from "@/utils/supabase/server";
import { ArrowLeft, Trash2, ShieldCheck, AlertTriangle, MessageCircle } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { PageContainer } from "@/components/layout/page-container";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

// TIPO ATUALIZADO PARA NEXT.JS 15
type Props = {
  params: Promise<{ id: string }>;
};

export default async function ListingDetailPage({ params }: Props) {
  // 1. DESEMBRULHAR A PROMESSA (O FIX DO ERRO)
  const { id } = await params;

  const supabase = await createClient();
  
  // 2. Pegar usuário atual
  const { data: { user } } = await supabase.auth.getUser();

  // 3. Buscar a Oferta pelo ID (agora usando a variável 'id' correta)
  const { data: listing, error } = await supabase
    .from("listings")
    .select(`
      *,
      profiles (username, avatar_url, reputation_score, rank_tier)
    `)
    .eq("id", id)
    .single();

  if (error || !listing) {
    return notFound();
  }

  // 4. Buscar detalhes dos itens
  // O listing.items é um JSON, precisamos garantir que é um array
  const itemsArray = Array.isArray(listing.items) ? listing.items : [];
  const itemIds = itemsArray.map((i: { item_id: number }) => i.item_id);
  
  // Se não tiver itens (erro de dado antigo), evita crash
  const { data: itemsDetails } = itemIds.length > 0 
    ? await supabase.from("items").select("*").in("id", itemIds)
    : { data: [] };

  const isOwner = user?.id === listing.user_id;
  const isOpen = listing.status === "OPEN";

  // AÇÃO: Deletar Oferta
  async function deleteListing() {
    "use server";
    const sb = await createClient();
    await sb.from("listings").delete().eq("id", id);
    redirect("/market");
  }

// AÇÃO: Aceitar Oferta (atômica via RPC — evita race e listing órfã)
  async function acceptOffer() {
    "use server";
    const sb = await createClient();
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return redirect("/auth");

    const { data: transactionId, error } = await sb.rpc("accept_listing_offer", {
      p_listing_id: id,
      p_buyer_id: user.id,
    });

    if (error) {
      console.error("Erro ao aceitar oferta:", error.message);
      return;
    }
    redirect(`/trades/${transactionId}`);
  }

  return (
    <main>
      <PageContainer maxWidth="md" className="space-y-8">
      <Link
        href="/market"
        className="inline-flex items-center gap-2 text-sm text-slate-400 transition-colors hover:text-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-500 rounded"
      >
        <ArrowLeft size={18} aria-hidden /> Voltar ao mercado
      </Link>

      <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
        <div className="space-y-6 md:col-span-1">
          <Card>
            <CardContent className="flex flex-col items-center pt-6 text-center">
            <Avatar
              src={listing.profiles?.avatar_url ?? undefined}
              className="mx-auto mb-4 size-24 border-4 border-slate-800"
            />
            <h2 className="text-xl font-bold text-white">{listing.profiles?.username}</h2>
            <div className="flex justify-center items-center gap-2 mt-2 text-sm text-slate-400">
              <ShieldCheck size={16} className="text-emerald-500" />
              Tier: {listing.profiles?.rank_tier}
            </div>
            <div className="mt-4 rounded-lg bg-slate-950 p-3">
              <p className="text-xs font-semibold uppercase text-slate-500">Reputação</p>
              <p className="text-2xl font-mono text-emerald-400">{(listing.profiles?.reputation_score ?? 0).toFixed(0)}</p>
            </div>
            </CardContent>
          </Card>

          <div className="flex gap-3 rounded-lg border border-amber-700/50 bg-amber-500/10 p-4">
            <AlertTriangle className="text-yellow-500 shrink-0" />
            <p className="text-xs text-yellow-200/80">
              Nunca passe senhas. Negocie apenas itens dentro do jogo.
            </p>
          </div>
        </div>

        <div className="md:col-span-2">
          <Card>
            <CardContent className="pt-6">
            <div className="mb-6 flex items-center justify-between">
              <h1 className="text-2xl font-bold text-slate-50">Itens da oferta</h1>
              <Badge variant={listing.side === "HAVE" ? "have" : "want"}>
                {listing.side === "HAVE" ? "Vendendo" : "Comprando"}
              </Badge>
            </div>

            <div className="space-y-3">
              {itemsArray.map((entry: { item_id: number; qty?: number }, index: number) => {
                const item = itemsDetails?.find((i: { id: number }) => i.id === entry.item_id);
                const discontinued = !item || item.is_active === false;
                return (
                  <div
                    key={`${entry.item_id}-${index}`}
                    className={`flex items-center gap-4 rounded-lg border p-4 ${
                      discontinued ? "border-amber-800/50 bg-amber-500/5" : "border-slate-800 bg-slate-950"
                    }`}
                  >
                    <div className="flex size-12 items-center justify-center rounded-full bg-slate-800 text-2xl">
                      {item?.category === "FRUIT" ? "🍎" : "⚔️"}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-bold text-white">
                        {discontinued ? (
                          <span className="text-amber-400/90">
                            {item?.name ?? "Item"}{" "}
                            <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-xs font-normal text-amber-300">
                              [Descontinuado]
                            </span>
                          </span>
                        ) : (
                          item?.name
                        )}
                      </h3>
                      <p className="text-xs text-slate-400">{item?.category ?? "—"}</p>
                    </div>
                    {!discontinued && (
                      <div className="ml-auto text-right">
                        <p className="text-sm font-mono text-emerald-400">{item?.market_value_leg_chests} 💎</p>
                      </div>
                    )}
                  </div>
                );
              })}
              {itemsArray.length === 0 && (
                <p className="py-4 text-center text-slate-500">Nenhum item nesta oferta.</p>
              )}
            </div>
            </CardContent>
          </Card>

          <div className="flex gap-4">
            {isOwner && isOpen && (
              <form action={deleteListing} className="w-full">
                <Button
                  type="submit"
                  variant="danger"
                  size="lg"
                  className="w-full"
                  leftIcon={<Trash2 size={20} />}
                >
                  Excluir oferta
                </Button>
              </form>
            )}
            {!isOwner && isOpen && (
              <form action={acceptOffer} className="w-full">
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  className="w-full"
                  leftIcon={<MessageCircle size={20} />}
                >
                  Aceitar troca
                </Button>
              </form>
            )}
          </div>
        </div>
      </div>
      </PageContainer>
    </main>
  );
}