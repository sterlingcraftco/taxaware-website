
-- Create subscription status enum
CREATE TYPE public.subscription_status AS ENUM ('active', 'cancelled', 'expired', 'past_due');

-- Create subscription plan enum
CREATE TYPE public.subscription_plan AS ENUM ('free', 'monthly', 'annual');

-- Create subscriptions table
CREATE TABLE public.subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  plan subscription_plan NOT NULL DEFAULT 'free',
  status subscription_status NOT NULL DEFAULT 'active',
  paystack_subscription_code TEXT,
  paystack_customer_code TEXT,
  paystack_email_token TEXT,
  amount NUMERIC NOT NULL DEFAULT 0,
  current_period_start TIMESTAMP WITH TIME ZONE,
  current_period_end TIMESTAMP WITH TIME ZONE,
  cancelled_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can view their own subscription
CREATE POLICY "Users can view their own subscription"
ON public.subscriptions FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own subscription
CREATE POLICY "Users can insert their own subscription"
ON public.subscriptions FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own subscription
CREATE POLICY "Users can update their own subscription"
ON public.subscriptions FOR UPDATE
USING (auth.uid() = user_id);

-- Admins can view all subscriptions
CREATE POLICY "Admins can view all subscriptions"
ON public.subscriptions FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can update all subscriptions
CREATE POLICY "Admins can update all subscriptions"
ON public.subscriptions FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_subscriptions_updated_at
BEFORE UPDATE ON public.subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create free subscription on profile creation
CREATE OR REPLACE FUNCTION public.create_default_subscription()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.subscriptions (user_id, plan, status)
  VALUES (NEW.user_id, 'free', 'active')
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER create_subscription_on_profile
AFTER INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.create_default_subscription();
