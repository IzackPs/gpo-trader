import { createClient } from "@/utils/supabase/server";
import {
  Check,
  CheckCircle2,
  Clock,
  ShieldCheck,
  XCircle,
  AlertTriangle,
} from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import TradeChat from "@/components/TradeChat";
import { PageContainer } from "@/components/layout/page-container";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default async function TradeRoomPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const { data: transaction, error } = await supabase
    .from("transactions")
    .select(`*, buyer:buyer_id(*), seller:seller_id(*)`)
    .eq("id", id)
    .single();

  if (error || !transaction) return notFound();

  const isBuyer = user.id === transaction.buyer_id;
  const isSeller = user.id === transaction.seller_id;
  if (!isBuyer && !isSeller) redirect("/");

  const myConfirmation = isBuyer
    ? transaction.buyer_confirmed
    : transaction.seller_confirmed;
  const otherConfirmation = isBuyer
    ? transaction.seller_confirmed
    : transaction.buyer_confirmed;
  const isComplete =
    transaction.buyer_confirmed && transaction.seller_confirmed;
  const isDisputed = transaction.status === "DISPUTED";

  const buyerAgreed = Boolean(transaction.buyer_agreed_items);
  const sellerAgreed = Boolean(transaction.seller_agreed_items);
  const itemsAgreed = buyerAgreed && sellerAgreed;
  const myAgreed = isBuyer ? buyerAgreed : sellerAgreed;

  async function agreeItems() {
    "use server";
    const sb = await createClient();
    const update = isBuyer
      ? { buyer_agreed_items: true }
      : { seller_agreed_items: true };
    await sb.from("transactions").update(update).eq("id", id);
    redirect(`/trades/${id}`);
  }

  async function confirmTrade() {
    "use server";
    const sb = await createClient();
    const updateData = isBuyer
      ? { buyer_confirmed: true }
      : { seller_confirmed: true };
    await sb.from("transactions").update(updateData).eq("id", id);
    if (otherConfirmation) {
      await sb
        .from("transactions")
        .update({ status: "CONFIRMED" })
        .eq("id", id);
    }
    redirect(`/trades/${id}`);
  }

  async function disputeTrade() {
    "use server";
    const sb = await createClient();
    const { error } = await sb.rpc("open_dispute", {
      p_transaction_id: id,
      p_reason: "Disputa acionada pela parte",
    });
    if (error) console.error("open_dispute:", error);
    redirect(`/trades/${id}`);
  }

  return (
    <main>
      <PageContainer maxWidth="md" className="space-y-8">
        <div className="text-center">
          <h1 className="flex flex-wrap items-center justify-center gap-2 text-2xl font-bold sm:gap-3 sm:text-3xl">
            {isDisputed ? (
              <span className="flex items-center gap-2 text-amber-400">
                <AlertTriangle size={28} aria-hidden />
                Disputa reportada
              </span>
            ) : isComplete ? (
              <span className="flex items-center gap-2 text-emerald-400">
                <CheckCircle2 size={28} aria-hidden />
                Troca concluída!
              </span>
            ) : (
              <span className="flex items-center gap-2 text-blue-400">
                <Clock size={28} aria-hidden />
                Troca em andamento
              </span>
            )}
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            ID: <span className="font-mono text-xs">{id}</span>
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <Card
            className={
              transaction.seller_confirmed
                ? "border-emerald-500/50 bg-emerald-950/30"
                : ""
            }
          >
            <CardContent className="flex flex-col gap-4 p-6">
              <div className="flex items-center gap-4">
                <Avatar
                  src={transaction.seller?.avatar_url ?? undefined}
                  className="size-12 border-2 border-slate-700"
                />
                <div>
                  <p className="text-xs font-semibold uppercase text-slate-500">
                    Vendedor
                  </p>
                  <p className="font-semibold text-slate-50">
                    {transaction.seller?.username ?? "Vendedor"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {transaction.seller_confirmed ? (
                  <span className="flex items-center gap-1 text-sm font-semibold text-emerald-400">
                    <Check size={16} aria-hidden /> Confirmado
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-sm text-slate-500">
                    <Clock size={16} aria-hidden /> Aguardando…
                  </span>
                )}
              </div>
            </CardContent>
          </Card>

          <Card
            className={
              transaction.buyer_confirmed
                ? "border-emerald-500/50 bg-emerald-950/30"
                : ""
            }
          >
            <CardContent className="flex flex-col gap-4 p-6">
              <div className="flex items-center gap-4">
                <Avatar
                  src={transaction.buyer?.avatar_url ?? undefined}
                  className="size-12 border-2 border-slate-700"
                />
                <div>
                  <p className="text-xs font-semibold uppercase text-slate-500">
                    Comprador
                  </p>
                  <p className="font-semibold text-slate-50">
                    {transaction.buyer?.username ?? "Comprador"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {transaction.buyer_confirmed ? (
                  <span className="flex items-center gap-1 text-sm font-semibold text-emerald-400">
                    <Check size={16} aria-hidden /> Confirmado
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-sm text-slate-500">
                    <Clock size={16} aria-hidden /> Aguardando…
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {!itemsAgreed && !isComplete && !isDisputed && (
          <Card className="border-cyan-500/30 bg-cyan-950/20">
            <CardContent className="space-y-4 p-6">
              <h2 className="text-lg font-bold text-slate-50">
                Acordar itens da troca
              </h2>
              <p className="text-sm text-slate-400">
                Confirme que os itens da troca estão corretos. Depois que ambos confirmarem, o chat será liberado para combinar detalhes no jogo.
              </p>
              {myAgreed ? (
                <p className="rounded-lg bg-cyan-500/20 px-4 py-2 text-sm text-cyan-300">
                  Você já confirmou os itens. Aguardando a outra parte…
                </p>
              ) : (
                <form action={agreeItems}>
                  <Button type="submit" variant="primary" size="md">
                    Confirmar itens
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        )}

        {itemsAgreed && !isComplete && !isDisputed && (
          <TradeChat
            transactionId={id}
            currentUserId={user.id}
            participants={{
              [transaction.buyer_id]: transaction.buyer?.username ?? "Comprador",
              [transaction.seller_id]: transaction.seller?.username ?? "Vendedor",
            }}
          />
        )}

        {!isComplete && !isDisputed && (
          <Card>
            <CardContent className="space-y-4 p-8 text-center">
              <h2 className="text-xl font-bold text-slate-50">
                {isBuyer
                  ? "Você já recebeu os itens?"
                  : "Você já enviou os itens?"}
              </h2>
              {myConfirmation ? (
                <p className="rounded-lg bg-blue-500/10 px-4 py-3 text-blue-300">
                  Você já confirmou. Aguardando a outra pessoa…
                </p>
              ) : (
                <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
                  <form action={confirmTrade}>
                    <Button
                      type="submit"
                      variant="primary"
                      size="lg"
                      leftIcon={<ShieldCheck size={24} />}
                      className="w-full sm:w-auto"
                    >
                      {isBuyer ? "Sim, recebi tudo!" : "Sim, enviei tudo!"}
                    </Button>
                  </form>
                  <form action={disputeTrade}>
                    <Button
                      type="submit"
                      variant="outline"
                      size="lg"
                      leftIcon={<XCircle size={20} />}
                      className="w-full border-amber-500/50 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 sm:w-auto"
                    >
                      Não realizou / Golpe
                    </Button>
                  </form>
                </div>
              )}
              <p className="mx-auto max-w-md text-xs text-slate-500">
                Ao confirmar, você declara que a troca foi feita no jogo. Em
                caso de golpe, use &quot;Não realizou / Golpe&quot; — a disputa
                será analisada.
              </p>
            </CardContent>
          </Card>
        )}

        {isComplete && (
          <Card className="border-emerald-500/50 bg-emerald-500 text-slate-950">
            <CardContent className="p-8 text-center">
              <h2 className="text-2xl font-bold">Negócio fechado!</h2>
              <p className="mt-2 font-medium">
                Ambas as partes confirmaram. A reputação foi atualizada.
              </p>
              <Link href="/market" className="mt-6 inline-block">
                <Button
                  variant="secondary"
                  size="lg"
                  className="bg-slate-900 text-white hover:bg-slate-800"
                >
                  Voltar ao mercado
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}

        {isDisputed && (
          <>
            <Card className="border-amber-500/50 bg-amber-500/10">
              <CardContent className="space-y-4 p-8 text-center">
                <h2 className="text-xl font-bold text-amber-200">
                  Disputa em análise
                </h2>
                <p className="text-sm text-slate-300">
                  O chat foi bloqueado. Nenhuma reputação foi atribuída. Um caso foi aberto para a moderação.
                </p>
                <p className="text-sm text-slate-400">
                  Você pode enviar prints ou provas em <strong>Disputa</strong> (em breve: upload de evidências).
                </p>
                <Link href={`/trades/${id}/dispute`} className="inline-block">
                  <Button variant="outline" size="lg" className="border-amber-500/50 text-amber-400">
                    Ver disputa e enviar provas
                  </Button>
                </Link>
                <Link href="/market" className="mt-4 block">
                  <Button variant="secondary" size="lg">
                    Voltar ao mercado
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </>
        )}
      </PageContainer>
    </main>
  );
}
