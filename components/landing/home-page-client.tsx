"use client";

import Link from "next/link";
import { Shield, Scale, Lock } from "lucide-react";
import { useLocale } from "@/contexts/LocaleContext";
import { t } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { PageContainer } from "@/components/layout/page-container";
import { LiveStats } from "@/components/landing/live-stats";

export function HomePageClient() {
  const { locale } = useLocale();
  return (
    <main className="flex flex-1 flex-col">
      <section
        className="relative flex flex-1 flex-col items-center justify-center px-4 py-20 text-center sm:py-28"
        aria-labelledby="hero-heading"
      >
        <PageContainer maxWidth="md" className="relative z-10 space-y-10">
          <div className="space-y-6">
            <h1
              id="hero-heading"
              className="animate-fade-in-up text-4xl font-bold tracking-tight text-slate-50 sm:text-5xl md:text-6xl lg:text-7xl"
            >
              {t(locale, "home.heroTitle")}{" "}
              <span className="bg-linear-to-r from-cyan-400 to-cyan-600 bg-clip-text text-transparent">
                GPO
              </span>
            </h1>
            <p className="animate-fade-in-up animate-fade-in-up-delay-1 mx-auto max-w-xl text-lg text-slate-400 sm:text-xl">
              {t(locale, "home.heroSubtitle")}
            </p>
          </div>

          <div className="animate-fade-in-up animate-fade-in-up-delay-2 flex flex-wrap items-center justify-center gap-4">
            <Link href="/market">
              <Button variant="primary" size="lg">
                {t(locale, "home.ctaMarket")}
              </Button>
            </Link>
            <Link href="/market/create">
              <Button variant="outline" size="lg">
                {t(locale, "home.ctaSell")}
              </Button>
            </Link>
          </div>

          <p
            className="animate-fade-in-up animate-fade-in-up-delay-3 glass inline-block rounded-xl border border-white/10 px-4 py-2 text-sm text-cyan-300/90"
            role="status"
          >
            {t(locale, "home.statusAlpha")}
          </p>
        </PageContainer>
      </section>

      <div className="animate-fade-in-up animate-fade-in-up-delay-2">
        <LiveStats />
      </div>

      <section
        className="border-t border-white/10 py-20"
        aria-labelledby="features-heading"
      >
        <PageContainer maxWidth="lg" className="space-y-12">
          <h2
            id="features-heading"
            className="animate-fade-in-up text-center text-2xl font-bold tracking-tight text-slate-50 sm:text-3xl"
          >
            {t(locale, "home.whyTitle")}
          </h2>
          <div className="grid gap-8 sm:grid-cols-3">
            <div className="animate-fade-in-up animate-fade-in-up-delay-1 glass-card flex flex-col gap-4 rounded-2xl p-6 transition-shadow hover:shadow-cyan-500/10 sm:p-8">
              <div className="flex size-14 items-center justify-center rounded-xl bg-cyan-500/20 text-cyan-400">
                <Shield size={28} aria-hidden />
              </div>
              <h3 className="font-semibold text-slate-100">{t(locale, "home.feature1Title")}</h3>
              <p className="text-sm leading-relaxed text-slate-400">
                {t(locale, "home.feature1Desc")}
              </p>
            </div>
            <div className="animate-fade-in-up animate-fade-in-up-delay-2 glass-card flex flex-col gap-4 rounded-2xl p-6 transition-shadow hover:shadow-cyan-500/10 sm:p-8">
              <div className="flex size-14 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400">
                <Scale size={28} aria-hidden />
              </div>
              <h3 className="font-semibold text-slate-100">{t(locale, "home.feature2Title")}</h3>
              <p className="text-sm leading-relaxed text-slate-400">
                {t(locale, "home.feature2Desc")}
              </p>
            </div>
            <div className="animate-fade-in-up animate-fade-in-up-delay-3 glass-card flex flex-col gap-4 rounded-2xl p-6 transition-shadow hover:shadow-cyan-500/10 sm:p-8">
              <div className="flex size-14 items-center justify-center rounded-xl bg-violet-500/20 text-violet-400">
                <Lock size={28} aria-hidden />
              </div>
              <h3 className="font-semibold text-slate-100">{t(locale, "home.feature3Title")}</h3>
              <p className="text-sm leading-relaxed text-slate-400">
                {t(locale, "home.feature3Desc")}
              </p>
            </div>
          </div>
        </PageContainer>
      </section>

      <footer className="animate-fade-in-up animate-fade-in-up-delay-4 border-t border-white/10 py-8">
        <PageContainer maxWidth="full">
          <p className="text-center text-sm text-slate-500">
            {t(locale, "home.footerTagline")}
          </p>
        </PageContainer>
      </footer>
    </main>
  );
}
