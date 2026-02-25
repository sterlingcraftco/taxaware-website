
-- Add payslip_id to transactions to link them
ALTER TABLE public.transactions ADD COLUMN payslip_id uuid REFERENCES public.payslips(id) ON DELETE SET NULL;

-- Index for efficient lookups
CREATE INDEX idx_transactions_payslip_id ON public.transactions(payslip_id);
