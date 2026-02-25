import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ArrowUpCircle, ArrowDownCircle, FileText } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency } from '@/lib/taxCalculations';
import { format } from 'date-fns';

interface LinkedTransaction {
  id: string;
  description: string;
  type: 'income' | 'expense';
  amount: number;
  transaction_date: string;
}

interface PayslipTransactionsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  payslipId: string | null;
  payslipLabel: string;
}

export default function PayslipTransactionsModal({
  open,
  onOpenChange,
  payslipId,
  payslipLabel,
}: PayslipTransactionsModalProps) {
  const [transactions, setTransactions] = useState<LinkedTransaction[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !payslipId) return;
    setLoading(true);
    supabase
      .from('transactions')
      .select('id, description, type, amount, transaction_date')
      .eq('payslip_id', payslipId)
      .order('type', { ascending: true })
      .then(({ data }) => {
        setTransactions((data as LinkedTransaction[]) || []);
        setLoading(false);
      });
  }, [open, payslipId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-4 h-4" /> Linked Transactions
          </DialogTitle>
          <DialogDescription>{payslipLabel}</DialogDescription>
        </DialogHeader>
        {loading ? (
          <p className="text-sm text-muted-foreground py-4 text-center animate-pulse">Loading...</p>
        ) : transactions.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">No transactions linked to this payslip.</p>
        ) : (
          <div className="space-y-2 max-h-[50vh] overflow-y-auto">
            {transactions.map(t => (
              <div key={t.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-2 min-w-0">
                  {t.type === 'income' ? (
                    <ArrowUpCircle className="w-4 h-4 text-green-500 shrink-0" />
                  ) : (
                    <ArrowDownCircle className="w-4 h-4 text-destructive shrink-0" />
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{t.description}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(t.transaction_date), 'MMM d, yyyy')}
                    </p>
                  </div>
                </div>
                <span className={`text-sm font-semibold shrink-0 ${t.type === 'income' ? 'text-green-600' : 'text-destructive'}`}>
                  {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                </span>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
