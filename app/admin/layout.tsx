import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Package, Scale } from "lucide-react";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth");

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin) redirect("/forbidden");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <nav className="flex flex-wrap items-center gap-4" aria-label="Admin">
          <Link
            href="/admin/items"
            className="flex items-center gap-2 text-sm text-slate-400 transition-colors hover:text-slate-50 rounded focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-500"
          >
            <Package size={18} aria-hidden />
            Item prices
          </Link>
          <Link
            href="/admin/disputes"
            className="flex items-center gap-2 text-sm text-slate-400 transition-colors hover:text-slate-50 rounded focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-500"
          >
            <Scale size={18} aria-hidden />
            Disputes
          </Link>
        </nav>
        <Link
          href="/"
          className="text-sm text-slate-500 hover:text-slate-50"
        >
          Back to site
        </Link>
      </div>
      {children}
    </div>
  );
}
