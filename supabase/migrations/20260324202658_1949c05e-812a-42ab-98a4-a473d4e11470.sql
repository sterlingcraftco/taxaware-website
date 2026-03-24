
-- Table to store registered passkey credentials
CREATE TABLE public.user_passkeys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  credential_id text NOT NULL UNIQUE,
  public_key text NOT NULL,
  counter bigint NOT NULL DEFAULT 0,
  device_type text,
  backed_up boolean DEFAULT false,
  transports text[],
  name text DEFAULT 'My Passkey',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Table to store temporary WebAuthn challenges
CREATE TABLE public.passkey_challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  challenge text NOT NULL,
  type text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- RLS for user_passkeys
ALTER TABLE public.user_passkeys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own passkeys"
  ON public.user_passkeys FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own passkeys"
  ON public.user_passkeys FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own passkeys"
  ON public.user_passkeys FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS for passkey_challenges (edge functions use service role, but enable RLS for safety)
ALTER TABLE public.passkey_challenges ENABLE ROW LEVEL SECURITY;

-- Only service role (edge functions) should access challenges
-- No public policies needed since edge functions bypass RLS
