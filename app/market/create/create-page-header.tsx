"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useLocale } from "@/contexts/LocaleContext";
import { t } from "@/lib/i18n";

interface CreatePageHeaderProps {
  openListingsCount: number;
  maxListings: number;
}

export function CreatePageHeader({
  openListingsCount,
  maxListings,
}: CreatePageHeaderProps) {
  const { locale } = useLocale();
  return (
    <>
      <Link
        href="/market"
        className="inline-flex items-center gap-2 text-sm text-slate-400 transition-colors hover:text-slate-50 focus-visible:rounded focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-500"
      >
        <ArrowLeft size={18} aria-hidden />
        {t(locale, "create.backToMarket")}
      </Link>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-50 sm:text-3xl">
            {t(locale, "create.title")}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {t(locale, "create.description")}
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <span>{t(locale, "create.activeListings")}:</span>
          <span className="font-medium tabular-nums text-slate-300">
            {openListingsCount}/{maxListings}
          </span>
        </div>
      </div>
    </>
  );
}
