"use client";

import Link from "next/link";
import { PlusCircle, TrendingUp } from "lucide-react";
import { useLocale } from "@/contexts/LocaleContext";
import { t } from "@/lib/i18n";
import { PageContainer } from "@/components/layout/page-container";
import { SectionHeader } from "@/components/layout/section-header";
import { Button } from "@/components/ui/button";
import { MarketWithLoadMore } from "@/components/market/market-with-load-more";
import { PresenceProvider } from "@/components/market/presence-provider";
import type { Listing } from "@/types";
import { MarketClient } from "./market-client";

interface MarketPageInnerProps {
  initialListings: Listing[];
  initialHasMore: boolean;
}

export function MarketPageInner({
  initialListings,
  initialHasMore,
}: MarketPageInnerProps) {
  const { locale } = useLocale();
  return (
    <PresenceProvider>
      <PageContainer maxWidth="lg" className="space-y-8">
        <SectionHeader
          title={t(locale, "market.titleGlobal")}
          description={t(locale, "market.description")}
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <Link href="/market/analytics">
                <Button variant="secondary" size="md" leftIcon={<TrendingUp size={18} />}>
                  {t(locale, "market.analytics")}
                </Button>
              </Link>
              <Link href="/market/create">
                <Button variant="primary" size="md" leftIcon={<PlusCircle size={20} />}>
                  {t(locale, "market.createOffer")}
                </Button>
              </Link>
            </div>
          }
        />

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <MarketWithLoadMore
            initialListings={initialListings}
            initialHasMore={initialHasMore}
          />
        </div>
      </PageContainer>
      <MarketClient />
    </PresenceProvider>
  );
}
