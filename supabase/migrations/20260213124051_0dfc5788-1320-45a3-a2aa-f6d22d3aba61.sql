-- Create subscription payments table to track payment history
CREATE TABLE public.subscription_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  amount NUMERIC NOT NULL,
  plan TEXT NOT NULL DEFAULT 'annual',
  status TEXT NOT NULL DEFAULT 'success',
  paystack_reference TEXT,
  period_start TIMESTAMP WITH TIME ZONE,
  period_end TIMESTAMP WITH TIME ZONE,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.subscription_payments ENABLE ROW LEVEL SECURITY;

-- Users can view their own payments
CREATE POLICY "Users can view their own payments"
  ON public.subscription_payments FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Admins can view all payments
CREATE POLICY "Admins can view all payments"
  ON public.subscription_payments FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Only service role inserts (via edge function), but allow user insert for edge function auth context
CREATE POLICY "Users can insert their own payments"
  ON public.subscription_payments FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Index for user lookups
CREATE INDEX idx_subscription_payments_user_id ON public.subscription_payments(user_id);
CREATE INDEX idx_subscription_payments_reference ON public.subscription_payments(paystack_reference);