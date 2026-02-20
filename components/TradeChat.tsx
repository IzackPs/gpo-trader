"use client";

import { createClient } from "@/utils/supabase/client";
import { useEffect, useRef, useState } from "react";
import { Send, MessageCircle } from "lucide-react";
import type { TradeMessage } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface TradeChatProps {
  transactionId: string;
  currentUserId: string;
}

type MessageWithProfile = TradeMessage & {
  profiles?: { username?: string } | null;
};

export default function TradeChat({
  transactionId,
  currentUserId,
}: TradeChatProps) {
  const supabase = createClient();
  const [messages, setMessages] = useState<MessageWithProfile[]>([]);
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchMessages = async () => {
      const { data } = await supabase
        .from("trade_messages")
        .select("*, profiles(username, avatar_url)")
        .eq("transaction_id", transactionId)
        .order("created_at", { ascending: true });
      setMessages((data as MessageWithProfile[]) ?? []);
    };
    fetchMessages();

    const channel = supabase
      .channel(`trade:${transactionId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "trade_messages",
          filter: `transaction_id=eq.${transactionId}`,
        },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as MessageWithProfile]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [transactionId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = content.trim();
    if (!text) return;
    setLoading(true);
    const { error } = await supabase.from("trade_messages").insert({
      transaction_id: transactionId,
      sender_id: currentUserId,
      content: text,
    });
    if (!error) setContent("");
    setLoading(false);
  };

  return (
    <section
      className="glass-card flex h-[320px] flex-col overflow-hidden rounded-xl border border-white/10"
      aria-label="Chat da troca"
    >
      <div className="flex items-center gap-2 border-b border-slate-700 px-3 py-2.5">
        <MessageCircle size={18} className="text-slate-400" aria-hidden />
        <h3 className="text-sm font-medium text-slate-300">Chat da troca</h3>
      </div>

      <div
        className="flex-1 space-y-2 overflow-y-auto p-3"
        role="log"
        aria-live="polite"
        aria-label="Mensagens"
      >
        {messages.length === 0 ? (
          <p className="py-4 text-center text-sm text-slate-500">
            Nenhuma mensagem ainda. Combine o encontro no jogo aqui.
          </p>
        ) : (
          messages.map((msg) => {
            const isMe = msg.sender_id === currentUserId;
            const senderName = msg.profiles?.username ?? "Usuário";
            return (
              <div
                key={msg.id}
                className={cn("flex", isMe ? "justify-end" : "justify-start")}
              >
                <div
                  className={cn(
                    "max-w-[85%] rounded-lg px-3 py-2 text-sm",
                    isMe ? "bg-cyan-500 text-slate-950" : "bg-white/10 text-slate-200 border border-white/10"
                  )}
                >
                  <p className="mb-0.5 font-mono text-xs opacity-80">
                    {senderName}
                  </p>
                  <p className="break-words">{msg.content}</p>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={sendMessage}
        className="flex gap-2 border-t border-slate-700 p-3"
        aria-label="Enviar mensagem"
      >
        <Input
          type="text"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Mensagem…"
          maxLength={500}
          aria-label="Texto da mensagem"
          className="flex-1"
        />
        <Button
          type="submit"
          variant="primary"
          size="md"
          disabled={loading || !content.trim()}
          className="shrink-0 px-3"
          aria-label="Enviar"
        >
          <Send size={18} aria-hidden />
        </Button>
      </form>
    </section>
  );
}
