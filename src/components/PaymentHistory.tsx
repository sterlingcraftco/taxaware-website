import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Receipt, CheckCircle, XCircle, CreditCard } from 'lucide-react';

interface Payment {
  id: string;
  amount: number;
  plan: string;
  status: string;
  paystack_reference: string | null;
  period_start: string | null;
  period_end: string | null;
  created_at: string;
}

export function PaymentHistory({ userId }: { userId: string }) {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPayments = async () => {
      try {
        const { data, error } = await supabase
          .from('subscription_payments' as any)
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setPayments((data as any[]) || []);
      } catch (error) {
        console.error('Error fetching payments:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPayments();
  }, [userId]);

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 flex justify-center">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Receipt className="w-5 h-5" />
          Payment History
        </CardTitle>
        <CardDescription>Your subscription payments</CardDescription>
      </CardHeader>
      <CardContent>
        {payments.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <CreditCard className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p className="text-sm">No payment records yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {payments.map((payment) => (
              <div
                key={payment.id}
                className="flex items-center justify-between p-3 rounded-lg border bg-muted/20"
              >
                <div className="flex items-center gap-3">
                  {payment.status === 'success' ? (
                    <div className="p-1.5 rounded-full bg-green-500/10">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    </div>
                  ) : (
                    <div className="p-1.5 rounded-full bg-destructive/10">
                      <XCircle className="w-4 h-4 text-destructive" />
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-medium">
                      {payment.plan === 'annual' ? 'Annual' : 'Monthly'} Subscription
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(payment.created_at), 'MMM d, yyyy · h:mm a')}
                    </p>
                    {payment.period_start && payment.period_end && (
                      <p className="text-xs text-muted-foreground">
                        Period: {format(new Date(payment.period_start), 'MMM d')} – {format(new Date(payment.period_end), 'MMM d, yyyy')}
                      </p>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold">₦{payment.amount.toLocaleString()}</p>
                  <Badge
                    variant={payment.status === 'success' ? 'default' : 'destructive'}
                    className="text-[10px] px-1.5"
                  >
                    {payment.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
