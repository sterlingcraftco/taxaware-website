import { useState } from 'react';
import { Plus, CalendarClock } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
import {
  useRecurringTransactions,
  RecurringTransaction,
} from '@/hooks/useRecurringTransactions';
import { useTransactions } from '@/hooks/useTransactions';
import { RecurringTransactionForm } from './RecurringTransactionForm';
import { RecurringTransactionList } from './RecurringTransactionList';
import { format } from 'date-fns';

export function RecurringTransactionManager() {
  const {
    recurringTransactions,
    loading,
    addRecurringTransaction,
    updateRecurringTransaction,
    deleteRecurringTransaction,
    toggleActive,
    processNow,
  } = useRecurringTransactions();

  const { categories, getCategoryById, refresh: refreshTransactions } = useTransactions();

  const [formOpen, setFormOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<RecurringTransaction | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [transactionToDelete, setTransactionToDelete] = useState<string | null>(null);

  const handleAdd = () => {
    setEditingTransaction(null);
    setFormOpen(true);
  };

  const handleEdit = (transaction: RecurringTransaction) => {
    setEditingTransaction(transaction);
    setFormOpen(true);
  };

  const handleDeleteClick = (id: string) => {
    setTransactionToDelete(id);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (transactionToDelete) {
      await deleteRecurringTransaction(transactionToDelete);
    }
    setDeleteDialogOpen(false);
    setTransactionToDelete(null);
  };

  const handleProcessNow = async (id: string) => {
    await processNow(id);
    // Refresh the transactions list to show the newly created one
    refreshTransactions();
  };

  const handleSubmit = async (data: {
    description: string;
    amount: number;
    type: 'income' | 'expense';
    category_id?: string;
    frequency: 'daily' | 'weekly' | 'bi-weekly' | 'monthly' | 'quarterly' | 'annually';
    start_date: Date;
    end_date?: Date | null;
    notes?: string;
    is_active: boolean;
  }) => {
    const startDateStr = format(data.start_date, 'yyyy-MM-dd');
    
    const payload = {
      description: data.description,
      amount: data.amount,
      type: data.type,
      category_id: data.category_id || null,
      frequency: data.frequency,
      start_date: startDateStr,
      next_occurrence: startDateStr, // Start with the same date
      end_date: data.end_date ? format(data.end_date, 'yyyy-MM-dd') : null,
      notes: data.notes || null,
      is_active: data.is_active,
    };

    if (editingTransaction) {
      await updateRecurringTransaction(editingTransaction.id, payload);
    } else {
      await addRecurringTransaction(payload);
    }
  };

  const activeCount = recurringTransactions.filter(t => t.is_active).length;
  const totalMonthlyEstimate = recurringTransactions
    .filter(t => t.is_active)
    .reduce((sum, t) => {
      let monthlyAmount = t.amount;
      switch (t.frequency) {
        case 'daily':
          monthlyAmount = t.amount * 30;
          break;
        case 'weekly':
          monthlyAmount = t.amount * 4;
          break;
        case 'bi-weekly':
          monthlyAmount = t.amount * 2;
          break;
        case 'quarterly':
          monthlyAmount = t.amount / 3;
          break;
        case 'annually':
          monthlyAmount = t.amount / 12;
          break;
      }
      return sum + (t.type === 'income' ? monthlyAmount : -monthlyAmount);
    }, 0);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
    }).format(Math.abs(amount));
  };

  return (
    <>
      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <CalendarClock className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Active Entries</p>
                <p className="text-xl font-bold">{activeCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${totalMonthlyEstimate >= 0 ? 'bg-green-500/10' : 'bg-destructive/10'}`}>
                <CalendarClock className={`w-5 h-5 ${totalMonthlyEstimate >= 0 ? 'text-green-500' : 'text-destructive'}`} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Est. Monthly Net</p>
                <p className={`text-xl font-bold ${totalMonthlyEstimate >= 0 ? 'text-green-600' : 'text-destructive'}`}>
                  {totalMonthlyEstimate >= 0 ? '+' : '-'}{formatCurrency(totalMonthlyEstimate)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* List Card */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 sm:p-3 rounded-lg bg-primary/10">
                <CalendarClock className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base sm:text-lg">Recurring Entries</CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  Automated income and expense tracking
                </CardDescription>
              </div>
            </div>
            <Button onClick={handleAdd} className="gap-2">
              <Plus className="w-4 h-4" />
              Add Recurring
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              <div className="animate-pulse">Loading...</div>
            </div>
          ) : (
            <RecurringTransactionList
              transactions={recurringTransactions}
              getCategoryById={getCategoryById}
              onEdit={handleEdit}
              onDelete={handleDeleteClick}
              onToggleActive={toggleActive}
              onProcessNow={handleProcessNow}
            />
          )}
        </CardContent>
      </Card>

      {/* Form Dialog */}
      <RecurringTransactionForm
        open={formOpen}
        onOpenChange={setFormOpen}
        transaction={editingTransaction}
        categories={categories}
        onSubmit={handleSubmit}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Recurring Entry</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this recurring entry? This will not delete any transactions already generated. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
