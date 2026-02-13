-- Create trigger to auto-create free subscription when a profile is created
CREATE TRIGGER on_profile_created_create_subscription
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.create_default_subscription();

-- Insert free subscriptions for existing users who don't have one
INSERT INTO public.subscriptions (user_id, plan, status)
SELECT p.user_id, 'free', 'active'
FROM public.profiles p
LEFT JOIN public.subscriptions s ON s.user_id = p.user_id
WHERE s.id IS NULL;