import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Receipt } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

interface PaymentRecord {
  id: string;
  amount: number;
  plan: string;
  status: string;
  paystack_reference: string | null;
  period_start: string | null;
  period_end: string | null;
  created_at: string;
}

interface AdminUserPaymentHistoryProps {
  userId: string;
}

export function AdminUserPaymentHistory({ userId }: AdminUserPaymentHistoryProps) {
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPayments = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('subscription_payments')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (!error && data) setPayments(data);
      setLoading(false);
    };
    fetchPayments();
  }, [userId]);

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Receipt className="w-5 h-5" /> Payment History
        </CardTitle>
      </CardHeader>
      <CardContent>
        {payments.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No payment records found</p>
        ) : (
          <div className="space-y-4">
            {payments.map((payment) => (
              <div key={payment.id} className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">₦{payment.amount.toLocaleString()}</span>
                  <Badge
                    variant={payment.status === 'success' ? 'default' : 'secondary'}
                    className={payment.status === 'success' ? 'bg-green-500/10 text-green-600 border-green-500/20' : ''}
                  >
                    {payment.status}
                  </Badge>
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Plan: {payment.plan}</span>
                  <span>{format(new Date(payment.created_at), 'MMM d, yyyy HH:mm')}</span>
                </div>
                {payment.period_start && payment.period_end && (
                  <div className="text-xs text-muted-foreground">
                    Coverage: {format(new Date(payment.period_start), 'MMM d, yyyy')} – {format(new Date(payment.period_end), 'MMM d, yyyy')}
                  </div>
                )}
                {payment.paystack_reference && (
                  <div className="text-xs text-muted-foreground font-mono truncate">
                    Ref: {payment.paystack_reference}
                  </div>
                )}
                <Separator />
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
