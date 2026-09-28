-- Ensure crypto payment columns exist on service_fees.
-- Idempotent: safe to run even if the columns already exist.
ALTER TABLE public.service_fees
  ADD COLUMN IF NOT EXISTS crypto_network text,
  ADD COLUMN IF NOT EXISTS crypto_address text;