/**
 * Tipos do schema Supabase para createClient<Database>().
 * Os clientes em utils/supabase (server e client) usam createClient<Database>() para inferência de tipos.
 *
 * Para alinhar ao projeto Supabase: npm run gen:types
 * (substitui este ficheiro pela saída de `supabase gen types typescript --local` ou `--project-id`).
 */
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type RankTier = "DRIFTER" | "CIVILIAN" | "MERCHANT" | "BROKER" | "YONKO";
export type ItemCategory = "FRUIT" | "WEAPON" | "SCROLL" | "ACCESSORY";
export type ListingSide = "HAVE" | "WANT";
export type ListingStatus = "OPEN" | "LOCKED" | "COMPLETED" | "CANCELLED";
export type TransactionStatus = "PENDING_VERIFICATION" | "CONFIRMED" | "DISPUTED";
export type DisputeStatus = "OPEN" | "UNDER_REVIEW" | "RESOLVED" | "CLOSED";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          discord_id: string;
          username: string;
          avatar_url: string | null;
          reputation_score: number;
          rank_tier: RankTier;
          account_age_days: number;
          strikes: number;
          is_admin: boolean;
          last_seen_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
      };
      dispute_cases: {
        Row: {
          id: string;
          transaction_id: string;
          reported_by: string;
          reason: string | null;
          status: DisputeStatus;
          admin_notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Record<string, unknown>;
        Update: Partial<Database["public"]["Tables"]["dispute_cases"]["Row"]>;
      };
      dispute_evidence: {
        Row: {
          id: string;
          dispute_id: string;
          uploaded_by: string;
          file_url: string;
          file_name: string | null;
          created_at: string;
        };
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
      };
      transactions: {
        Row: {
          id: string;
          listing_id: string | null;
          buyer_id: string;
          seller_id: string;
          status: TransactionStatus;
          created_at: string;
          updated_at: string;
        };
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
      };
      items: {
        Row: {
          id: number;
          name: string;
          category: ItemCategory;
          icon_url: string | null;
          market_value_leg_chests: number;
          volatility: number;
          is_active: boolean;
        };
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
      };
      listings: {
        Row: Record<string, unknown>;
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
      };
    };
    Views: Record<string, unknown>;
    Functions: Record<string, unknown>;
    Enums: Record<string, unknown>;
  };
}
