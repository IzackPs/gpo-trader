"use client";

import Link from "next/link";
import { useLocale } from "@/contexts/LocaleContext";
import { t } from "@/lib/i18n";

export function Footer() {
  const { locale } = useLocale();
  return (
    <footer className="glass mt-auto border-t border-white/10">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-theme-muted">
            {t(locale, "footer.disclaimer")}
          </p>
          <nav aria-label="Footer">
            <ul className="flex flex-wrap gap-4 text-sm">
              <li>
                <Link
                  href="/terms"
                  className="text-theme-secondary underline decoration-slate-600 underline-offset-2 transition-colors hover:text-theme-primary"
                >
                  {t(locale, "footer.terms")}
                </Link>
              </li>
            </ul>
          </nav>
        </div>
      </div>
    </footer>
  );
}
