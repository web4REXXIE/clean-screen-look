ALTER TYPE public.payment_status
ADD VALUE IF NOT EXISTS 'payment_submitted';

ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS crypto_tx_reference text,
  ADD COLUMN IF NOT EXISTS crypto_submitted_at timestamptz;

ALTER TABLE public.service_fees
  ADD COLUMN IF NOT EXISTS crypto_network text,
  ADD COLUMN IF NOT EXISTS crypto_address text;