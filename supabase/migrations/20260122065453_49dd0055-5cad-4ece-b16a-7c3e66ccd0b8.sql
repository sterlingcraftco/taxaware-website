-- Create app role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- Create user roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- RLS policies for user_roles
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles"
ON public.user_roles
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert roles"
ON public.user_roles
FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update roles"
ON public.user_roles
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete roles"
ON public.user_roles
FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));

-- Create savings transaction type enum
CREATE TYPE public.savings_transaction_type AS ENUM ('deposit', 'withdrawal', 'interest', 'withdrawal_request');

-- Create withdrawal status enum
CREATE TYPE public.withdrawal_status AS ENUM ('pending', 'processing', 'completed', 'cancelled');

-- Create tax savings accounts table
CREATE TABLE public.tax_savings_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  balance NUMERIC NOT NULL DEFAULT 0 CHECK (balance >= 0),
  total_deposits NUMERIC NOT NULL DEFAULT 0,
  total_withdrawals NUMERIC NOT NULL DEFAULT 0,
  total_interest_earned NUMERIC NOT NULL DEFAULT 0,
  last_interest_date TIMESTAMP WITH TIME ZONE,
  has_withdrawal_this_quarter BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on tax_savings_accounts
ALTER TABLE public.tax_savings_accounts ENABLE ROW LEVEL SECURITY;

-- RLS policies for tax_savings_accounts
CREATE POLICY "Users can view their own savings account"
ON public.tax_savings_accounts
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own savings account"
ON public.tax_savings_accounts
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own savings account"
ON public.tax_savings_accounts
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all savings accounts"
ON public.tax_savings_accounts
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update all savings accounts"
ON public.tax_savings_accounts
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

-- Create savings transactions table
CREATE TABLE public.savings_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  account_id UUID REFERENCES public.tax_savings_accounts(id) ON DELETE CASCADE NOT NULL,
  type savings_transaction_type NOT NULL,
  amount NUMERIC NOT NULL CHECK (amount > 0),
  balance_after NUMERIC NOT NULL,
  reference VARCHAR(100),
  paystack_reference VARCHAR(100),
  description TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on savings_transactions
ALTER TABLE public.savings_transactions ENABLE ROW LEVEL SECURITY;

-- RLS policies for savings_transactions
CREATE POLICY "Users can view their own transactions"
ON public.savings_transactions
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own transactions"
ON public.savings_transactions
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all transactions"
ON public.savings_transactions
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Create withdrawal requests table
CREATE TABLE public.withdrawal_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  account_id UUID REFERENCES public.tax_savings_accounts(id) ON DELETE CASCADE NOT NULL,
  amount NUMERIC NOT NULL CHECK (amount > 0),
  withdrawal_type VARCHAR(50) NOT NULL CHECK (withdrawal_type IN ('bank_transfer', 'tax_payment')),
  status withdrawal_status NOT NULL DEFAULT 'pending',
  bank_name VARCHAR(100),
  account_number VARCHAR(20),
  account_name VARCHAR(200),
  processed_at TIMESTAMP WITH TIME ZONE,
  processed_by UUID REFERENCES auth.users(id),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on withdrawal_requests
ALTER TABLE public.withdrawal_requests ENABLE ROW LEVEL SECURITY;

-- RLS policies for withdrawal_requests
CREATE POLICY "Users can view their own withdrawal requests"
ON public.withdrawal_requests
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own withdrawal requests"
ON public.withdrawal_requests
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can cancel their own pending requests"
ON public.withdrawal_requests
FOR UPDATE
USING (auth.uid() = user_id AND status = 'pending');

CREATE POLICY "Admins can view all withdrawal requests"
ON public.withdrawal_requests
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update all withdrawal requests"
ON public.withdrawal_requests
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

-- Create trigger for updated_at on all new tables
CREATE TRIGGER update_user_roles_updated_at
BEFORE UPDATE ON public.user_roles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tax_savings_accounts_updated_at
BEFORE UPDATE ON public.tax_savings_accounts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_withdrawal_requests_updated_at
BEFORE UPDATE ON public.withdrawal_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_savings_transactions_user_id ON public.savings_transactions(user_id);
CREATE INDEX idx_savings_transactions_account_id ON public.savings_transactions(account_id);
CREATE INDEX idx_savings_transactions_created_at ON public.savings_transactions(created_at);
CREATE INDEX idx_withdrawal_requests_status ON public.withdrawal_requests(status);
CREATE INDEX idx_withdrawal_requests_user_id ON public.withdrawal_requests(user_id);

-- Function to reset quarterly withdrawal flag (to be called by cron job)
CREATE OR REPLACE FUNCTION public.reset_quarterly_withdrawal_flags()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.tax_savings_accounts
  SET has_withdrawal_this_quarter = false;
END;
$$;