"use client";

import { createClient } from "@/utils/supabase/client";
import { Button } from "@/components/ui/button";
import { LogIn } from "lucide-react";

export function AuthClient({ next }: { next: string }) {
  const supabase = createClient();

  const handleLogin = () => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    supabase.auth.signInWithOAuth({
      provider: "discord",
      options: {
        redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });
  };

  return (
    <div className="mt-8">
      <Button
        variant="primary"
        size="lg"
        leftIcon={<LogIn size={20} />}
        onClick={handleLogin}
        className="w-full sm:w-auto"
      >
        Entrar com Discord
      </Button>
    </div>
  );
}
