import { createClient } from "@/utils/supabase/server";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageContainer } from "@/components/layout/page-container";
import { Card, CardContent } from "@/components/ui/card";
import { DisputeResolveForm } from "./dispute-resolve-form";

const STATUS_LABELS: Record<string, string> = {
  OPEN: "Aberta",
  UNDER_REVIEW: "Em análise",
  RESOLVED: "Resolvida",
  CLOSED: "Encerrada",
};

type Props = { params: Promise<{ id: string }> };

export default async function AdminDisputeDetailPage({ params }: Props) {
  const { id: disputeId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth");

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin) redirect("/forbidden");

  const { data: dispute } = await supabase
    .from("dispute_cases")
    .select("*")
    .eq("id", disputeId)
    .single();

  if (!dispute) return notFound();

  const { data: transaction } = await supabase
    .from("transactions")
    .select("id, buyer_id, seller_id, status, listing_id, created_at")
    .eq("id", dispute.transaction_id)
    .single();

  const { data: evidence } = await supabase
    .from("dispute_evidence")
    .select("id, file_name, file_url, created_at")
    .eq("dispute_id", disputeId)
    .order("created_at", { ascending: false });

  const { data: reporter } = await supabase
    .from("profiles")
    .select("username, avatar_url")
    .eq("id", dispute.reported_by)
    .single();

  return (
    <main>
      <PageContainer maxWidth="lg" className="space-y-6 py-8">
        <Link
          href="/admin/disputes"
          className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-500 rounded"
        >
          <ArrowLeft size={18} aria-hidden /> Voltar à lista
        </Link>

        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-50">
            Disputa — Resolver
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Transação: {transaction?.id?.slice(0, 8)}… | Reportado por: {reporter?.username ?? dispute.reported_by.slice(0, 8)}…
          </p>
        </div>

        <Card className="border-amber-500/20">
          <CardContent className="p-6 space-y-3">
            <p className="text-sm">
              <span className="text-slate-400">Status:</span>{" "}
              <strong className="text-slate-200">{STATUS_LABELS[dispute.status] ?? dispute.status}</strong>
            </p>
            {dispute.reason && (
              <p className="text-sm text-slate-400">
                <span className="text-slate-500">Motivo:</span> {dispute.reason}
              </p>
            )}
            {dispute.admin_notes && (
              <p className="text-sm text-slate-400">
                <span className="text-slate-500">Notas admin:</span> {dispute.admin_notes}
              </p>
            )}
          </CardContent>
        </Card>

        <DisputeResolveForm
          disputeId={disputeId}
          currentStatus={dispute.status}
          currentAdminNotes={dispute.admin_notes ?? ""}
        />

        {evidence && evidence.length > 0 && (
          <Card>
            <CardContent className="p-6">
              <h2 className="font-semibold text-slate-50 mb-3">Evidências</h2>
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

        {transaction && (
          <Card>
            <CardContent className="p-6">
              <p className="text-sm text-slate-400">
                <a href={`/trades/${transaction.id}`} className="text-cyan-400 hover:underline">
                  Abrir sala de troca
                </a>
              </p>
            </CardContent>
          </Card>
        )}
      </PageContainer>
    </main>
  );
}
