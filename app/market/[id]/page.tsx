import { createClient } from "@/utils/supabase/server";
import { notFound, redirect } from "next/navigation";
import { ListingDetailContent } from "./listing-detail-content";

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
    <ListingDetailContent
      listing={listing}
      itemsArray={itemsArray}
      itemsDetails={itemsDetails}
      isOwner={isOwner}
      isOpen={isOpen}
      deleteListing={deleteListing}
      acceptOffer={acceptOffer}
    />
  );
}