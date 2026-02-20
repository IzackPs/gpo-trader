"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { Save, Loader2 } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const STATUS_OPTIONS = [
  { value: "OPEN", label: "Aberta" },
  { value: "UNDER_REVIEW", label: "Em análise" },
  { value: "RESOLVED", label: "Resolvida" },
  { value: "CLOSED", label: "Encerrada" },
] as const;

interface DisputeResolveFormProps {
  disputeId: string;
  currentStatus: string;
  currentAdminNotes: string;
}

export function DisputeResolveForm({
  disputeId,
  currentStatus,
  currentAdminNotes,
}: DisputeResolveFormProps) {
  const supabase = createClient();
  const router = useRouter();
  const [status, setStatus] = useState(currentStatus);
  const [adminNotes, setAdminNotes] = useState(currentAdminNotes);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);

    const { error: err } = await supabase
      .from("dispute_cases")
      .update({
        status,
        admin_notes: adminNotes.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", disputeId);

    setSaving(false);
    if (err) {
      setError(err.message);
      return;
    }
    router.refresh();
  }

  return (
    <Card>
      <CardContent className="p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <Alert variant="error">
              <p>{error}</p>
            </Alert>
          )}

          <div>
            <label htmlFor="status" className="block text-sm font-medium text-slate-300 mb-1">
              Status
            </label>
            <select
              id="status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-4 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-slate-950"
            >
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="admin_notes" className="block text-sm font-medium text-slate-300 mb-1">
              Notas (visíveis apenas para admin)
            </label>
            <textarea
              id="admin_notes"
              rows={4}
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-4 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-slate-950 resize-y"
              placeholder="Registo interno da resolução..."
            />
          </div>

          <Button
            type="submit"
            variant="primary"
            size="md"
            disabled={saving}
            leftIcon={saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          >
            {saving ? "A guardar…" : "Guardar"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
