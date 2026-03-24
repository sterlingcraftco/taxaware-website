import { useState, useEffect, useCallback } from 'react';
import { browserSupportsWebAuthn, startRegistration, startAuthentication } from '@simplewebauthn/browser';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

const PASSKEY_PROMPT_KEY = 'taxaware_passkey_prompt_dismissed';
const PASSKEY_REGISTERED_KEY = 'taxaware_passkey_registered';

export function usePasskey() {
  const { user, session } = useAuth();
  const { toast } = useToast();
  const [isSupported, setIsSupported] = useState(false);
  const [hasPasskey, setHasPasskey] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    setIsSupported(browserSupportsWebAuthn());
  }, []);

  // Check if user has registered passkeys
  useEffect(() => {
    if (!user || !isSupported) return;

    const checkPasskeys = async () => {
      const { data } = await supabase
        .from('user_passkeys')
        .select('id')
        .eq('user_id', user.id)
        .limit(1);

      const registered = (data?.length ?? 0) > 0;
      setHasPasskey(registered);

      // Show prompt if user hasn't registered and hasn't dismissed
      if (!registered && !localStorage.getItem(PASSKEY_PROMPT_KEY)) {
        setShowPrompt(true);
      }
    };

    checkPasskeys();
  }, [user, isSupported]);

  const registerPasskey = useCallback(async (name?: string) => {
    if (!session?.access_token) return;
    setLoading(true);

    try {
      // 1. Get registration options
      const { data: optionsData, error: optionsError } = await supabase.functions.invoke(
        'passkey-register',
        {
          body: { action: 'options', origin: window.location.origin },
        }
      );

      if (optionsError) throw new Error(optionsError.message);

      // 2. Create credential via browser
      const credential = await startRegistration({ optionsJSON: optionsData });

      // 3. Verify with server
      const { data: verifyData, error: verifyError } = await supabase.functions.invoke(
        'passkey-register',
        {
          body: {
            action: 'verify',
            origin: window.location.origin,
            credential,
            name: name || 'My Passkey',
          },
        }
      );

      if (verifyError) throw new Error(verifyError.message);

      if (verifyData.verified) {
        setHasPasskey(true);
        setShowPrompt(false);
        localStorage.setItem(PASSKEY_REGISTERED_KEY, 'true');
        toast({
          title: 'Passkey registered!',
          description: 'You can now use your passkey for quick sign-in.',
        });
        return true;
      }

      throw new Error('Verification failed');
    } catch (error: any) {
      // User cancelled or error
      if (error.name === 'NotAllowedError') {
        toast({
          variant: 'destructive',
          title: 'Cancelled',
          description: 'Passkey registration was cancelled.',
        });
      } else {
        console.error('Passkey registration error:', error);
        toast({
          variant: 'destructive',
          title: 'Registration failed',
          description: error.message || 'Could not register passkey.',
        });
      }
      return false;
    } finally {
      setLoading(false);
    }
  }, [session, toast]);

  const authenticateWithPasskey = useCallback(async () => {
    setLoading(true);
    const sessionId = crypto.randomUUID();

    try {
      // 1. Get authentication options
      const { data: optionsData, error: optionsError } = await supabase.functions.invoke(
        'passkey-authenticate',
        {
          body: { action: 'options', origin: window.location.origin, session_id: sessionId },
        }
      );

      if (optionsError) throw new Error(optionsError.message);

      // 2. Authenticate via browser
      const credential = await startAuthentication({ optionsJSON: optionsData });

      // 3. Verify with server
      const { data: verifyData, error: verifyError } = await supabase.functions.invoke(
        'passkey-authenticate',
        {
          body: {
            action: 'verify',
            origin: window.location.origin,
            credential,
            session_id: sessionId,
          },
        }
      );

      if (verifyError) throw new Error(verifyError.message);

      if (verifyData.verified && verifyData.token_hash) {
        // Exchange the token for a session
        const { error: otpError } = await supabase.auth.verifyOtp({
          token_hash: verifyData.token_hash,
          type: 'magiclink',
        });

        if (otpError) throw otpError;

        toast({
          title: 'Welcome back!',
          description: 'Signed in with passkey.',
        });
        return true;
      }

      throw new Error(verifyData.error || 'Authentication failed');
    } catch (error: any) {
      if (error.name === 'NotAllowedError') {
        toast({
          variant: 'destructive',
          title: 'Cancelled',
          description: 'Passkey authentication was cancelled.',
        });
      } else {
        console.error('Passkey auth error:', error);
        toast({
          variant: 'destructive',
          title: 'Sign-in failed',
          description: error.message || 'Could not sign in with passkey.',
        });
      }
      return false;
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const dismissPrompt = useCallback(() => {
    setShowPrompt(false);
    localStorage.setItem(PASSKEY_PROMPT_KEY, 'true');
  }, []);

  return {
    isSupported,
    hasPasskey,
    loading,
    showPrompt,
    registerPasskey,
    authenticateWithPasskey,
    dismissPrompt,
  };
}
