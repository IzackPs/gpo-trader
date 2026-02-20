// TDD GPO Trader Trust Protocol - Tipos alinhados ao schema Supabase

export type RankTier = 'DRIFTER' | 'CIVILIAN' | 'MERCHANT' | 'BROKER' | 'YONKO';

export type ItemCategory = 'FRUIT' | 'WEAPON' | 'SCROLL' | 'ACCESSORY';

export type ListingSide = 'HAVE' | 'WANT';

export type ListingStatus = 'OPEN' | 'LOCKED' | 'COMPLETED' | 'CANCELLED';

export type TransactionStatus = 'PENDING_VERIFICATION' | 'CONFIRMED' | 'DISPUTED';

export interface Profile {
  id: string;
  discord_id: string;
  username: string;
  avatar_url: string | null;
  reputation_score: number;
  rank_tier: RankTier;
  account_age_days: number;
  strikes: number;
  is_admin?: boolean;
  last_seen_at?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Item {
  id: number;
  name: string;
  category: ItemCategory;
  icon_url: string | null;
  market_value_leg_chests: number;
  volatility: number;
}

export interface ListingItem {
  item_id: number;
  qty: number;
  item_details?: Item;
}

export interface Listing {
  id: string;
  user_id: string;
  side: ListingSide;
  items: ListingItem[];
  status: ListingStatus;
  created_at: string;
  updated_at?: string;
  profiles?: Profile | null;
}

export interface Transaction {
  id: string;
  listing_id: string | null;
  buyer_id: string;
  seller_id: string;
  final_items_exchanged?: Record<string, unknown> | null;
  implied_value: number | null;
  status: TransactionStatus;
  buyer_confirmed: boolean;
  seller_confirmed: boolean;
  created_at: string;
  updated_at?: string;
  buyer?: Profile;
  seller?: Profile;
}

export interface ReputationEvent {
  id: string;
  user_id: string;
  change_amount: number;
  reason: string;
  source_transaction_id: string | null;
  created_at: string;
}

export interface TradeMessage {
  id: string;
  transaction_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  profiles?: Pick<Profile, 'username' | 'avatar_url'> | null;
}

// Limites por tier (TDD - anti-sybil)
export const TIER_LIMITS: Record<RankTier, { maxListings: number }> = {
  DRIFTER: { maxListings: 1 },
  CIVILIAN: { maxListings: 3 },
  MERCHANT: { maxListings: 999 },
  BROKER: { maxListings: 999 },
  YONKO: { maxListings: 999 },
};

/** Idade mínima da conta Discord (dias) para criar ofertas. Anti-Sybil (TDD). */
export const MIN_ACCOUNT_AGE_DAYS = 30;

/** Máximo de strikes antes de bloquear criação de ofertas. Política de moderação. */
export const MAX_STRIKES_BEFORE_BLOCK = 3;
