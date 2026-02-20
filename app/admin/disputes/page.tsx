import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageContainer } from "@/components/layout/page-container";
import { Card, CardContent } from "@/components/ui/card";
import type { DisputeCase } from "@/types";

export const metadata = {
  title: "Admin – Disputas | GPO Trader",
  description: "Listar e resolver disputas (acesso restrito a administradores).",
};

const STATUS_LABELS: Record<string, string> = {
  OPEN: "Aberta",
  UNDER_REVIEW: "Em análise",
  RESOLVED: "Resolvida",
  CLOSED: "Encerrada",
};

export default async function AdminDisputesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth");

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin) redirect("/forbidden");

  const { data: disputes } = await supabase
    .from("dispute_cases")
    .select("id, transaction_id, reported_by, reason, status, admin_notes, created_at")
    .order("created_at", { ascending: false });

  const list = (disputes ?? []) as DisputeCase[];

  return (
    <main>
      <PageContainer maxWidth="lg" className="space-y-6 py-8">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-slate-400 transition-colors hover:text-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-500 rounded"
        >
          <ArrowLeft size={18} aria-hidden /> Voltar
        </Link>

        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-50">
            Admin – Disputas
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Liste as disputas e resolva-as em detalhe (notas e status).
          </p>
        </div>

        <Card>
          <CardContent className="p-0">
            {list.length === 0 ? (
              <div className="py-12 text-center text-slate-500">
                Nenhuma disputa registada.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-700 bg-slate-800/50">
                      <th className="px-4 py-3 font-semibold text-slate-300">Data</th>
                      <th className="px-4 py-3 font-semibold text-slate-300">Reportado por</th>
                      <th className="px-4 py-3 font-semibold text-slate-300">Status</th>
                      <th className="px-4 py-3 font-semibold text-slate-300">Motivo</th>
                      <th className="px-4 py-3 font-semibold text-slate-300">Ação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {list.map((d) => (
                      <tr key={d.id} className="border-b border-slate-800 hover:bg-slate-800/30">
                        <td className="px-4 py-3 text-slate-400">
                          {new Date(d.created_at).toLocaleDateString("pt-BR", {
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </td>
                        <td className="px-4 py-3 text-slate-400 font-mono text-xs">
                          {d.reported_by.slice(0, 8)}…
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${
                              d.status === "OPEN"
                                ? "bg-amber-500/20 text-amber-400"
                                : d.status === "UNDER_REVIEW"
                                  ? "bg-blue-500/20 text-blue-400"
                                  : d.status === "RESOLVED"
                                    ? "bg-emerald-500/20 text-emerald-400"
                                    : "bg-slate-600 text-slate-400"
                            }`}
                          >
                            {STATUS_LABELS[d.status] ?? d.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-400 max-w-xs truncate">
                          {d.reason ?? "—"}
                        </td>
                        <td className="px-4 py-3">
                          <Link
                            href={`/admin/disputes/${d.id}`}
                            className="text-cyan-400 hover:underline text-sm"
                          >
                            Ver / Resolver
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </PageContainer>
    </main>
  );
}
