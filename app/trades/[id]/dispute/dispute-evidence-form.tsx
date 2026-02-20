"use client";

import { useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { Alert } from "@/components/ui/alert";

const BUCKET = "dispute-evidence";

export function DisputeEvidenceForm({ disputeId }: { disputeId: string }) {
  const supabase = createClient();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    setError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      setError("Arquivo deve ter no máximo 5MB.");
      return;
    }

    const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif", "application/pdf"];
    if (!allowed.includes(file.type)) {
      setError("Use imagem (JPEG, PNG, WebP, GIF) ou PDF.");
      return;
    }

    setUploading(true);
    const ext = file.name.split(".").pop() ?? "bin";
    const path = `${disputeId}/${crypto.randomUUID()}.${ext}`;

    const { error: uploadErr } = await supabase.storage
      .from(BUCKET)
      .upload(path, file, { upsert: false });

    if (uploadErr) {
      setError(uploadErr.message);
      setUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(path);

    const { error: insertErr } = await supabase.from("dispute_evidence").insert({
      dispute_id: disputeId,
      uploaded_by: (await supabase.auth.getUser()).data.user?.id,
      file_url: urlData.publicUrl,
      file_name: file.name,
    });

    if (insertErr) {
      setError(insertErr.message);
      setUploading(false);
      return;
    }

    setSuccess(true);
    setUploading(false);
    e.target.value = "";
  }

  return (
    <div className="space-y-3">
      {error && <Alert variant="error">{error}</Alert>}
      {success && (
        <p className="text-sm text-emerald-400">Arquivo enviado. Pode enviar mais se quiser.</p>
      )}
      <label className="flex cursor-pointer flex-col gap-2">
        <span className="text-sm text-slate-400">
          Imagem ou PDF (máx. 5MB)
        </span>
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif,application/pdf"
          onChange={handleUpload}
          disabled={uploading}
          className="text-sm text-slate-300 file:mr-4 file:rounded-lg file:border-0 file:bg-cyan-500/20 file:px-4 file:py-2 file:text-cyan-300"
        />
      </label>
      {uploading && <p className="text-sm text-slate-500">Enviando…</p>}
      <p className="text-xs text-slate-500">
        O bucket Supabase &quot;dispute-evidence&quot; precisa existir e permitir upload para usuários autenticados (RLS). Crie-o no Dashboard se ainda não existir.
      </p>
    </div>
  );
}
