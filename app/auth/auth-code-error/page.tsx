import Link from "next/link";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageContainer } from "@/components/layout/page-container";

export default function AuthCodeErrorPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6">
      <PageContainer maxWidth="sm" className="text-center">
        <AlertCircle
          className="mx-auto size-16 text-amber-400"
          aria-hidden
        />
        <h1 className="mt-4 text-2xl font-bold text-slate-50">
          Erro ao entrar
        </h1>
        <p className="mt-2 text-slate-400">
          O link de login expirou ou ocorreu um erro. Tente entrar novamente
          com Discord.
        </p>
        <Link href="/" className="mt-6 inline-block">
          <Button variant="primary" size="lg">
            Voltar ao início
          </Button>
        </Link>
      </PageContainer>
    </main>
  );
}
