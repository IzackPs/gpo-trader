import { createClient } from "@/utils/supabase/server";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, FileImage } from "lucide-react";
import { PageContainer } from "@/components/layout/page-container";
import { Card, CardContent } from "@/components/ui/card";
import { DisputeEvidenceForm } from "./dispute-evidence-form";

type Props = { params: Promise<{ id: string }> };

export default async function TradeDisputePage({ params }: Props) {
  const { id: transactionId } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth");

  const { data: transaction } = await supabase
    .from("transactions")
    .select("id, buyer_id, seller_id, status")
    .eq("id", transactionId)
    .single();

  if (!transaction || transaction.status !== "DISPUTED") return notFound();

  const isParticipant =
    user.id === transaction.buyer_id || user.id === transaction.seller_id;
  if (!isParticipant) redirect("/");

  const { data: dispute } = await supabase
    .from("dispute_cases")
    .select("id, reason, status, created_at")
    .eq("transaction_id", transactionId)
    .single();

  if (!dispute) return notFound();

  const { data: evidence } = await supabase
    .from("dispute_evidence")
    .select("id, file_name, file_url, created_at")
    .eq("dispute_id", dispute.id)
    .order("created_at", { ascending: false });

  return (
    <main>
      <PageContainer maxWidth="md" className="space-y-6">
        <Link
          href={`/trades/${transactionId}`}
          className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-slate-50"
        >
          <ArrowLeft size={18} aria-hidden />
          Voltar à sala de troca
        </Link>

        <div>
          <h1 className="text-2xl font-bold text-slate-50">Disputa</h1>
          <p className="mt-1 text-sm text-slate-400">
            Envie prints ou evidências para análise da moderação.
          </p>
        </div>

        <Card className="border-amber-500/30">
          <CardContent className="p-6 space-y-4">
            <p className="text-sm text-slate-300">
              Status: <strong>{dispute.status}</strong>
            </p>
            {dispute.reason && (
              <p className="text-sm text-slate-400">Motivo: {dispute.reason}</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 space-y-4">
            <h2 className="flex items-center gap-2 font-semibold text-slate-50">
              <FileImage size={20} aria-hidden />
              Enviar prova
            </h2>
            <DisputeEvidenceForm disputeId={dispute.id} />
          </CardContent>
        </Card>

        {evidence && evidence.length > 0 && (
          <Card>
            <CardContent className="p-6">
              <h2 className="font-semibold text-slate-50 mb-3">Evidências enviadas</h2>
              <ul className="space-y-2 text-sm text-slate-400">
                {evidence.map((e) => (
                  <li key={e.id}>
                    {e.file_name ?? "Arquivo"} —{" "}
                    <a
                      href={e.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-cyan-400 hover:underline"
                    >
                      Ver
                    </a>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
      </PageContainer>
    </main>
  );
}
