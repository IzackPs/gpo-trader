-- 1) Motor de Confiança: +1 reputação ao confirmar troca (solução rápida TDD)
-- 2) Idade da conta: usar tempo de conta do Discord (snowflake), não do site

-- ========== REPUTAÇÃO: +1 para comprador e vendedor quando status = CONFIRMED ==========
CREATE OR REPLACE FUNCTION public.give_reputation_on_confirm()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  base_xp REAL := 1;  -- +1 por troca (solução rápida; pode subir para 10 depois)
BEGIN
  IF NEW.status <> 'CONFIRMED' OR OLD.status = 'CONFIRMED' THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.reputation_events (user_id, change_amount, reason, source_transaction_id)
  VALUES
    (NEW.buyer_id, base_xp, 'Troca #' || LEFT(NEW.id::text, 8), NEW.id),
    (NEW.seller_id, base_xp, 'Troca #' || LEFT(NEW.id::text, 8), NEW.id);

  UPDATE public.profiles SET reputation_score = reputation_score + base_xp WHERE id = NEW.buyer_id;
  UPDATE public.profiles SET reputation_score = reputation_score + base_xp WHERE id = NEW.seller_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_transaction_confirmed ON public.transactions;
CREATE TRIGGER on_transaction_confirmed
  AFTER UPDATE ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.give_reputation_on_confirm();

-- ========== IDADE DA CONTA: Discord snowflake → account_age_days ==========
-- Discord user ID é um snowflake: (id >> 22) + 1420070400000 = criação em ms desde epoch Discord.
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
  age_days INT := 0;
  tier rank_tier;
  snowflake_big BIGINT;
  created_ms BIGINT;
  discord_epoch_ms CONSTANT BIGINT := 1420070400000;  -- 2015-01-01
BEGIN
  discord_id_val := COALESCE(
    NEW.raw_user_meta_data->>'provider_id',
    NEW.raw_user_meta_data->>'discord_id',
    NEW.raw_user_meta_data->>'id',
    NEW.id::text
  );
  username_val := COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', 'User');
  avatar_val := NEW.raw_user_meta_data->>'avatar_url';

  -- Idade da conta DISCORD: derivar do snowflake (não do tempo de login no site)
  IF discord_id_val ~ '^\d+$' AND length(discord_id_val) >= 15 THEN
    BEGIN
      snowflake_big := discord_id_val::BIGINT;
      created_ms := (snowflake_big >> 22) + discord_epoch_ms;
      age_days := GREATEST(0, ((extract(epoch from now()) * 1000)::BIGINT - created_ms) / 86400000);
    EXCEPTION WHEN OTHERS THEN
      age_days := 0;
    END;
  END IF;

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
    account_age_days = EXCLUDED.account_age_days,
    rank_tier = EXCLUDED.rank_tier,
    updated_at = now();
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.give_reputation_on_confirm() IS 'TDD: status CONFIRMED → +1 XP comprador e vendedor.';
COMMENT ON FUNCTION public.handle_new_user() IS 'Perfil a partir do Auth; account_age_days calculado pelo Discord snowflake (idade da conta Discord).';
