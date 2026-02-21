"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ListingCard } from "@/components/market/listing-card";
import { usePresence } from "@/components/market/presence-provider";
import { useLocale } from "@/contexts/LocaleContext";
import { t } from "@/lib/i18n";
import Link from "next/link";
import { ArrowRightLeft } from "lucide-react";
import type { Listing } from "@/types";

export function MarketListingGrid({ listings }: { listings: Listing[] }) {
  const { onlineUserIds } = usePresence();
  const { locale } = useLocale();

  if (listings.length === 0) {
    return (
      <Card
        as="section"
        className="col-span-full flex flex-col items-center justify-center border-dashed py-16 text-center"
        aria-label={locale === "en" ? "Empty state" : "Estado vazio"}
      >
        <CardContent className="flex flex-col items-center gap-4 p-0">
          <div className="size-16 flex items-center justify-center rounded-full bg-slate-800">
            <ArrowRightLeft className="text-slate-500" size={32} aria-hidden />
          </div>
          <div className="space-y-1">
            <h2 className="text-xl font-semibold text-slate-50">{t(locale, "market.emptyTitle")}</h2>
            <p className="text-slate-500">
              {t(locale, "market.emptyDesc")}
            </p>
          </div>
          <Link href="/market/create">
            <Button variant="primary" size="md">
              {t(locale, "market.createFirstOffer")}
            </Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      {listings.map((listing) => (
        <ListingCard
          key={listing.id}
          listing={listing}
          isOnline={onlineUserIds.has(listing.user_id)}
        />
      ))}
    </>
  );
}
