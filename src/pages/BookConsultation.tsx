import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Phone, ArrowLeft, CheckCircle, Clock, Shield, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export default function BookConsultation() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const paymentSuccess = searchParams.get('trxref');

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);

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

  // After successful payment, show calendar
  if (paymentSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-muted/30 to-background">
        <header className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-50">
          <div className="container mx-auto px-4 py-4 flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Phone className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h1 className="font-semibold">Book Your Consultation</h1>
                <p className="text-sm text-muted-foreground">Payment confirmed — select a time slot</p>
              </div>
            </div>
          </div>
        </header>

        <main className="container mx-auto px-4 py-8 max-w-4xl">
          <div className="text-center mb-6">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-500/10 text-green-600 font-medium text-sm mb-4">
              <CheckCircle className="w-4 h-4" />
              Payment Successful
            </div>
            <h2 className="text-2xl font-bold mb-2">Choose Your Time Slot</h2>
            <p className="text-muted-foreground">Select a convenient time for your consultation with TaxAware NG</p>
          </div>

          <Card>
            <CardContent className="p-4 sm:p-6">
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
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-muted/30 to-background">
      <header className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Phone className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="font-semibold">Book a Tax Consultation</h1>
              <p className="text-sm text-muted-foreground">One-on-one with TaxAware NG</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Value proposition */}
        <div className="text-center mb-8">
          <h2 className="text-2xl sm:text-3xl font-bold mb-3">
            Get Expert Tax Advice
          </h2>
          <p className="text-muted-foreground max-w-lg mx-auto">
            Speak one-on-one with a tax professional who understands Nigerian tax law and can help you optimize your obligations.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Benefits */}
          <div className="space-y-4">
            <Card>
              <CardContent className="pt-6 space-y-4">
                {[
                  { icon: Clock, title: '30-Minute Session', desc: 'Focused consultation covering your specific tax questions' },
                  { icon: Shield, title: 'Professional Guidance', desc: 'Advice from experienced Nigerian tax professionals' },
                  { icon: Users, title: 'Personalized Analysis', desc: 'Tailored recommendations for your financial situation' },
                ].map(({ icon: Icon, title, desc }) => (
                  <div key={title} className="flex gap-3">
                    <div className="p-2 rounded-lg bg-primary/10 h-fit">
                      <Icon className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{title}</p>
                      <p className="text-xs text-muted-foreground">{desc}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Payment form */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Book Your Call</CardTitle>
                <Badge className="bg-primary/10 text-primary hover:bg-primary/10">
                  ₦1,000
                </Badge>
              </div>
              <CardDescription>
                One-time payment for a consultation session
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
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
              <Button
                onClick={handlePayment}
                disabled={loading || !email}
                className="w-full"
                size="lg"
              >
                {loading ? 'Processing...' : 'Pay ₦1,000 & Book'}
              </Button>
              <p className="text-xs text-center text-muted-foreground">
                After payment, you'll be able to select your preferred time slot
              </p>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
