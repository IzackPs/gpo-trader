import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageContainer } from "@/components/layout/page-container";
import { AdminItemsForm } from "./admin-items-form";
import type { Item } from "@/types";

export const metadata = {
  title: "Admin – Preços dos itens | GPO Trader",
  description: "Editar preços e volatilidade dos itens (acesso restrito).",
};

export default async function AdminItemsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth");

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin) redirect("/forbidden");

  const { data: items } = await supabase
    .from("items")
    .select("*")
    .order("category", { ascending: true })
    .order("name", { ascending: true });

  return (
    <main>
      <PageContainer maxWidth="lg" className="space-y-6 py-8">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-slate-400 transition-colors hover:text-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 rounded"
        >
          <ArrowLeft size={18} aria-hidden /> Voltar
        </Link>

        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-50">
            Admin – Preços dos itens
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Edite o preço (em Legendary Chests) e a volatilidade. Alterações
            valem para todo o site.
          </p>
        </div>

        <AdminItemsForm items={(items ?? []) as Item[]} />
      </PageContainer>
    </main>
  );
}
