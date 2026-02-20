"use server";

import { createClient } from "@/utils/supabase/server";

/** Rate limit: máx. mensagens por usuário na mesma transação em 1 minuto. */
const MESSAGE_RATE_LIMIT_WINDOW_MINUTES = 1;
const MESSAGE_RATE_LIMIT_MAX = 15;

export type SendTradeMessageResult = { error?: string };

export async function sendTradeMessage(
  transactionId: string,
  content: string
): Promise<SendTradeMessageResult> {
  const trimmed = content.trim();
  if (!trimmed) return {};

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado." };

  const windowStart = new Date(
    Date.now() - MESSAGE_RATE_LIMIT_WINDOW_MINUTES * 60 * 1000
  ).toISOString();

  const { count, error: countError } = await supabase
    .from("trade_messages")
    .select("id", { count: "exact", head: true })
    .eq("transaction_id", transactionId)
    .eq("sender_id", user.id)
    .gte("created_at", windowStart);

  if (countError || (count ?? 0) >= MESSAGE_RATE_LIMIT_MAX) {
    return {
      error: "Muitas mensagens em pouco tempo. Aguarde um momento.",
    };
  }

  const { error: insertError } = await supabase.from("trade_messages").insert({
    transaction_id: transactionId,
    sender_id: user.id,
    content: trimmed,
  });

  if (insertError) return { error: insertError.message };
  return {};
}
