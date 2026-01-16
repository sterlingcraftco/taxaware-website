import { useState, useEffect, useCallback } from 'react';
import { Plus, Wallet, TrendingUp, TrendingDown } from 'lucide-react';
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
import { useTransactions, Transaction } from '@/hooks/useTransactions';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { TransactionForm } from './TransactionForm';
import { TransactionList } from './TransactionList';
import { DocumentUpload } from './DocumentUpload';
import { format } from 'date-fns';

export function TransactionManager() {
  const {
    transactions,
    categories,
    loading,
    totals,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    getCategoryById,
  } = useTransactions();

  const [formOpen, setFormOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [transactionToDelete, setTransactionToDelete] = useState<string | null>(null);
  
  // Document upload state
  const [documentDialogOpen, setDocumentDialogOpen] = useState(false);
  const [selectedTransactionForDocs, setSelectedTransactionForDocs] = useState<Transaction | null>(null);
  const [documentCounts, setDocumentCounts] = useState<Record<string, number>>({});

  // Fetch document counts for all transactions
  const fetchDocumentCounts = useCallback(async () => {
    if (transactions.length === 0) {
      setDocumentCounts({});
      return;
    }

    try {
      const { data, error } = await supabase
        .from('transaction_documents')
        .select('transaction_id');

      if (error) throw error;

      // Count documents per transaction
      const counts: Record<string, number> = {};
      (data || []).forEach(doc => {
        counts[doc.transaction_id] = (counts[doc.transaction_id] || 0) + 1;
      });
      setDocumentCounts(counts);
    } catch (error) {
      console.error('Error fetching document counts:', error);
    }
  }, [transactions.length]);

  useEffect(() => {
    fetchDocumentCounts();
  }, [fetchDocumentCounts]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const handleAdd = () => {
    setEditingTransaction(null);
    setFormOpen(true);
  };

  const handleEdit = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setFormOpen(true);
  };

  const handleDeleteClick = (id: string) => {
    setTransactionToDelete(id);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (transactionToDelete) {
      await deleteTransaction(transactionToDelete);
    }
    setDeleteDialogOpen(false);
    setTransactionToDelete(null);
  };

  const handleViewDocuments = (transaction: Transaction) => {
    setSelectedTransactionForDocs(transaction);
    setDocumentDialogOpen(true);
  };

  const handleDocumentDialogClose = (open: boolean) => {
    setDocumentDialogOpen(open);
    if (!open) {
      // Refresh document counts when dialog closes
      fetchDocumentCounts();
    }
  };

  // Upload files for a transaction
  const uploadFilesForTransaction = async (transactionId: string, files: File[]) => {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;

    const userId = userData.user.id;

    for (const file of files) {
      try {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `${userId}/${transactionId}/${fileName}`;

        // Upload to storage
        const { error: uploadError } = await supabase.storage
          .from('transaction-documents')
          .upload(filePath, file);

        if (uploadError) {
          console.error('Upload error:', uploadError);
          continue;
        }

        // Create database record
        await supabase.from('transaction_documents').insert({
          transaction_id: transactionId,
          user_id: userId,
          file_name: file.name,
          file_path: filePath,
          file_size: file.size,
          mime_type: file.type,
        });
      } catch (error) {
        console.error('Error uploading file:', error);
      }
    }
  };

  const handleSubmit = async (
    data: {
      description: string;
      amount: number;
      type: 'income' | 'expense';
      category_id?: string;
      transaction_date: Date;
      notes?: string;
    },
    pendingFiles?: File[]
  ) => {
    const payload = {
      description: data.description,
      amount: data.amount,
      type: data.type,
      category_id: data.category_id || null,
      transaction_date: format(data.transaction_date, 'yyyy-MM-dd'),
      notes: data.notes || null,
    };

    let transactionId: string | null = null;

    if (editingTransaction) {
      await updateTransaction(editingTransaction.id, payload);
      transactionId = editingTransaction.id;
    } else {
      const newTransaction = await addTransaction(payload);
      transactionId = newTransaction?.id || null;
    }

    // Upload pending files if any
    if (transactionId && pendingFiles && pendingFiles.length > 0) {
      await uploadFilesForTransaction(transactionId, pendingFiles);
      toast.success(`${pendingFiles.length} document${pendingFiles.length !== 1 ? 's' : ''} uploaded`);
      fetchDocumentCounts();
    }
  };

  const netBalance = totals.income - totals.expense;

  return (
    <>
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <TrendingUp className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Income</p>
                <p className="text-xl font-bold text-green-600">
                  {formatCurrency(totals.income)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-destructive/10">
                <TrendingDown className="w-5 h-5 text-destructive" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Expenses</p>
                <p className="text-xl font-bold text-destructive">
                  {formatCurrency(totals.expense)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Wallet className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Net Balance</p>
                <p className={`text-xl font-bold ${netBalance >= 0 ? 'text-green-600' : 'text-destructive'}`}>
                  {formatCurrency(netBalance)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Transactions List Card */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 sm:p-3 rounded-lg bg-primary/10">
                <Wallet className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base sm:text-lg">Transactions</CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  Track your income and expenses
                </CardDescription>
              </div>
            </div>
            <Button onClick={handleAdd} className="gap-2">
              <Plus className="w-4 h-4" />
              Add Transaction
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              <div className="animate-pulse">Loading transactions...</div>
            </div>
          ) : (
            <TransactionList
              transactions={transactions}
              getCategoryById={getCategoryById}
              onEdit={handleEdit}
              onDelete={handleDeleteClick}
              onViewDocuments={handleViewDocuments}
              documentCounts={documentCounts}
            />
          )}
        </CardContent>
      </Card>

      {/* Transaction Form Dialog */}
      <TransactionForm
        open={formOpen}
        onOpenChange={setFormOpen}
        transaction={editingTransaction}
        categories={categories}
        onSubmit={handleSubmit}
      />

      {/* Document Upload Dialog */}
      <DocumentUpload
        open={documentDialogOpen}
        onOpenChange={handleDocumentDialogClose}
        transactionId={selectedTransactionForDocs?.id || null}
        transactionDescription={selectedTransactionForDocs?.description}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Transaction</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this transaction? This action cannot be undone.
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
