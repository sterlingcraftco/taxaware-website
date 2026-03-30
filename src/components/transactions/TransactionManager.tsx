import { useState, useEffect, useCallback, useMemo } from 'react';
import { Plus, Wallet, TrendingUp, TrendingDown, Download, FileSpreadsheet, FileText, FileUp } from 'lucide-react';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useTransactions, Transaction } from '@/hooks/useTransactions';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { TransactionForm } from './TransactionForm';
import { TransactionList } from './TransactionList';
import { DocumentUpload } from './DocumentUpload';
import { TransactionFiltersComponent, TransactionFilters } from './TransactionFilters';
import { exportTransactionsToCSV, exportTransactionsToPDF } from '@/lib/transactionExport';
import { PullToRefresh } from '@/components/ui/pull-to-refresh';
import { useFeatureFlag } from '@/hooks/useFeatureFlag';
import { BankStatementImport } from './import/BankStatementImport';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from '@/components/ui/pagination';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format, isAfter, isBefore, startOfDay, endOfDay } from 'date-fns';

const defaultFilters: TransactionFilters = {
  dateFrom: undefined,
  dateTo: undefined,
  type: 'all',
  categoryId: null,
  taxYear: null,
};

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
    refresh,
  } = useTransactions();

  const [filters, setFilters] = useState<TransactionFilters>(defaultFilters);

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<number | 'all'>(15);

  const [formOpen, setFormOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [transactionToDelete, setTransactionToDelete] = useState<string | null>(null);
  
  // Document upload state
  const [documentDialogOpen, setDocumentDialogOpen] = useState(false);
  const [selectedTransactionForDocs, setSelectedTransactionForDocs] = useState<Transaction | null>(null);
  const [documentCounts, setDocumentCounts] = useState<Record<string, number>>({});
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const { isEnabled: importEnabled } = useFeatureFlag('bank_statement_import');

  // Apply filters to transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter((transaction) => {
      const transactionDate = new Date(transaction.transaction_date);

      // Date range filter
      if (filters.dateFrom && isBefore(transactionDate, startOfDay(filters.dateFrom))) {
        return false;
      }
      if (filters.dateTo && isAfter(transactionDate, endOfDay(filters.dateTo))) {
        return false;
      }

      // Type filter
      if (filters.type !== 'all' && transaction.type !== filters.type) {
        return false;
      }

      // Category filter
      if (filters.categoryId && transaction.category_id !== filters.categoryId) {
        return false;
      }

      // Tax year filter
      if (filters.taxYear && transaction.tax_year !== filters.taxYear) {
        return false;
      }

      return true;
    });
  }, [transactions, filters]);

  // Calculate filtered totals
  const filteredTotals = useMemo(() => {
    return filteredTransactions.reduce(
      (acc, t) => {
        if (t.type === 'income') {
          acc.income += t.amount;
        } else {
          acc.expense += t.amount;
        }
        return acc;
      },
      { income: 0, expense: 0 }
    );
  }, [filteredTransactions]);

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
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const handleRefresh = async () => {
    await refresh();
    toast.success('Transactions refreshed');
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

  const handleUnlinkPayslip = async (id: string) => {
    try {
      const { error } = await supabase
        .from('transactions')
        .update({ payslip_id: null })
        .eq('id', id);
      if (error) throw error;
      toast.success('Transaction unlinked from payslip');
      await refresh();
    } catch (err) {
      console.error('Error unlinking transaction:', err);
      toast.error('Failed to unlink transaction');
    }
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

  // Reset page when filters change
  useEffect(() => { setCurrentPage(1); }, [filters]);

  const netBalance = filteredTotals.income - filteredTotals.expense;
  const hasActiveFilters = filters.dateFrom || filters.dateTo || filters.type !== 'all' || filters.categoryId || filters.taxYear;

  // Pagination logic
  const totalItems = filteredTransactions.length;
  const totalPages = pageSize === 'all' ? 1 : Math.ceil(totalItems / pageSize);
  const paginatedTransactions = pageSize === 'all'
    ? filteredTransactions
    : filteredTransactions.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const getPaginationRange = () => {
    if (totalPages <= 5) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const pages: (number | 'ellipsis')[] = [1];
    if (currentPage > 3) pages.push('ellipsis');
    for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
      pages.push(i);
    }
    if (currentPage < totalPages - 2) pages.push('ellipsis');
    pages.push(totalPages);
    return pages;
  };

  // Export handlers
  const handleExportCSV = () => {
    exportTransactionsToCSV({
      transactions: filteredTransactions,
      categories,
      filters,
      getCategoryById,
    });
  };

  const handleExportPDF = () => {
    exportTransactionsToPDF({
      transactions: filteredTransactions,
      categories,
      filters,
      getCategoryById,
    });
  };

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
                <p className="text-sm text-muted-foreground">
                  {hasActiveFilters ? 'Filtered Income' : 'Total Income'}
                </p>
                <p className="text-xl font-bold text-green-600">
                  {formatCurrency(filteredTotals.income)}
                </p>
                {hasActiveFilters && filteredTotals.income !== totals.income && (
                  <p className="text-xs text-muted-foreground">
                    of {formatCurrency(totals.income)} total
                  </p>
                )}
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
                <p className="text-sm text-muted-foreground">
                  {hasActiveFilters ? 'Filtered Expenses' : 'Total Expenses'}
                </p>
                <p className="text-xl font-bold text-destructive">
                  {formatCurrency(filteredTotals.expense)}
                </p>
                {hasActiveFilters && filteredTotals.expense !== totals.expense && (
                  <p className="text-xs text-muted-foreground">
                    of {formatCurrency(totals.expense)} total
                  </p>
                )}
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
                <p className="text-sm text-muted-foreground">
                  {hasActiveFilters ? 'Filtered Balance' : 'Net Balance'}
                </p>
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
                  {hasActiveFilters
                    ? `Showing ${filteredTransactions.length} of ${transactions.length} transactions`
                    : 'Track your income and expenses'}
                </CardDescription>
              </div>
            </div>
            <div className="flex gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="gap-2">
                    <Download className="w-4 h-4" />
                    <span className="hidden sm:inline">Export</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleExportCSV} className="gap-2">
                    <FileSpreadsheet className="w-4 h-4" />
                    Export as CSV
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleExportPDF} className="gap-2">
                    <FileText className="w-4 h-4" />
                    Export as PDF
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              {importEnabled && (
                <Button variant="outline" onClick={() => setImportDialogOpen(true)} className="gap-2">
                  <FileUp className="w-4 h-4" />
                  <span className="hidden sm:inline">Import</span>
                </Button>
              )}
              <Button onClick={handleAdd} className="gap-2">
                <Plus className="w-4 h-4" />
                Add Transaction
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <TransactionFiltersComponent
            filters={filters}
            onFiltersChange={setFilters}
            categories={categories}
          />

          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              <div className="animate-pulse">Loading transactions...</div>
            </div>
          ) : (
            <div className="md:hidden">
              <PullToRefresh onRefresh={handleRefresh}>
                <TransactionList
                  transactions={paginatedTransactions}
                  getCategoryById={getCategoryById}
                  onEdit={handleEdit}
                  onDelete={handleDeleteClick}
                  onViewDocuments={handleViewDocuments}
                  onUnlinkPayslip={handleUnlinkPayslip}
                  documentCounts={documentCounts}
                />
              </PullToRefresh>
            </div>
          )}
          
          {/* Desktop - no pull to refresh */}
          {!loading && (
            <div className="hidden md:block">
              <TransactionList
                transactions={paginatedTransactions}
                getCategoryById={getCategoryById}
                onEdit={handleEdit}
                onDelete={handleDeleteClick}
                onViewDocuments={handleViewDocuments}
                onUnlinkPayslip={handleUnlinkPayslip}
                documentCounts={documentCounts}
              />
            </div>
          )}

          {/* Pagination Controls */}
          {!loading && filteredTransactions.length > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>Show</span>
                <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(v === 'all' ? 'all' : Number(v)); setCurrentPage(1); }}>
                  <SelectTrigger className="h-8 w-[80px] text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="15">15</SelectItem>
                    <SelectItem value="25">25</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="all">All</SelectItem>
                  </SelectContent>
                </Select>
                <span>
                  of {totalItems} transaction{totalItems !== 1 ? 's' : ''}
                </span>
              </div>
              {totalPages > 1 && (
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                      />
                    </PaginationItem>
                    {getPaginationRange().map((page, i) =>
                      page === 'ellipsis' ? (
                        <PaginationItem key={`e-${i}`}>
                          <PaginationEllipsis />
                        </PaginationItem>
                      ) : (
                        <PaginationItem key={page}>
                          <PaginationLink
                            isActive={currentPage === page}
                            onClick={() => setCurrentPage(page as number)}
                            className="cursor-pointer"
                          >
                            {page}
                          </PaginationLink>
                        </PaginationItem>
                      )
                    )}
                    <PaginationItem>
                      <PaginationNext
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              )}
            </div>
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

      {/* Bank Statement Import */}
      {importEnabled && (
        <BankStatementImport
          open={importDialogOpen}
          onOpenChange={setImportDialogOpen}
          onImportComplete={refresh}
        />
      )}
    </>
  );
}
