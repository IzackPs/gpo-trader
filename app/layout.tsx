import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Navbar from "@/components/Navbar";
import { Footer } from "@/components/layout/footer";
import { createClient } from "@/utils/supabase/server";
import "./globals.css";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "GPO Trader | Mercado Seguro Grand Piece Online",
  description: "Web of Trust para trocas justas em GPO. Reputação real, sem golpes.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const initialProfile =
    user &&
    (await supabase
      .from("profiles")
      .select("reputation_score, is_admin")
      .eq("id", user.id)
      .single()).data;

  return (
    <html lang="pt-BR">
      <body
        className={`${inter.variable} font-sans flex min-h-screen flex-col antialiased`}
      >
        <Navbar initialUser={user ?? null} initialProfile={initialProfile ?? null} />
        <div className="flex flex-1 flex-col pt-20">{children}</div>
        <Footer />
      </body>
    </html>
  );
}
