"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useLocale } from "@/contexts/LocaleContext";
import { t } from "@/lib/i18n";
import type { Item } from "@/types";
import { TradeCalculatorClient } from "./calculator-client";

interface CalculatorPageClientProps {
  items: Item[];
}

export function CalculatorPageClient({ items }: CalculatorPageClientProps) {
  const { locale } = useLocale();
  return (
    <>
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-sm text-theme-secondary transition-colors hover:text-theme-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-500 rounded"
      >
        <ArrowLeft size={18} aria-hidden /> {t(locale, "nav.back")}
      </Link>

      <div>
        <h1 className="text-2xl font-bold tracking-tight text-theme-primary sm:text-3xl">
          {t(locale, "calculator.title")}
        </h1>
        <p className="mt-1 text-sm text-theme-muted">
          {t(locale, "calculator.description")}
        </p>
      </div>

      <TradeCalculatorClient items={items} />
    </>
  );
}
