ALTER TABLE public.cards
ADD COLUMN IF NOT EXISTS service_fee_id UUID
REFERENCES public.service_fees(id)
ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS cards_service_fee_id_idx
ON public.cards(service_fee_id);

CREATE INDEX IF NOT EXISTS cards_user_id_idx
ON public.cards(user_id);

CREATE INDEX IF NOT EXISTS profiles_web_id_idx
ON public.profiles(web_id);