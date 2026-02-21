import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Navbar from "@/components/Navbar";
import { Footer } from "@/components/layout/footer";
import { AppProviders } from "@/components/providers/AppProviders";
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

const themeScript = `
(function(){
  var t=localStorage.getItem('gpo-theme');
  document.documentElement.setAttribute('data-theme',(t==='light'||t==='dark')?t:'dark');
  var l=localStorage.getItem('gpo-locale');
  document.documentElement.setAttribute('lang',l==='en'?'en':'pt-BR');
})();
`;

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
    <html lang="pt-BR" data-theme="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body
        className={`${inter.variable} font-sans flex min-h-screen flex-col antialiased`}
      >
        <AppProviders>
          <Navbar initialUser={user ?? null} initialProfile={initialProfile ?? null} />
          <div className="flex flex-1 flex-col pt-20">{children}</div>
          <Footer />
        </AppProviders>
      </body>
    </html>
  );
}
