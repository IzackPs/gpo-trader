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
  title: "GPO Trader | Secure Grand Piece Online Market",
  description: "Web of Trust for fair trades in GPO. Real reputation, no scams.",
};

const themeScript = `
(function(){
  document.documentElement.setAttribute('data-theme','dark');
  var l=localStorage.getItem('gpo-locale');
  document.documentElement.setAttribute('lang',l==='pt'?'pt-BR':'en');
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
    <html lang="en" data-theme="dark" suppressHydrationWarning>
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
