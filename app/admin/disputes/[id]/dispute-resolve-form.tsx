"use client";

import { useActionState } from "react";
import { Save, Loader2 } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { resolveDispute } from "./actions";

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
  const [state, formAction, isPending] = useActionState(
    (prev: { error: string | null } | null, formData: FormData) =>
      resolveDispute(disputeId, prev, formData),
    null
  );

  return (
    <Card>
      <CardContent className="p-6">
        <form action={formAction} className="space-y-4">
          {state?.error && (
            <Alert variant="error">
              <p>{state.error}</p>
            </Alert>
          )}

          <div>
            <label htmlFor="status" className="block text-sm font-medium text-slate-300 mb-1">
              Status
            </label>
            <select
              id="status"
              name="status"
              defaultValue={currentStatus}
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
              name="admin_notes"
              rows={4}
              defaultValue={currentAdminNotes}
              className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-4 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-slate-950 resize-y"
              placeholder="Registo interno da resolução..."
            />
          </div>

          <Button
            type="submit"
            variant="primary"
            size="md"
            disabled={isPending}
            leftIcon={isPending ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          >
            {isPending ? "A guardar…" : "Guardar"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
