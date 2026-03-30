import { useState } from 'react';
import { Check, Loader2, TrendingUp, TrendingDown, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import type { ParsedTransaction, ImportSource } from './types';

interface ConfirmStepProps {
  transactions: ParsedTransaction[];
  source: ImportSource;
  onBack: () => void;
  onComplete: () => void;
}

export function ConfirmStep({ transactions, source, onBack, onComplete }: ConfirmStepProps) {
  const [importing, setImporting] = useState(false);

  const included = transactions.filter((t) => t.included);
  const incomeItems = included.filter((t) => t.type === 'income');
  const expenseItems = included.filter((t) => t.type === 'expense');
  const skipped = transactions.length - included.length;

  const totalIncome = incomeItems.reduce((s, t) => s + t.amount, 0);
  const totalExpenses = expenseItems.reduce((s, t) => s + t.amount, 0);

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 2,
    }).format(amount);

  const handleImport = async () => {
    setImporting(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');

      const userId = userData.user.id;

      // Build transaction records
      const records = included.map((tx) => ({
        user_id: userId,
        description: tx.description,
        amount: tx.amount,
        type: tx.type as 'income' | 'expense',
        category_id: tx.category_id || null,
        transaction_date: tx.date,
        tax_year: parseInt(tx.date.split('-')[0]),
        status: 'completed' as const,
        notes: `Imported from ${source.type}${source.fileName ? ` (${source.fileName})` : ''}`,
      }));

      // Batch insert in chunks of 50
      const chunkSize = 50;
      for (let i = 0; i < records.length; i += chunkSize) {
        const chunk = records.slice(i, i + chunkSize);
        const { error } = await supabase.from('transactions').insert(chunk);
        if (error) throw error;
      }

      toast.success(`Successfully imported ${included.length} transactions!`);
      onComplete();
    } catch (err) {
      console.error('Import error:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to import transactions');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <TrendingUp className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Income</p>
                <p className="text-lg font-bold text-green-600">
                  {formatCurrency(totalIncome)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {incomeItems.length} transaction{incomeItems.length !== 1 ? 's' : ''}
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
                <p className="text-sm text-muted-foreground">Expenses</p>
                <p className="text-lg font-bold text-destructive">
                  {formatCurrency(totalExpenses)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {expenseItems.length} transaction{expenseItems.length !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-1">Summary</p>
              <p className="text-2xl font-bold">{included.length}</p>
              <p className="text-xs text-muted-foreground">
                transactions to import
                {skipped > 0 && ` (${skipped} skipped)`}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Date Range */}
      {included.length > 0 && (
        <div className="text-sm text-muted-foreground text-center">
          Date range: {included[included.length - 1]?.date} → {included[0]?.date}
          {source.fileName && (
            <span className="ml-2">
              • Source: <span className="font-medium">{source.fileName}</span>
            </span>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={onBack} disabled={importing}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Review
        </Button>
        <Button
          onClick={handleImport}
          disabled={importing || included.length === 0}
          className="gap-2"
        >
          {importing ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Importing...
            </>
          ) : (
            <>
              <Check className="w-4 h-4" />
              Import {included.length} Transactions
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
