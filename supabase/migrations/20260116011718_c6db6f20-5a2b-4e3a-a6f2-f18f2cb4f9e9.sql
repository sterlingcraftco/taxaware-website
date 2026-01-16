-- Add TIN-related columns to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS tin text,
ADD COLUMN IF NOT EXISTS nin text,
ADD COLUMN IF NOT EXISTS tax_residency text,
ADD COLUMN IF NOT EXISTS date_of_birth text;