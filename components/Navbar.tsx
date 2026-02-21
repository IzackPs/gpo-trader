"use client";

import { createClient } from "@/utils/supabase/client";
import type { User } from "@supabase/supabase-js";
import { LogIn, LayoutDashboard, PlusCircle, LogOut, Shield, ShieldCheck, Package, Scale, Calculator, Sun, Moon, Languages } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import { useLocale } from "@/contexts/LocaleContext";
import { t } from "@/lib/i18n";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";

export interface NavbarProfile {
  reputation_score: number;
  is_admin?: boolean;
}

interface NavbarProps {
  initialUser?: User | null;
  initialProfile?: NavbarProfile | null;
}

export default function Navbar({ initialUser = null, initialProfile = null }: NavbarProps) {
  const [user, setUser] = useState<User | null>(initialUser ?? null);
  const [profile, setProfile] = useState<NavbarProfile | null>(initialProfile ?? null);
  const loading = false;
  const supabase = createClient();
  const { theme, toggleTheme } = useTheme();
  const { locale, setLocale } = useLocale();
  const isEn = locale === "en";

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      void supabase.auth.getUser().then(({ data: { user: u } }) => {
        setUser(u ?? null);
        if (u) {
          void supabase.from("profiles").select("reputation_score, is_admin").eq("id", u.id).single().then(({ data: p }) => {
            setProfile(p ?? null);
          });
        } else {
          setProfile(null);
        }
      });
    });
    return () => subscription.unsubscribe();
  }, [supabase]);

  const handleLogin = () => {
    supabase.auth.signInWithOAuth({
      provider: "discord",
      options: {
        redirectTo: `${typeof window !== "undefined" ? window.location.origin : ""}/auth/callback?next=dashboard`,
      },
    });
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
  };

  const rep = profile?.reputation_score ?? 0;

  return (
    <header className="pointer-events-none relative z-50 px-4 pt-4" aria-label="Barra de navegação">
      <nav
        className="glass pointer-events-auto mx-auto flex max-w-6xl items-center justify-between gap-4 rounded-full border border-white/10 px-4 py-2.5 sm:px-6"
        aria-label="Navegação principal"
      >
        <Link
          href="/"
          className="shrink-0 rounded-full font-bold tracking-tight text-theme-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-500"
        >
          <span className="hidden sm:inline">GPO Trader</span>
          <span className="sm:hidden">GPO</span>
        </Link>

        <div className="flex min-w-0 flex-1 items-center justify-end gap-2 sm:gap-3">
          {loading ? (
            <NavbarSkeleton />
          ) : (
            <>
              <div className="flex shrink-0 items-center gap-1 rounded-full border border-theme-subtle bg-theme-elevated/80 p-1">
                <button
                  type="button"
                  onClick={toggleTheme}
                  className="rounded-full p-1.5 text-theme-secondary transition-colors hover:bg-theme-card hover:text-theme-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-500"
                  aria-label={theme === "dark" ? t(locale, "nav.light") : t(locale, "nav.dark")}
                  title={theme === "dark" ? t(locale, "nav.light") : t(locale, "nav.dark")}
                >
                  {theme === "dark" ? <Sun size={16} aria-hidden /> : <Moon size={16} aria-hidden />}
                </button>
                <span className="text-theme-muted text-xs">|</span>
                <button
                  type="button"
                  onClick={() => setLocale(isEn ? "pt" : "en")}
                  className="rounded-full px-2 py-1 text-xs font-medium text-theme-secondary transition-colors hover:bg-theme-card hover:text-theme-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-500"
                  aria-label={t(locale, "nav.language")}
                  title={t(locale, "nav.language")}
                >
                  {isEn ? "PT" : "EN"}
                </button>
              </div>
              <Link
                href="/calculator"
                className="flex shrink-0 items-center gap-2 rounded-full border border-theme-subtle bg-theme-elevated/80 px-3 py-2 text-sm font-medium text-theme-secondary transition-colors hover:bg-theme-card hover:text-theme-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-500"
                aria-label={t(locale, "nav.calculator")}
              >
                <Calculator size={18} aria-hidden />
                <span className="hidden sm:inline">{t(locale, "nav.calculator")}</span>
              </Link>
              {user ? (
            <>
              {profile?.is_admin === true && (
                <DropdownMenu>
                  <DropdownMenuTrigger
                    className="flex shrink-0 items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm font-medium text-amber-400 transition-colors hover:bg-amber-500/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-500"
                    aria-label="Menu Admin"
                  >
                    <ShieldCheck size={18} aria-hidden />
                    <span className="hidden sm:inline">{t(locale, "nav.admin")}</span>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="min-w-44">
                    <DropdownMenuItem href="/admin/items" icon={<Package size={16} className="shrink-0" />}>
                      {t(locale, "nav.adminItems")}
                    </DropdownMenuItem>
                    <DropdownMenuItem href="/admin/disputes" icon={<Scale size={16} className="shrink-0" />}>
                      {t(locale, "nav.disputes")}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
              <span
                className="hidden shrink-0 items-center gap-1.5 rounded-full border border-white/10 bg-slate-800/60 px-2.5 py-1 text-xs font-semibold text-cyan-300 sm:flex"
                title="Reputação"
              >
                <Shield size={12} aria-hidden />
                <span className="tabular-nums">{Math.round(rep)}</span>
                <span className="hidden md:inline">{t(locale, "nav.rep")}</span>
              </span>
              <DropdownMenu>
                <DropdownMenuTrigger
                  className="flex shrink-0 items-center gap-2 rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-500"
                  aria-label="Abrir menu do usuário"
                >
                  <Avatar
                    src={user.user_metadata?.avatar_url}
                    alt=""
                    className="size-9 border-2 border-white/20"
                  />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="min-w-44">
                  <DropdownMenuItem href="/dashboard" icon={<LayoutDashboard size={16} className="shrink-0" />}>
                    {t(locale, "nav.dashboard")}
                  </DropdownMenuItem>
                  <DropdownMenuItem href="/market/create" icon={<PlusCircle size={16} className="shrink-0" />}>
                    {t(locale, "nav.newOffer")}
                  </DropdownMenuItem>
                  <div className="my-1 border-t border-white/10" role="separator" />
                  <DropdownMenuItem onClick={handleLogout} icon={<LogOut size={16} className="shrink-0" />}>
                    {t(locale, "nav.logout")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
              ) : (
            <Button
              variant="primary"
              size="md"
              onClick={handleLogin}
              className="bg-[#5865F2] hover:bg-[#4752C4] focus-visible:ring-cyan-400"
              leftIcon={<LogIn size={18} aria-hidden />}
            >
              <span className="hidden sm:inline">{t(locale, "nav.login")}</span>
              <span className="sm:hidden">{t(locale, "nav.loginShort")}</span>
            </Button>
              )}
            </>
          )}
        </div>
      </nav>
    </header>
  );
}

function NavbarSkeleton() {
  return (
    <div className="flex items-center gap-2 sm:gap-3">
      <Skeleton className="hidden h-7 w-16 rounded-full sm:block" />
      <Skeleton className="size-9 rounded-full" />
    </div>
  );
}
