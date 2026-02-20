"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

const VALID_STATUSES = ["OPEN", "UNDER_REVIEW", "RESOLVED", "CLOSED"] as const;

export async function resolveDispute(
  disputeId: string,
  _prev: unknown,
  formData: FormData
) {
  const status = formData.get("status") as string | null;
  const adminNotes = (formData.get("admin_notes") as string | null)?.trim() ?? null;

  if (!status || !VALID_STATUSES.includes(status as (typeof VALID_STATUSES)[number])) {
    return { error: "Status inválido." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth");

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin) redirect("/forbidden");

  const { error } = await supabase
    .from("dispute_cases")
    .update({
      status,
      admin_notes: adminNotes || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", disputeId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/admin/disputes");
  revalidatePath(`/admin/disputes/${disputeId}`);
  return { error: null };
}
