
-- Feature flags table
CREATE TABLE public.feature_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  name text NOT NULL,
  description text,
  enabled boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Feature flag targets (specific users by email)
CREATE TABLE public.feature_flag_targets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  flag_id uuid REFERENCES public.feature_flags(id) ON DELETE CASCADE NOT NULL,
  email text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(flag_id, email)
);

-- Enable RLS
ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feature_flag_targets ENABLE ROW LEVEL SECURITY;

-- Admins can manage feature flags
CREATE POLICY "Admins can view feature flags" ON public.feature_flags
  FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert feature flags" ON public.feature_flags
  FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update feature flags" ON public.feature_flags
  FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete feature flags" ON public.feature_flags
  FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

-- Authenticated users can read flags (to check if feature is enabled for them)
CREATE POLICY "Authenticated users can view flags" ON public.feature_flags
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Admins can manage targets
CREATE POLICY "Admins can view targets" ON public.feature_flag_targets
  FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert targets" ON public.feature_flag_targets
  FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete targets" ON public.feature_flag_targets
  FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

-- Users can check if they are a target
CREATE POLICY "Users can view their own targets" ON public.feature_flag_targets
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Timestamps trigger
CREATE TRIGGER update_feature_flags_updated_at
  BEFORE UPDATE ON public.feature_flags
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed the savings feature flag
INSERT INTO public.feature_flags (key, name, description, enabled)
VALUES ('savings', 'Tax Savings', 'Enable tax savings feature with deposits, withdrawals, and interest', false);
