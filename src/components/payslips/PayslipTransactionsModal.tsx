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
import { ArrowUpCircle, ArrowDownCircle, FileText, Trash2 } from 'lucide-react';
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
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

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

  const handleDeleteAll = async () => {
    if (!payslipId) return;
    setDeleting(true);
    try {
      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('payslip_id', payslipId);
      if (error) throw error;
      toast.success(`${transactions.length} transaction(s) deleted`);
      setTransactions([]);
      setConfirmDelete(false);
      onUnlinked?.();
      onOpenChange(false);
    } catch (err) {
      console.error('Error deleting linked transactions:', err);
      toast.error('Failed to delete transactions');
    } finally {
      setDeleting(false);
    }
  };

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
              <Button
                variant="destructive"
                size="sm"
                className="w-full mt-2 gap-2"
                onClick={() => setConfirmDelete(true)}
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete All Linked Transactions
              </Button>
            </>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete All Linked Transactions?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete {transactions.length} transaction(s) linked to this payslip. The payslip itself will not be affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAll}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? 'Deleting...' : 'Delete All'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
