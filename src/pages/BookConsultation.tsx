import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Phone, ArrowLeft, CheckCircle, Clock, Shield, Users, User } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { isAuthEnabled } from '@/lib/featureFlags';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import Footer from '@/components/Footer';

export default function BookConsultation() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const authEnabled = isAuthEnabled();
  const paymentSuccess = searchParams.get('trxref');

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handlePayment = async () => {
    if (!email) {
      toast.error('Please enter your email address');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('consultation-payment', {
        body: {
          email,
          name,
          callback_url: `${window.location.origin}/book-consultation`,
        },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);

      window.location.href = data.data.authorization_url;
    } catch (error) {
      console.error('Payment error:', error);
      toast.error('Failed to initialize payment. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen">
      {/* Hero header — matches landing page */}
      <section className="hero-gradient relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-10 w-64 h-64 rounded-full bg-accent blur-3xl" />
          <div className="absolute bottom-20 right-10 w-96 h-96 rounded-full bg-primary-foreground blur-3xl" />
        </div>

        <div className="container relative z-10 py-12 md:py-20">
          {/* Nav bar */}
          <div className="absolute top-4 left-4 md:top-8 md:left-8 flex items-center gap-2">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg hero-gradient border border-primary-foreground/20 shadow-sm flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-sm">TA</span>
              </div>
              <span className="font-bold text-lg text-primary-foreground hidden sm:inline">TaxAware NG</span>
            </Link>
          </div>

          {authEnabled && (
            <div className="absolute top-4 right-4 md:top-8 md:right-8">
              {user ? (
                <Button asChild variant="outline" className="bg-primary-foreground/10 border-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/20">
                  <Link to="/dashboard">
                    <User className="w-4 h-4 mr-2" />
                    Dashboard
                  </Link>
                </Button>
              ) : (
                <Button asChild variant="outline" className="bg-primary-foreground/10 border-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/20">
                  <Link to="/auth">
                    <User className="w-4 h-4 mr-2" />
                    Sign In
                  </Link>
                </Button>
              )}
            </div>
          )}

          <div className="max-w-3xl mx-auto text-center pt-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary-foreground/10 backdrop-blur-sm border border-primary-foreground/20 mb-6 animate-fade-in">
              <Phone className="w-4 h-4 text-accent" />
              <span className="text-sm font-medium text-primary-foreground">
                One-on-One Tax Consultation
              </span>
            </div>

            <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold text-primary-foreground mb-4 animate-fade-up text-balance">
              Get Expert Tax Advice
            </h1>

            <p className="text-lg md:text-xl text-primary-foreground/85 mb-6 animate-fade-up leading-relaxed max-w-2xl mx-auto" style={{ animationDelay: '0.1s' }}>
              Speak one-on-one with a tax professional who understands Nigerian tax law and can help you optimize your obligations.
            </p>
          </div>
        </div>

        {/* Wave divider */}
        <div className="absolute -bottom-px left-0 right-0 text-background">
          <svg viewBox="0 0 1440 120" fill="none" className="w-full h-auto block">
            <path
              d="M0 120L60 110C120 100 240 80 360 70C480 60 600 60 720 65C840 70 960 80 1080 85C1200 90 1320 90 1380 90L1440 90V120H1380C1320 120 1200 120 1080 120C960 120 840 120 720 120C600 120 480 120 360 120C240 120 120 120 60 120H0Z"
              fill="currentColor"
            />
          </svg>
        </div>
      </section>

      {/* Content */}
      <section className="py-16 md:py-20">
        <div className="container max-w-4xl">
          {paymentSuccess ? (
            <>
              <div className="text-center mb-8">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-500/10 text-green-600 font-medium text-sm mb-4">
                  <CheckCircle className="w-4 h-4" />
                  Payment Successful
                </div>
                <h2 className="text-2xl font-bold mb-2">Choose Your Time Slot</h2>
                <p className="text-muted-foreground">Select a convenient time for your consultation with TaxAware NG</p>
              </div>

              <div className="bg-card rounded-2xl border border-border p-4 sm:p-6">
                <div className="rounded-lg overflow-hidden border border-border">
                  <iframe
                    src="https://calendar.google.com/calendar/appointments/schedules/AcZssZ1jAw423pxGILK26uCuth0oSMBTJmQ9_4VCMtw-prhXJmecLeIHdD6HjBl1wJLVegCgEgsZisit?gv=true"
                    style={{ border: 0 }}
                    width="100%"
                    height="550"
                    frameBorder="0"
                    title="Book a consultation with TaxAware NG"
                  />
                </div>
              </div>
            </>
          ) : (
            <div className="grid md:grid-cols-2 gap-8">
              {/* Benefits */}
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold mb-2">What You'll Get</h2>
                  <p className="text-muted-foreground">A focused session tailored to your specific tax situation</p>
                </div>

                <div className="space-y-4">
                  {[
                    { icon: Clock, title: '30-Minute Session', desc: 'Focused consultation covering your specific tax questions' },
                    { icon: Shield, title: 'Professional Guidance', desc: 'Advice from experienced Nigerian tax professionals' },
                    { icon: Users, title: 'Personalized Analysis', desc: 'Tailored recommendations for your financial situation' },
                  ].map(({ icon: Icon, title, desc }) => (
                    <div key={title} className="flex gap-4 p-4 rounded-xl bg-card border border-border">
                      <div className="p-3 rounded-lg bg-primary/10 h-fit">
                        <Icon className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-semibold">{title}</p>
                        <p className="text-sm text-muted-foreground">{desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Payment form */}
              <div className="bg-card rounded-2xl border border-border p-6 md:p-8 h-fit">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-xl font-bold">Book Your Call</h3>
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full gold-gradient text-accent-foreground font-semibold text-sm">
                    ₦1,000
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mb-6">
                  One-time payment for a consultation session
                </p>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input
                      id="name"
                      placeholder="Your full name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  <button
                    onClick={handlePayment}
                    disabled={loading || !email}
                    className="w-full group inline-flex items-center justify-center gap-2 px-8 py-4 rounded-full gold-gradient text-accent-foreground font-semibold text-lg transition-all hover:scale-105 hover:shadow-lg disabled:opacity-50 disabled:hover:scale-100"
                  >
                    {loading ? 'Processing...' : 'Pay ₦1,000 & Book'}
                  </button>
                  <p className="text-xs text-center text-muted-foreground">
                    After payment, you'll be able to select your preferred time slot
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      <Footer />
    </main>
  );
}
