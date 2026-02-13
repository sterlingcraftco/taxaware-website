-- Temporarily disable the seed trigger
ALTER TABLE public.profiles DISABLE TRIGGER seed_categories_on_profile_create;

-- Backfill profiles for existing auth users
INSERT INTO public.profiles (user_id, email, full_name)
SELECT id, email, COALESCE(raw_user_meta_data->>'full_name', raw_user_meta_data->>'name')
FROM auth.users
ON CONFLICT (user_id) DO NOTHING;

-- Re-enable the seed trigger
ALTER TABLE public.profiles ENABLE TRIGGER seed_categories_on_profile_create;

-- Ensure the auth.users trigger exists
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();