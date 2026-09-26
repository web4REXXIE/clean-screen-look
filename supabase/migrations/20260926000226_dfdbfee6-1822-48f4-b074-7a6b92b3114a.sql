ALTER TYPE public.card_status ADD VALUE IF NOT EXISTS 'activation_pending';
ALTER TYPE public.card_status ADD VALUE IF NOT EXISTS 'expired';
ALTER TYPE public.card_status ADD VALUE IF NOT EXISTS 'cancelled';

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS notes text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS is_demo boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS deactivated boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS created_by text NOT NULL DEFAULT 'self sign-up',
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_by text NOT NULL DEFAULT 'system';

ALTER TABLE public.activation_codes
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS last_used_at timestamptz;

ALTER TABLE public.cards
  ADD COLUMN IF NOT EXISTS card_type text NOT NULL DEFAULT 'WEB3 Digital Card',
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

CREATE OR REPLACE FUNCTION public.validate_code_status()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.status NOT IN ('active','disabled','replaced') THEN
    RAISE EXCEPTION 'Invalid activation code status';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER validate_code_status BEFORE INSERT OR UPDATE ON public.activation_codes
FOR EACH ROW EXECUTE FUNCTION public.validate_code_status();

REVOKE EXECUTE ON FUNCTION public.validate_code_status() FROM PUBLIC, anon, authenticated;

ALTER PUBLICATION supabase_realtime ADD TABLE public.cards;