// Edge Function para executar jobs periódicos
// Agendar via Supabase Dashboard → Database → Cron Jobs
// ou via pg_cron se disponível

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const cronSecret = Deno.env.get("CRON_SECRET");
    const authHeader = req.headers.get("Authorization");
    const expectedAuth = cronSecret ? `Bearer ${cronSecret}` : null;

    if (!expectedAuth || !authHeader || authHeader !== expectedAuth) {
      return new Response(
        JSON.stringify({ error: "Unauthorized: invalid or missing CRON_SECRET" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json().catch(() => ({}));
    const { job } = body;

    let result;
    switch (job) {
      case "transaction-timeout":
        // Executar timeout de transações
        const { data: timeoutData, error: timeoutError } = await supabase.rpc(
          "handle_transaction_timeout"
        );
        if (timeoutError) throw timeoutError;
        result = { success: true, job: "transaction-timeout", data: timeoutData };
        break;

      case "expire-listings":
        const { data: expireData, error: expireError } = await supabase.rpc(
          "expire_old_listings"
        );
        if (expireError) throw expireError;
        result = { success: true, job: "expire-listings", data: expireData };
        break;

      case "expire-pending-2h":
        const { data: gc2hData, error: gc2hError } = await supabase.rpc(
          "expire_pending_transactions_2h"
        );
        if (gc2hError) throw gc2hError;
        result = { success: true, job: "expire-pending-2h", data: gc2hData };
        break;

      case "find-matches":
        // Executar matchmaking (opcional: pode ser feito via trigger)
        // Por enquanto, apenas documentamos
        result = {
          success: true,
          job: "find-matches",
          message: "Use find_matches() function directly or via trigger",
        };
        break;

      default:
        return new Response(
          JSON.stringify({ error: `Unknown job: ${job ?? "missing"}` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
