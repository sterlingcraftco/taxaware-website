
CREATE POLICY "Users can update their own passkeys"
  ON public.user_passkeys FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);
