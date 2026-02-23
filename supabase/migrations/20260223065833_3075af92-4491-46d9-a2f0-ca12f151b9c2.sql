
-- Create payslips table
CREATE TABLE public.payslips (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  pay_period_month INTEGER NOT NULL CHECK (pay_period_month BETWEEN 1 AND 12),
  pay_period_year INTEGER NOT NULL,
  tax_year INTEGER NOT NULL,
  
  -- Employer/Employee info
  employee_name TEXT NOT NULL,
  employee_id TEXT,
  department TEXT,
  job_title TEXT,
  company_name TEXT NOT NULL,
  
  -- Earnings
  basic_salary NUMERIC NOT NULL DEFAULT 0,
  housing_allowance NUMERIC NOT NULL DEFAULT 0,
  transport_allowance NUMERIC NOT NULL DEFAULT 0,
  utility_allowance NUMERIC NOT NULL DEFAULT 0,
  meal_allowance NUMERIC NOT NULL DEFAULT 0,
  leave_allowance NUMERIC NOT NULL DEFAULT 0,
  overtime NUMERIC NOT NULL DEFAULT 0,
  other_allowances NUMERIC NOT NULL DEFAULT 0,
  gross_pay NUMERIC NOT NULL DEFAULT 0,
  
  -- Deductions
  paye_tax NUMERIC NOT NULL DEFAULT 0,
  pension_employee NUMERIC NOT NULL DEFAULT 0,
  pension_employer NUMERIC NOT NULL DEFAULT 0,
  nhf NUMERIC NOT NULL DEFAULT 0,
  nhis NUMERIC NOT NULL DEFAULT 0,
  loan_repayment NUMERIC NOT NULL DEFAULT 0,
  other_deductions NUMERIC NOT NULL DEFAULT 0,
  total_deductions NUMERIC NOT NULL DEFAULT 0,
  
  -- Net
  net_pay NUMERIC NOT NULL DEFAULT 0,
  
  -- Source: 'generated' or 'uploaded'
  source TEXT NOT NULL DEFAULT 'generated',
  
  -- For uploaded payslips
  file_name TEXT,
  file_path TEXT,
  file_size INTEGER,
  mime_type TEXT,
  
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.payslips ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own payslips"
ON public.payslips FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own payslips"
ON public.payslips FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own payslips"
ON public.payslips FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own payslips"
ON public.payslips FOR DELETE
USING (auth.uid() = user_id);

-- Updated at trigger
CREATE TRIGGER update_payslips_updated_at
BEFORE UPDATE ON public.payslips
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Indexes
CREATE INDEX idx_payslips_user_id ON public.payslips (user_id);
CREATE INDEX idx_payslips_tax_year ON public.payslips (tax_year);
CREATE INDEX idx_payslips_pay_period ON public.payslips (pay_period_year, pay_period_month);

-- Storage bucket for uploaded payslips
INSERT INTO storage.buckets (id, name, public) VALUES ('payslip-documents', 'payslip-documents', false);

-- Storage RLS policies
CREATE POLICY "Users can upload their own payslip documents"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'payslip-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their own payslip documents"
ON storage.objects FOR SELECT
USING (bucket_id = 'payslip-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own payslip documents"
ON storage.objects FOR DELETE
USING (bucket_id = 'payslip-documents' AND auth.uid()::text = (storage.foldername(name))[1]);
