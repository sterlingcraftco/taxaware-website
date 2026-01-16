-- =============================================
-- Phase 1: Income/Expense Tracking Tables & Storage
-- =============================================

-- Create enum for transaction types
CREATE TYPE public.transaction_type AS ENUM ('income', 'expense');

-- Create enum for transaction status
CREATE TYPE public.transaction_status AS ENUM ('pending', 'completed', 'cancelled');

-- Create enum for recurrence frequency
CREATE TYPE public.recurrence_frequency AS ENUM ('daily', 'weekly', 'bi-weekly', 'monthly', 'quarterly', 'annually');

-- =============================================
-- Categories Table
-- =============================================
CREATE TABLE public.transaction_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  type public.transaction_type NOT NULL,
  icon TEXT,
  color TEXT,
  is_tax_deductible BOOLEAN DEFAULT false,
  is_system BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, name, type)
);

-- Enable RLS on categories
ALTER TABLE public.transaction_categories ENABLE ROW LEVEL SECURITY;

-- RLS policies for categories
CREATE POLICY "Users can view their own categories"
ON public.transaction_categories FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own categories"
ON public.transaction_categories FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own categories"
ON public.transaction_categories FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own categories"
ON public.transaction_categories FOR DELETE
USING (auth.uid() = user_id);

-- =============================================
-- Main Transactions Table
-- =============================================
CREATE TABLE public.transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  category_id UUID REFERENCES public.transaction_categories(id) ON DELETE SET NULL,
  type public.transaction_type NOT NULL,
  amount NUMERIC(15, 2) NOT NULL CHECK (amount > 0),
  description TEXT NOT NULL,
  notes TEXT,
  transaction_date DATE NOT NULL,
  tax_year INTEGER GENERATED ALWAYS AS (EXTRACT(YEAR FROM transaction_date)) STORED,
  status public.transaction_status DEFAULT 'completed',
  is_recurring BOOLEAN DEFAULT false,
  recurring_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on transactions
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- RLS policies for transactions
CREATE POLICY "Users can view their own transactions"
ON public.transactions FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own transactions"
ON public.transactions FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own transactions"
ON public.transactions FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own transactions"
ON public.transactions FOR DELETE
USING (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX idx_transactions_user_id ON public.transactions(user_id);
CREATE INDEX idx_transactions_date ON public.transactions(transaction_date DESC);
CREATE INDEX idx_transactions_tax_year ON public.transactions(tax_year);
CREATE INDEX idx_transactions_type ON public.transactions(type);
CREATE INDEX idx_transactions_category ON public.transactions(category_id);

-- =============================================
-- Recurring Transactions Table
-- =============================================
CREATE TABLE public.recurring_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  category_id UUID REFERENCES public.transaction_categories(id) ON DELETE SET NULL,
  type public.transaction_type NOT NULL,
  amount NUMERIC(15, 2) NOT NULL CHECK (amount > 0),
  description TEXT NOT NULL,
  notes TEXT,
  frequency public.recurrence_frequency NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE,
  next_occurrence DATE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  last_processed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add foreign key for recurring_id in transactions
ALTER TABLE public.transactions
ADD CONSTRAINT fk_transactions_recurring
FOREIGN KEY (recurring_id) REFERENCES public.recurring_transactions(id) ON DELETE SET NULL;

-- Enable RLS on recurring_transactions
ALTER TABLE public.recurring_transactions ENABLE ROW LEVEL SECURITY;

-- RLS policies for recurring_transactions
CREATE POLICY "Users can view their own recurring transactions"
ON public.recurring_transactions FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own recurring transactions"
ON public.recurring_transactions FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own recurring transactions"
ON public.recurring_transactions FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own recurring transactions"
ON public.recurring_transactions FOR DELETE
USING (auth.uid() = user_id);

-- Indexes for recurring transactions
CREATE INDEX idx_recurring_user_id ON public.recurring_transactions(user_id);
CREATE INDEX idx_recurring_next_occurrence ON public.recurring_transactions(next_occurrence) WHERE is_active = true;

-- =============================================
-- Transaction Documents/Attachments Table
-- =============================================
CREATE TABLE public.transaction_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  transaction_id UUID NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER,
  mime_type TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on transaction_documents
ALTER TABLE public.transaction_documents ENABLE ROW LEVEL SECURITY;

-- RLS policies for transaction_documents
CREATE POLICY "Users can view their own documents"
ON public.transaction_documents FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own documents"
ON public.transaction_documents FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own documents"
ON public.transaction_documents FOR DELETE
USING (auth.uid() = user_id);

-- Index for documents
CREATE INDEX idx_documents_transaction ON public.transaction_documents(transaction_id);

-- =============================================
-- Storage Bucket for Transaction Documents
-- =============================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'transaction-documents',
  'transaction-documents',
  false,
  10485760, -- 10MB limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf']
);

-- Storage RLS policies
CREATE POLICY "Users can view their own transaction documents"
ON storage.objects FOR SELECT
USING (bucket_id = 'transaction-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can upload their own transaction documents"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'transaction-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own transaction documents"
ON storage.objects FOR UPDATE
USING (bucket_id = 'transaction-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own transaction documents"
ON storage.objects FOR DELETE
USING (bucket_id = 'transaction-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

-- =============================================
-- Updated_at Trigger Function (reuse if exists)
-- =============================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Apply updated_at triggers
CREATE TRIGGER update_transaction_categories_updated_at
BEFORE UPDATE ON public.transaction_categories
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_transactions_updated_at
BEFORE UPDATE ON public.transactions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_recurring_transactions_updated_at
BEFORE UPDATE ON public.recurring_transactions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- Function to seed default categories for new users
-- =============================================
CREATE OR REPLACE FUNCTION public.seed_default_categories()
RETURNS TRIGGER AS $$
BEGIN
  -- Default income categories
  INSERT INTO public.transaction_categories (user_id, name, type, icon, is_system) VALUES
    (NEW.user_id, 'Salary', 'income', 'Briefcase', true),
    (NEW.user_id, 'Business Income', 'income', 'Building2', true),
    (NEW.user_id, 'Freelance', 'income', 'Laptop', true),
    (NEW.user_id, 'Investment Returns', 'income', 'TrendingUp', true),
    (NEW.user_id, 'Rental Income', 'income', 'Home', true),
    (NEW.user_id, 'Other Income', 'income', 'Plus', true);
  
  -- Default expense categories (tax-deductible marked)
  INSERT INTO public.transaction_categories (user_id, name, type, icon, is_tax_deductible, is_system) VALUES
    (NEW.user_id, 'NHF Contribution', 'expense', 'Home', true, true),
    (NEW.user_id, 'Pension Contribution', 'expense', 'PiggyBank', true, true),
    (NEW.user_id, 'Life Insurance', 'expense', 'Shield', true, true),
    (NEW.user_id, 'NHIS Contribution', 'expense', 'Heart', true, true),
    (NEW.user_id, 'Voluntary Pension', 'expense', 'Wallet', true, true),
    (NEW.user_id, 'Professional Dues', 'expense', 'Award', false, true),
    (NEW.user_id, 'Work Equipment', 'expense', 'Monitor', false, true),
    (NEW.user_id, 'Other Expense', 'expense', 'Minus', false, true);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger to seed categories when a new profile is created
CREATE TRIGGER seed_categories_on_profile_create
AFTER INSERT ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.seed_default_categories();