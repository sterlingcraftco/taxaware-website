import { useState } from 'react';
import { usePasskey } from '@/hooks/usePasskey';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Fingerprint, X, Loader2 } from 'lucide-react';

export function PasskeyPrompt() {
  const { isSupported, showPrompt, hasPasskey, loading, registerPasskey, dismissPrompt } = usePasskey();

  if (!isSupported || !showPrompt || hasPasskey) return null;

  return (
    <Card className="border-accent/30 bg-accent/5">
      <CardContent className="p-4 flex items-center gap-4">
        <div className="p-2 rounded-lg bg-accent/20">
          <Fingerprint className="w-5 h-5 text-accent" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">Enable Quick Sign-In</p>
          <p className="text-xs text-muted-foreground">
            Set up a passkey for faster, more secure sign-in next time.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            size="sm"
            variant="ghost"
            onClick={dismissPrompt}
            className="h-8 w-8 p-0"
          >
            <X className="w-4 h-4" />
          </Button>
          <Button
            size="sm"
            onClick={() => registerPasskey()}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              'Set Up'
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
