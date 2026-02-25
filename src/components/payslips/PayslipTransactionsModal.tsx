import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { ArrowUpCircle, ArrowDownCircle, FileText, Trash2, Unlink } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency } from '@/lib/taxCalculations';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface LinkedTransaction {
  id: string;
  description: string;
  type: 'income' | 'expense';
  amount: number;
  transaction_date: string;
}

type BulkAction = 'unlink' | 'delete' | null;

interface PayslipTransactionsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  payslipId: string | null;
  payslipLabel: string;
  onUnlinked?: () => void;
}

export default function PayslipTransactionsModal({
  open,
  onOpenChange,
  payslipId,
  payslipLabel,
  onUnlinked,
}: PayslipTransactionsModalProps) {
  const [transactions, setTransactions] = useState<LinkedTransaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [bulkAction, setBulkAction] = useState<BulkAction>(null);
  const [processing, setProcessing] = useState(false);

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

  const handleBulkAction = async () => {
    if (!payslipId || !bulkAction) return;
    setProcessing(true);
    try {
      if (bulkAction === 'delete') {
        const { error } = await supabase
          .from('transactions')
          .delete()
          .eq('payslip_id', payslipId);
        if (error) throw error;
        toast.success(`${transactions.length} transaction(s) deleted`);
      } else {
        const { error } = await supabase
          .from('transactions')
          .update({ payslip_id: null })
          .eq('payslip_id', payslipId);
        if (error) throw error;
        toast.success(`${transactions.length} transaction(s) unlinked`);
      }
      setTransactions([]);
      setBulkAction(null);
      onUnlinked?.();
      onOpenChange(false);
    } catch (err) {
      console.error('Error processing transactions:', err);
      toast.error('Failed to process transactions');
    } finally {
      setProcessing(false);
    }
  };

  const handleUnlinkSingle = async (txId: string) => {
    try {
      const { error } = await supabase
        .from('transactions')
        .update({ payslip_id: null })
        .eq('id', txId);
      if (error) throw error;
      setTransactions(prev => prev.filter(t => t.id !== txId));
      toast.success('Transaction unlinked');
      if (transactions.length <= 1) {
        onUnlinked?.();
      }
    } catch (err) {
      console.error('Error unlinking transaction:', err);
      toast.error('Failed to unlink transaction');
    }
  };

  const confirmTitle = bulkAction === 'delete'
    ? 'Delete All Linked Transactions?'
    : 'Unlink All Transactions?';

  const confirmDesc = bulkAction === 'delete'
    ? `This will permanently delete ${transactions.length} transaction(s) linked to this payslip. The payslip itself will not be affected.`
    : `This will remove the payslip link from ${transactions.length} transaction(s) but keep them in your records.`;

  return (
    <>
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
            <>
              <div className="space-y-2 max-h-[50vh] overflow-y-auto">
                {transactions.map(t => (
                  <div key={t.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      {t.type === 'income' ? (
                        <ArrowUpCircle className="w-4 h-4 text-green-500 shrink-0" />
                      ) : (
                        <ArrowDownCircle className="w-4 h-4 text-destructive shrink-0" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{t.description}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(t.transaction_date), 'MMM d, yyyy')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <span className={`text-sm font-semibold ${t.type === 'income' ? 'text-green-600' : 'text-destructive'}`}>
                        {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        title="Unlink from payslip"
                        onClick={() => handleUnlinkSingle(t.id)}
                      >
                        <Unlink className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex gap-2 mt-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 gap-2"
                  onClick={() => setBulkAction('unlink')}
                >
                  <Unlink className="w-3.5 h-3.5" />
                  Unlink All
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  className="flex-1 gap-2"
                  onClick={() => setBulkAction('delete')}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete All
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!bulkAction} onOpenChange={open => { if (!open) setBulkAction(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmTitle}</AlertDialogTitle>
            <AlertDialogDescription>{confirmDesc}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={processing}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkAction}
              disabled={processing}
              className={bulkAction === 'delete' ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' : ''}
            >
              {processing ? 'Processing...' : bulkAction === 'delete' ? 'Delete All' : 'Unlink All'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
