-- ============================================================
-- GPO Trader Trust Protocol - Schema Inicial (TDD v1.0)
-- Stack: Supabase (PostgreSQL)
-- ============================================================

-- ENUMS
CREATE TYPE rank_tier AS ENUM ('DRIFTER', 'CIVILIAN', 'MERCHANT', 'BROKER', 'YONKO');
CREATE TYPE item_category AS ENUM ('FRUIT', 'WEAPON', 'SCROLL', 'ACCESSORY');
CREATE TYPE listing_side AS ENUM ('HAVE', 'WANT');
CREATE TYPE listing_status AS ENUM ('OPEN', 'LOCKED', 'COMPLETED', 'CANCELLED');
CREATE TYPE transaction_status AS ENUM ('PENDING_VERIFICATION', 'CONFIRMED', 'DISPUTED');

-- ============================================================
-- TABELAS
-- ============================================================

-- Extensão de auth.users: perfil público e trust score
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  discord_id TEXT UNIQUE NOT NULL,
  username TEXT NOT NULL,
  avatar_url TEXT,
  reputation_score REAL NOT NULL DEFAULT 0 CHECK (reputation_score >= 0),
  rank_tier rank_tier NOT NULL DEFAULT 'DRIFTER',
  account_age_days INT NOT NULL DEFAULT 0,
  strikes INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Catálogo de ativos GPO
CREATE TABLE public.items (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  category item_category NOT NULL,
  icon_url TEXT,
  market_value_leg_chests REAL NOT NULL DEFAULT 0,
  volatility REAL NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Livro de ofertas
CREATE TABLE public.listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  side listing_side NOT NULL,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  status listing_status NOT NULL DEFAULT 'OPEN',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT items_array_check CHECK (jsonb_typeof(items) = 'array')
);

-- Livro razão (trocas concluídas / em andamento)
CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID REFERENCES public.listings(id) ON DELETE SET NULL,
  buyer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  seller_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  final_items_exchanged JSONB,
  implied_value REAL,
  status transaction_status NOT NULL DEFAULT 'PENDING_VERIFICATION',
  buyer_confirmed BOOLEAN NOT NULL DEFAULT false,
  seller_confirmed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Audit log de XP / reputação
CREATE TABLE public.reputation_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  change_amount REAL NOT NULL,
  reason TEXT NOT NULL,
  source_transaction_id UUID REFERENCES public.transactions(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Canal de chat por transação (mensagens entre comprador e vendedor)
CREATE TABLE public.trade_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices
CREATE INDEX idx_listings_user_status ON public.listings(user_id, status);
CREATE INDEX idx_listings_status_created ON public.listings(status, created_at DESC);
CREATE INDEX idx_transactions_buyer_seller ON public.transactions(buyer_id, seller_id);
CREATE INDEX idx_transactions_status ON public.transactions(status);
CREATE INDEX idx_transactions_created ON public.transactions(created_at DESC);
CREATE INDEX idx_reputation_events_user ON public.reputation_events(user_id);
CREATE INDEX idx_trade_messages_transaction ON public.trade_messages(transaction_id);

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reputation_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trade_messages ENABLE ROW LEVEL SECURITY;

-- Profiles: leitura pública; escrita apenas pelo próprio usuário (via service role ou trigger)
CREATE POLICY "Profiles are viewable by everyone"
  ON public.profiles FOR SELECT USING (true);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Reputação NUNCA é atualizada por usuário; apenas por triggers/funções no backend
-- (Não damos INSERT/UPDATE em profiles.reputation_score via RLS para anon/authenticated;
--  o trigger handle_new_user faz INSERT; give_reputation usa security definer.)

-- Items: leitura pública
CREATE POLICY "Items are viewable by everyone"
  ON public.items FOR SELECT USING (true);

-- Listings: leitura pública para OPEN; dono pode CRUD; outros podem ver OPEN/LOCKED
CREATE POLICY "Listings viewable by everyone when OPEN or LOCKED"
  ON public.listings FOR SELECT USING (status IN ('OPEN', 'LOCKED') OR user_id = auth.uid());

CREATE POLICY "Users can insert own listings"
  ON public.listings FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own listings"
  ON public.listings FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own listings"
  ON public.listings FOR DELETE USING (auth.uid() = user_id);

-- Transactions: apenas comprador e vendedor
CREATE POLICY "Transactions viewable by buyer or seller"
  ON public.transactions FOR SELECT USING (auth.uid() = buyer_id OR auth.uid() = seller_id);

CREATE POLICY "Transactions insert by authenticated"
  ON public.transactions FOR INSERT WITH CHECK (auth.uid() = buyer_id);

CREATE POLICY "Transactions update by buyer or seller"
  ON public.transactions FOR UPDATE USING (auth.uid() = buyer_id OR auth.uid() = seller_id);

-- Reputation events: leitura apenas do próprio usuário
CREATE POLICY "Reputation events viewable by own user"
  ON public.reputation_events FOR SELECT USING (auth.uid() = user_id);

-- Trade messages: apenas participantes da transação
CREATE POLICY "Trade messages viewable by transaction participants"
  ON public.trade_messages FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.transactions t
      WHERE t.id = transaction_id AND (t.buyer_id = auth.uid() OR t.seller_id = auth.uid())
    )
  );

