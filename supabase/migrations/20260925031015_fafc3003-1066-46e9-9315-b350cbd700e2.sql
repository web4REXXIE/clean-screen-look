
CREATE TYPE public.app_role AS ENUM ('admin', 'customer');
CREATE TYPE public.card_status AS ENUM ('pending_activation', 'active', 'suspended');
CREATE TYPE public.payment_status AS ENUM ('unpaid', 'payment_pending', 'paid', 'payment_failed', 'refunded');
CREATE TYPE public.fee_status AS ENUM ('active', 'disabled');

-- PROFILES
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  web_id TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  last_activity TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ROLES
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY "own roles readable" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "own profile readable" ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "own profile updatable" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid() OR public.has_role(auth.uid(), 'admin')) WITH CHECK (id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins insert profiles" ON public.profiles FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- CARDS
CREATE TABLE public.cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  card_ref TEXT NOT NULL UNIQUE,
  cardholder_name TEXT NOT NULL DEFAULT '',
  last4 TEXT NOT NULL DEFAULT '1234',
  expiry TEXT NOT NULL DEFAULT '12/28',
  status public.card_status NOT NULL DEFAULT 'pending_activation',
  activated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cards TO authenticated;
GRANT ALL ON public.cards TO service_role;
ALTER TABLE public.cards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own card readable" ON public.cards FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins write cards" ON public.cards FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ACTIVATION CODES
CREATE TABLE public.activation_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id UUID NOT NULL REFERENCES public.cards(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code TEXT NOT NULL UNIQUE,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.activation_codes TO authenticated;
GRANT ALL ON public.activation_codes TO service_role;
ALTER TABLE public.activation_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins manage codes" ON public.activation_codes FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "own code status readable" ON public.activation_codes FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- SERVICE FEES
CREATE TABLE public.service_fees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  amount_cents INTEGER NOT NULL CHECK (amount_cents >= 0),
  currency TEXT NOT NULL DEFAULT 'USD',
  status public.fee_status NOT NULL DEFAULT 'active',
  effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.service_fees TO authenticated;
GRANT SELECT ON public.service_fees TO anon;
GRANT ALL ON public.service_fees TO service_role;
ALTER TABLE public.service_fees ENABLE ROW LEVEL SECURITY;
CREATE POLICY "active fees public" ON public.service_fees FOR SELECT TO anon, authenticated USING (status = 'active' OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins manage fees" ON public.service_fees FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.service_fees (name, description, amount_cents, currency, status) VALUES
  ('WEB3 Card Activation', 'Service fee for processing and activating your WEB3 digital card.', 2500, 'USD', 'active'),
  ('Premium Card Activation', 'Service fee for processing and activating a premium WEB3 digital card.', 5000, 'USD', 'disabled'),
  ('Replacement Card', 'Service fee for issuing a replacement WEB3 digital card.', 3500, 'USD', 'disabled');

-- PAYMENTS
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  card_id UUID REFERENCES public.cards(id) ON DELETE SET NULL,
  service_fee_id UUID REFERENCES public.service_fees(id) ON DELETE SET NULL,
  service_name TEXT NOT NULL DEFAULT '',
  reference TEXT NOT NULL UNIQUE,
  amount_cents INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  provider TEXT NOT NULL DEFAULT 'stripe',
  provider_session_id TEXT,
  status public.payment_status NOT NULL DEFAULT 'unpaid',
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.payments TO authenticated;
GRANT ALL ON public.payments TO service_role;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own payments readable" ON public.payments FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- AUDIT LOG
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID,
  actor_label TEXT NOT NULL DEFAULT 'system',
  action TEXT NOT NULL,
  subject_user_id UUID,
  web_id TEXT,
  previous_state TEXT,
  new_state TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO service_role;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins read audit" ON public.audit_logs FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- ID GENERATORS + SIGNUP TRIGGER
CREATE OR REPLACE FUNCTION public.gen_hex(_len INT)
RETURNS TEXT LANGUAGE sql VOLATILE SET search_path = public AS $$
  SELECT upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, _len))
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_web_id TEXT;
  v_card_id UUID;
  v_name TEXT;
BEGIN
  v_web_id := 'WEB3-' || public.gen_hex(8);
  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE web_id = v_web_id) LOOP
    v_web_id := 'WEB3-' || public.gen_hex(8);
  END LOOP;

  v_name := COALESCE(NEW.raw_user_meta_data ->> 'full_name', split_part(NEW.email, '@', 1));

  INSERT INTO public.profiles (id, web_id, full_name, email)
  VALUES (NEW.id, v_web_id, v_name, COALESCE(NEW.email, ''));

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'customer')
  ON CONFLICT DO NOTHING;

  INSERT INTO public.cards (user_id, card_ref, cardholder_name, last4, expiry)
  VALUES (NEW.id, 'CARD-' || public.gen_hex(8), upper(v_name), lpad((floor(random()*9000)+1000)::int::text, 4, '0'), '12/28')
  RETURNING id INTO v_card_id;

  INSERT INTO public.activation_codes (card_id, user_id, code)
  VALUES (v_card_id, NEW.id, 'ACT-' || public.gen_hex(4) || '-' || public.gen_hex(3));

  INSERT INTO public.audit_logs (actor_label, action, subject_user_id, web_id, new_state)
  VALUES ('system', 'Customer created', NEW.id, v_web_id, 'pending_activation');

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
