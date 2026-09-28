ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS crypto_rejection_reason text;