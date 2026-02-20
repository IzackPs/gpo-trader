import Link from "next/link";
import { ShieldX } from "lucide-react";
import { PageContainer } from "@/components/layout/page-container";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Acesso negado | GPO Trader",
  description: "Você não tem permissão para acessar esta página.",
};

export default function ForbiddenPage() {
  return (
    <main className="flex min-h-[60vh] flex-col items-center justify-center">
      <PageContainer maxWidth="sm" className="py-16 text-center">
        <div className="flex size-20 items-center justify-center rounded-full bg-red-500/20 text-red-400">
          <ShieldX size={40} aria-hidden />
        </div>
        <h1 className="mt-6 text-2xl font-bold text-slate-50">
          Acesso negado
        </h1>
        <p className="mt-2 text-slate-400">
          Você não tem permissão para acessar esta página.
        </p>
        <Link href="/" className="mt-8 inline-block">
          <Button variant="outline" size="lg">
            Voltar ao início
          </Button>
        </Link>
      </PageContainer>
    </main>
  );
}