CREATE POLICY "Trade messages insert by participant"
  ON public.trade_messages FOR INSERT WITH CHECK (
    auth.uid() = sender_id AND
    EXISTS (
      SELECT 1 FROM public.transactions t
      WHERE t.id = transaction_id AND (t.buyer_id = auth.uid() OR t.seller_id = auth.uid())
    )
  );

-- ============================================================
-- FUNÇÕES E TRIGGERS
-- ============================================================

-- Cria ou atualiza profile ao criar usuário no Auth (sign up / primeiro login OAuth)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  discord_id_val TEXT;
  username_val TEXT;
  avatar_val TEXT;
  account_created_at TIMESTAMPTZ;
  age_days INT;
  tier rank_tier;
BEGIN
  discord_id_val := COALESCE(NEW.raw_user_meta_data->>'provider_id', NEW.raw_user_meta_data->>'discord_id', NEW.id::text);
  username_val := COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', 'User');
  avatar_val := NEW.raw_user_meta_data->>'avatar_url';

  -- Idade da conta Discord: se tiver created_at no metadata (alguns providers enviam)
  account_created_at := (NEW.raw_user_meta_data->>'created_at')::timestamptz;
  IF account_created_at IS NULL THEN
    age_days := 0;
  ELSE
    age_days := GREATEST(0, EXTRACT(days FROM (now() - account_created_at))::int);
  END IF;

  -- Tier inicial: conta < 6 meses = DRIFTER, senão CIVILIAN
  IF age_days < 180 THEN
    tier := 'DRIFTER';
  ELSE
    tier := 'CIVILIAN';
  END IF;

  INSERT INTO public.profiles (id, discord_id, username, avatar_url, account_age_days, rank_tier)
  VALUES (NEW.id, discord_id_val, username_val, avatar_val, age_days, tier)
  ON CONFLICT (id) DO UPDATE SET
    username = EXCLUDED.username,
    avatar_url = EXCLUDED.avatar_url,
    updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Atualiza updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER listings_updated_at BEFORE UPDATE ON public.listings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER transactions_updated_at BEFORE UPDATE ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Dar reputação quando transação é CONFIRMED (ambos confirmaram)
-- Fórmula: +10 base por troca; multiplicadores por tier podem ser aplicados no cron/edge function
CREATE OR REPLACE FUNCTION public.give_reputation_on_confirm()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  base_xp REAL := 10;
  buyer_rep REAL;
  seller_rep REAL;
BEGIN
  IF NEW.status <> 'CONFIRMED' OR OLD.status = 'CONFIRMED' THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.reputation_events (user_id, change_amount, reason, source_transaction_id)
  VALUES
    (NEW.buyer_id, base_xp, 'Troca #' || LEFT(NEW.id::text, 8), NEW.id),
    (NEW.seller_id, base_xp, 'Troca #' || LEFT(NEW.id::text, 8), NEW.id);

  SELECT reputation_score INTO buyer_rep FROM public.profiles WHERE id = NEW.buyer_id;
  SELECT reputation_score INTO seller_rep FROM public.profiles WHERE id = NEW.seller_id;

  UPDATE public.profiles SET reputation_score = reputation_score + base_xp WHERE id = NEW.buyer_id;
  UPDATE public.profiles SET reputation_score = reputation_score + base_xp WHERE id = NEW.seller_id;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_transaction_confirmed
  AFTER UPDATE ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.give_reputation_on_confirm();

-- Atualizar rank_tier quando reputation_score sobe (TDD: 50=Merchant, 500=Broker, top 1%=Yonko)
CREATE OR REPLACE FUNCTION public.recompute_rank_tier()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.reputation_score >= 1000 THEN
    NEW.rank_tier := 'YONKO';
  ELSIF NEW.reputation_score >= 500 THEN
    NEW.rank_tier := 'BROKER';
  ELSIF NEW.reputation_score >= 50 THEN
    NEW.rank_tier := 'MERCHANT';
  ELSIF NEW.account_age_days >= 180 THEN
    NEW.rank_tier := 'CIVILIAN';
  ELSE
    NEW.rank_tier := 'DRIFTER';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER profiles_recompute_tier
  BEFORE UPDATE OF reputation_score ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.recompute_rank_tier();

COMMENT ON TABLE public.profiles IS 'Perfis públicos e Trust Score (Web of Trust)';
COMMENT ON TABLE public.listings IS 'Livro de ofertas HAVE/WANT';
COMMENT ON TABLE public.transactions IS 'Livro razão; handshake duplo para CONFIRMED';
COMMENT ON TABLE public.reputation_events IS 'Audit log de XP para transparência';
