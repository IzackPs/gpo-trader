"use client";

import Link from "next/link";
import { ArrowLeft, Trash2, ShieldCheck, AlertTriangle, MessageCircle } from "lucide-react";
import { useLocale } from "@/contexts/LocaleContext";
import { t } from "@/lib/i18n";
import { PageContainer } from "@/components/layout/page-container";
import { ListingItemsWithDetail, type ItemDetail } from "@/components/market/listing-items-with-detail";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type ListingWithProfile = {
  user_id: string;
  side: string;
  status: string;
  items?: unknown[];
  profiles?: {
    username?: string;
    avatar_url?: string;
    reputation_score?: number;
    rank_tier?: string;
  } | null;
};

interface ListingDetailContentProps {
  listing: ListingWithProfile;
  itemsArray: { item_id: number; qty?: number }[];
  itemsDetails: ItemDetail[] | null | undefined;
  isOwner: boolean;
  isOpen: boolean;
  deleteListing: () => Promise<void>;
  acceptOffer: () => Promise<void>;
}

export function ListingDetailContent({
  listing,
  itemsArray,
  itemsDetails,
  isOwner,
  isOpen,
  deleteListing,
  acceptOffer,
}: ListingDetailContentProps) {
  const { locale } = useLocale();
  return (
    <main>
      <PageContainer maxWidth="md" className="space-y-8">
        <Link
          href="/market"
          className="inline-flex items-center gap-2 text-sm text-slate-400 transition-colors hover:text-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-500 rounded"
        >
          <ArrowLeft size={18} aria-hidden /> {t(locale, "market.backToMarket")}
        </Link>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          <div className="space-y-6 md:col-span-1">
            <Card>
              <CardContent className="flex flex-col items-center pt-6 text-center">
                <Avatar
                  src={listing.profiles?.avatar_url ?? undefined}
                  className="mx-auto mb-4 size-24 border-4 border-slate-800"
                />
                <h2 className="text-xl font-bold text-white">{listing.profiles?.username}</h2>
                <div className="flex justify-center items-center gap-2 mt-2 text-sm text-slate-400">
                  <ShieldCheck size={16} className="text-emerald-500" />
                  Tier: {listing.profiles?.rank_tier}
                </div>
                <div className="mt-4 rounded-lg bg-slate-950 p-3">
                  <p className="text-xs font-semibold uppercase text-slate-500">
                    {t(locale, "listingDetail.reputation")}
                  </p>
                  <p className="text-2xl font-mono text-emerald-400">
                    {(listing.profiles?.reputation_score ?? 0).toFixed(0)}
                  </p>
                </div>
              </CardContent>
            </Card>

            <div className="flex gap-3 rounded-lg border border-amber-700/50 bg-amber-500/10 p-4">
              <AlertTriangle className="text-yellow-500 shrink-0" />
              <p className="text-xs text-yellow-200/80">
                {t(locale, "listingDetail.neverSharePasswords")}
              </p>
            </div>
          </div>

          <div className="md:col-span-2">
            <Card>
              <CardContent className="pt-6">
                <div className="mb-6 flex items-center justify-between">
                  <h1 className="text-2xl font-bold text-slate-50">
                    {t(locale, "listingDetail.itemsTitle")}
                  </h1>
                  <Badge variant={listing.side === "HAVE" ? "have" : "want"}>
                    {listing.side === "HAVE" ? t(locale, "market.selling") : t(locale, "market.buying")}
                  </Badge>
                </div>

                <ListingItemsWithDetail
                  entries={itemsArray}
                  itemsDetails={itemsDetails ?? undefined}
                />
              </CardContent>
            </Card>

            <div className="flex gap-4">
              {isOwner && isOpen && (
                <form action={deleteListing} className="w-full">
                  <Button
                    type="submit"
                    variant="danger"
                    size="lg"
                    className="w-full"
                    leftIcon={<Trash2 size={20} />}
                  >
                    {t(locale, "listingDetail.deleteOffer")}
                  </Button>
                </form>
              )}
              {!isOwner && isOpen && (
                <form action={acceptOffer} className="w-full">
                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    className="w-full"
                    leftIcon={<MessageCircle size={20} />}
                  >
                    {t(locale, "listingDetail.acceptTrade")}
                  </Button>
                </form>
              )}
            </div>
          </div>
        </div>
      </PageContainer>
    </main>
  );
}
