import { createClientPublic } from "@/utils/supabase/server";
import { PageContainer } from "@/components/layout/page-container";
import { CalculatorPageClient } from "./calculator-page-client";
import type { Item } from "@/types";

export const metadata = {
  title: "Trade calculator | GPO Trader",
  description: "Calculate whether a trade is good or bad based on item values in Legendary Chests.",
};

export default async function CalculatorPage() {
  const supabase = createClientPublic();
  const { data } = await supabase
    .from("items")
    .select("*")
    .eq("is_active", true)
    .order("category", { ascending: true })
    .order("name", { ascending: true });

  const items = (data ?? []) as Item[];

  return (
    <main>
      <PageContainer maxWidth="lg" className="space-y-6 py-8">
        <CalculatorPageClient items={items} />
      </PageContainer>
    </main>
  );
}
