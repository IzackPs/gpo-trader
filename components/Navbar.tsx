"use client";

import { createClient } from "@/utils/supabase/client";
import type { User } from "@supabase/supabase-js";
import { LogIn, LayoutDashboard, PlusCircle, LogOut, Shield } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";

interface Profile {
  reputation_score: number;
}

export default function Navbar() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const fetchUserAndProfile = useCallback(async () => {
    const { data: { user: u } } = await supabase.auth.getUser();
    setUser(u ?? null);
    if (u) {
      const { data: p } = await supabase
        .from("profiles")
        .select("reputation_score")
        .eq("id", u.id)
        .single();
      setProfile((p as Profile) ?? null);
    } else {
      setProfile(null);
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchUserAndProfile();
  }, [fetchUserAndProfile]);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      fetchUserAndProfile();
    });
    return () => subscription.unsubscribe();
  }, [supabase.auth, fetchUserAndProfile]);

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
          className="shrink-0 rounded-full font-bold tracking-tight text-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-500"
        >
          <span className="hidden sm:inline">GPO Trader</span>
          <span className="sm:hidden">GPO</span>
        </Link>

        <div className="flex min-w-0 flex-1 items-center justify-end gap-2 sm:gap-3">
          {loading ? (
            <NavbarSkeleton />
          ) : user ? (
            <>
              <span
                className="hidden shrink-0 items-center gap-1.5 rounded-full border border-white/10 bg-slate-800/60 px-2.5 py-1 text-xs font-semibold text-cyan-300 sm:flex"
                title="Reputação"
              >
                <Shield size={12} aria-hidden />
                <span className="tabular-nums">{Math.round(rep)}</span>
                <span className="hidden md:inline">REP</span>
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
                    Dashboard
                  </DropdownMenuItem>
                  <DropdownMenuItem href="/market/create" icon={<PlusCircle size={16} className="shrink-0" />}>
                    Nova oferta
                  </DropdownMenuItem>
                  <div className="my-1 border-t border-white/10" role="separator" />
                  <DropdownMenuItem onClick={handleLogout} icon={<LogOut size={16} className="shrink-0" />}>
                    Sair
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
              <span className="hidden sm:inline">Login com Discord</span>
              <span className="sm:hidden">Entrar</span>
            </Button>
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
