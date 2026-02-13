import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ArrowLeft, Check, Crown, Loader2, Zap, MessageSquare, Phone, FileText, Calculator, PiggyBank, Download, Wallet } from 'lucide-react';
import { toast } from 'sonner';

const ANNUAL_PRICE = 5000; // ₦5,000
const MIN_PRICE = 500; // ₦500

function getProratedInfo() {
  const now = new Date();
  const year = now.getFullYear();
  const startOfYear = new Date(year, 0, 1);
  const endOfYear = new Date(year + 1, 0, 1);
  const totalDays = Math.round((endOfYear.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24));
  const remainingDays = Math.round((endOfYear.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  const prorated = Math.round((remainingDays / totalDays) * ANNUAL_PRICE);
  const finalAmount = Math.max(prorated, MIN_PRICE);

  return { year, totalDays, remainingDays, annualPrice: ANNUAL_PRICE, prorated, finalAmount };
}

const features = {
  free: [
    { icon: Wallet, label: 'Unlimited transactions' },
    { icon: Calculator, label: 'Simple & Advanced tax calculators' },
    { icon: PiggyBank, label: 'Tax savings account (Beta)' },
    { icon: Download, label: 'PDF export & reports' },
  ],
  pro: [
    { icon: Check, label: 'Everything in Free, plus:' },
    { icon: MessageSquare, label: 'AI tax assistant' },
    { icon: Phone, label: 'Book a consultant call' },
    { icon: FileText, label: 'Assisted tax filing service' },
  ],
};

export default function Subscription() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { subscription, isPro, loading: subLoading, refresh } = useSubscription();
  const [subscribing, setSubscribing] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Check for callback reference in URL
  const urlParams = new URLSearchParams(window.location.search);
  const callbackRef = urlParams.get('reference');

  const handleVerifyCallback = async () => {
    if (!callbackRef) return;
    setVerifying(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await supabase.functions.invoke('verify-subscription', {
        body: { reference: callbackRef },
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });

      if (response.error) throw new Error(response.error.message);
      if (!response.data?.success) throw new Error(response.data?.error || 'Verification failed');

      toast.success('Subscription activated! Welcome to TaxAware Subscription.');
      await refresh();
      // Clear URL params
      window.history.replaceState({}, '', '/subscription');
    } catch (error: any) {
      console.error('Verification error:', error);
      toast.error(error.message || 'Failed to verify subscription');
    } finally {
      setVerifying(false);
    }
  };

  // Auto-verify on callback
  if (callbackRef && !verifying && !isPro) {
    handleVerifyCallback();
  }

  const handleSubscribe = async () => {
    if (!user) {
      navigate('/auth');
      return;
    }

    setSubscribing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await supabase.functions.invoke('subscribe', {
        body: {
          plan: 'annual',
          callback_url: `${window.location.origin}/subscription?reference=`,
        },
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });

      if (response.error) throw new Error(response.error.message);
      if (!response.data?.success) throw new Error(response.data?.error || 'Failed to initialize');

      // Redirect to Paystack
      window.location.href = response.data.data.authorization_url;
    } catch (error: any) {
      console.error('Subscribe error:', error);
      toast.error(error.message || 'Failed to start subscription');
    } finally {
      setSubscribing(false);
    }
  };

  if (authLoading || subLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-muted/30 to-background">
      <header className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(user ? '/dashboard' : '/')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Crown className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="font-semibold">TaxAware Subscription</h1>
              <p className="text-sm text-muted-foreground">Choose your plan</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        {verifying && (
          <Card className="mb-6 border-primary">
            <CardContent className="py-6 flex items-center gap-3 justify-center">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
              <p className="text-muted-foreground">Verifying your payment...</p>
            </CardContent>
          </Card>
        )}

        {isPro && (
          <Card className="mb-6 border-primary bg-primary/5">
            <CardContent className="py-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-primary/10">
                  <Crown className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Active Subscription</h3>
                  <p className="text-sm text-muted-foreground">
                    {subscription?.plan === 'annual' ? 'Annual' : 'Monthly'} plan · 
                    {subscription?.current_period_end && ` Renews ${new Date(subscription.current_period_end).toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric' })}`}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="text-center mb-8">
          <h2 className="text-2xl sm:text-3xl font-bold mb-2">
            {isPro ? 'Your Subscription' : 'Upgrade to TaxAware Pro'}
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            {isPro
              ? 'You have access to all premium features.'
              : 'Get access to upcoming premium features — AI tax assistant, consultant calls, and assisted filing.'}
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* Free Plan */}
          <Card className={!isPro ? 'border-primary/30' : ''}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Free</span>
                {!isPro && <Badge variant="outline">Current Plan</Badge>}
              </CardTitle>
              <CardDescription>Full tax management tools</CardDescription>
              <div className="pt-2">
                <span className="text-3xl font-bold">₦0</span>
                <span className="text-muted-foreground"> forever</span>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {features.free.map((feature, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <Check className="w-4 h-4 text-primary shrink-0" />
                    <span className="text-sm">{feature.label}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* Pro Plan */}
          <Card className={`border-primary ${isPro ? 'bg-primary/5' : ''}`}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-primary" />
                  TaxAware Pro
                </span>
                {isPro && <Badge>Active</Badge>}
              </CardTitle>
              <CardDescription>Premium features as they launch</CardDescription>
              <div className="pt-2 space-y-1">
                <div>
                  <span className="text-3xl font-bold">₦5,000</span>
                  <span className="text-muted-foreground">/year</span>
                </div>
                <div className="text-sm text-muted-foreground">
                  Jan 1 – Dec 31 · Prorated if you join mid-year (min ₦500)
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-3">
                {features.pro.map((feature, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <Check className="w-4 h-4 text-primary shrink-0" />
                    <span className="text-sm">{feature.label}</span>
                  </li>
                ))}
              </ul>

              {!isPro && (
                <div className="pt-2">
                  <Button
                    className="w-full gap-2"
                    onClick={() => setShowConfirm(true)}
                  >
                    <Crown className="w-4 h-4" />
                    Subscribe — ₦5,000/yr (prorated)
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Proration confirmation dialog */}
        <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Calculator className="w-5 h-5 text-primary" />
                Subscription Breakdown
              </DialogTitle>
            </DialogHeader>
            {(() => {
              const info = getProratedInfo();
              const today = new Date().toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric' });
              return (
                <div className="space-y-4">
                  <div className="rounded-lg border bg-muted/30 p-4 space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Annual price</span>
                      <span className="font-medium">₦{info.annualPrice.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Period</span>
                      <span>Jan 1 – Dec 31, {info.year}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Today</span>
                      <span>{today}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Days remaining</span>
                      <span>{info.remainingDays} of {info.totalDays} days</span>
                    </div>
                    <hr className="border-border" />
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Prorated calc</span>
                      <span className="text-xs font-mono">
                        {info.remainingDays}/{info.totalDays} × ₦{info.annualPrice.toLocaleString()} = ₦{info.prorated.toLocaleString()}
                      </span>
                    </div>
                    {info.prorated < MIN_PRICE && (
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Minimum charge applies</span>
                        <span>₦{MIN_PRICE.toLocaleString()}</span>
                      </div>
                    )}
                    <hr className="border-border" />
                    <div className="flex justify-between text-base font-semibold">
                      <span>You pay today</span>
                      <span className="text-primary">₦{info.finalAmount.toLocaleString()}</span>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground text-center">
                    Your subscription covers {info.year}. It does not auto-renew.
                  </p>
                </div>
              );
            })()}
            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => setShowConfirm(false)}>Cancel</Button>
              <Button
                className="gap-2"
                onClick={() => { setShowConfirm(false); handleSubscribe(); }}
                disabled={subscribing}
              >
                {subscribing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Crown className="w-4 h-4" />}
                Pay Now
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
