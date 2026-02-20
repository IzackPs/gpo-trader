import Link from "next/link";
import { AuthClient } from "./auth-client";
import { PageContainer } from "@/components/layout/page-container";

export const metadata = {
  title: "Entrar | GPO Trader",
  description: "Entre com Discord para acessar o mercado.",
};

type Props = {
  searchParams: Promise<{ redirect?: string }>;
};

export default async function AuthPage({ searchParams }: Props) {
  const { redirect: redirectPath } = await searchParams;
  const next = redirectPath && redirectPath.startsWith("/") ? redirectPath : "/dashboard";

  return (
    <main className="flex min-h-[70vh] flex-col items-center justify-center">
      <PageContainer maxWidth="sm" className="py-16 text-center">
        <h1 className="text-2xl font-bold tracking-tight text-slate-50">
          Entrar no GPO Trader
        </h1>
        <p className="mt-2 text-slate-400">
          Use sua conta Discord para acessar o mercado e criar ofertas.
        </p>
        <AuthClient next={next} />
        <p className="mt-6 text-sm text-slate-500">
          <Link href="/" className="underline hover:text-slate-400">
            Voltar ao início
          </Link>
        </p>
      </PageContainer>
    </main>
  );
}
