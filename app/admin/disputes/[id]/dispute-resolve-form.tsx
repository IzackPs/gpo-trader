"use client";

import { useActionState } from "react";
import { Save, Loader2 } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useLocale } from "@/contexts/LocaleContext";
import { t } from "@/lib/i18n";
import { resolveDispute } from "./actions";

const STATUS_KEYS = ["OPEN", "UNDER_REVIEW", "RESOLVED", "CLOSED"] as const;
const STATUS_I18N: Record<(typeof STATUS_KEYS)[number], string> = {
  OPEN: "admin.disputeStatusOpen",
  UNDER_REVIEW: "admin.disputeStatusUnderReview",
  RESOLVED: "admin.disputeStatusResolved",
  CLOSED: "admin.disputeStatusClosed",
};

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
  const { locale } = useLocale();
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
              {STATUS_KEYS.map((key) => (
                <option key={key} value={key}>
                  {t(locale, STATUS_I18N[key])}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="admin_notes" className="block text-sm font-medium text-slate-300 mb-1">
              {t(locale, "admin.adminNotesLabel")}
            </label>
            <textarea
              id="admin_notes"
              name="admin_notes"
              rows={4}
              defaultValue={currentAdminNotes}
              className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-4 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-slate-950 resize-y"
              placeholder={t(locale, "admin.adminNotesPlaceholder")}
            />
          </div>

          <Button
            type="submit"
            variant="primary"
            size="md"
            disabled={isPending}
            leftIcon={isPending ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          >
            {isPending ? t(locale, "common.loading") : t(locale, "common.save")}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
