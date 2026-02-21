"use client";

import { useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { Save, Loader2, Power } from "lucide-react";
import type { Item } from "@/types";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

interface AdminItemsFormProps {
  items: Item[];
}

export function AdminItemsForm({ items }: AdminItemsFormProps) {
  const supabase = createClient();
  const [savingId, setSavingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successId, setSuccessId] = useState<number | null>(null);

  const [values, setValues] = useState<Record<number, { market_value_leg_chests: string; volatility: string; icon_url: string; is_active: boolean }>>(
    () =>
      Object.fromEntries(
        items.map((i) => [
          i.id,
          {
            market_value_leg_chests: String(i.market_value_leg_chests),
            volatility: String(i.volatility ?? 0),
            icon_url: i.icon_url ?? "",
            is_active: i.is_active !== false,
          },
        ])
      )
  );

  const handleSave = async (item: Item) => {
    setError(null);
    setSuccessId(null);
    setSavingId(item.id);

    const v = values[item.id];
    const price = parseFloat(v.market_value_leg_chests);
    const vol = parseFloat(v.volatility);

    if (Number.isNaN(price) || price < 0) {
      setError("Preço deve ser um número ≥ 0.");
      setSavingId(null);
      return;
    }

    const iconUrl = (values[item.id]?.icon_url ?? "").trim() || null;

    const { error: err } = await supabase
      .from("items")
      .update({
        market_value_leg_chests: price,
        volatility: Number.isNaN(vol) ? 0 : vol,
        icon_url: iconUrl,
        is_active: values[item.id]?.is_active ?? true,
      })
      .eq("id", item.id);

    setSavingId(null);
    if (err) {
      setError(err.message);
      return;
    }
    setSuccessId(item.id);
  };

  return (
    <div className="space-y-4">
      {error && (
        <Alert variant="error">
          <p>{error}</p>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Itens ({items.length})</CardTitle>
          <p className="text-sm text-slate-500">
            Altere e clique em Salvar. Preço em Legendary Chests. Desative itens em vez de apagar (soft delete).
          </p>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="pb-2 pr-4 font-semibold text-slate-300">Nome</th>
                  <th className="pb-2 pr-4 font-semibold text-slate-300">Categoria</th>
                  <th className="pb-2 pr-4 font-semibold text-slate-300">Ícone (URL)</th>
                  <th className="pb-2 pr-4 font-semibold text-slate-300">Preço (Leg. Chests)</th>
                  <th className="pb-2 pr-4 font-semibold text-slate-300">Volatilidade</th>
                  <th className="pb-2 pr-4 font-semibold text-slate-300">Ativo</th>
                  <th className="pb-2 font-semibold text-slate-300">Ação</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className="border-b border-slate-800">
                    <td className="py-3 pr-4 font-medium text-slate-100">{item.name}</td>
                    <td className="py-3 pr-4 text-slate-400">{item.category}</td>
                    <td className="py-3 pr-4">
                      <Input
                        type="url"
                        placeholder="https://..."
                        value={values[item.id]?.icon_url ?? ""}
                        onChange={(e) =>
                          setValues((prev) => ({
                            ...prev,
                            [item.id]: {
                              ...prev[item.id],
                              icon_url: e.target.value,
                            },
                          }))
                        }
                        className="min-w-[140px] max-w-[200px]"
                      />
                    </td>
                    <td className="py-3 pr-4">
                      <Input
                        type="number"
                        min={0}
                        step={0.1}
                        value={values[item.id]?.market_value_leg_chests ?? ""}
                        onChange={(e) =>
                          setValues((prev) => ({
                            ...prev,
                            [item.id]: {
                              ...prev[item.id],
                              market_value_leg_chests: e.target.value,
                            },
                          }))
                        }
                        className="w-24"
                      />
                    </td>
                    <td className="py-3 pr-4">
                      <Input
                        type="number"
                        min={0}
                        step={0.1}
                        value={values[item.id]?.volatility ?? ""}
                        onChange={(e) =>
                          setValues((prev) => ({
                            ...prev,
                            [item.id]: {
                              ...prev[item.id],
                              volatility: e.target.value,
                            },
                          }))
                        }
                        className="w-20"
                      />
                    </td>
                    <td className="py-3 pr-4">
                      <button
                        type="button"
                        onClick={() =>
                          setValues((prev) => ({
                            ...prev,
                            [item.id]: {
                              ...prev[item.id],
                              is_active: !(prev[item.id]?.is_active !== false),
                            },
                          }))
                        }
                        className={`flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium transition-colors ${
                          values[item.id]?.is_active !== false
                            ? "bg-emerald-500/20 text-emerald-400"
                            : "bg-slate-700 text-slate-500"
                        }`}
                        title={values[item.id]?.is_active !== false ? "Desativar item" : "Ativar item"}
                      >
                        <Power size={12} aria-hidden />
                        {values[item.id]?.is_active !== false ? "Sim" : "Não"}
                      </button>
                    </td>
                    <td className="py-3">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleSave(item)}
                        disabled={savingId === item.id}
                        leftIcon={
                          savingId === item.id ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : (
                            <Save size={14} />
                          )
                        }
                      >
                        {savingId === item.id ? "Salvando…" : "Salvar"}
                      </Button>
                      {successId === item.id && (
                        <span className="ml-2 text-xs text-emerald-400">Salvo</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
