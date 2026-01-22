import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useTaxSavings, SavingsTransaction } from '@/hooks/useTaxSavings';
import { ArrowDownLeft, ArrowUpRight, Sparkles, Clock, Loader2 } from 'lucide-react';

export function SavingsTransactionHistory() {
  const { transactions, loading } = useTaxSavings();

  const formatCurrency = (amount: number) => {
    return `NGN ${amount.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const getTransactionIcon = (type: SavingsTransaction['type']) => {
    switch (type) {
      case 'deposit':
        return <ArrowDownLeft className="h-4 w-4 text-green-500" />;
      case 'withdrawal':
        return <ArrowUpRight className="h-4 w-4 text-red-500" />;
      case 'interest':
        return <Sparkles className="h-4 w-4 text-amber-500" />;
      case 'withdrawal_request':
        return <Clock className="h-4 w-4 text-blue-500" />;
    }
  };

  const getTransactionColor = (type: SavingsTransaction['type']) => {
    switch (type) {
      case 'deposit':
      case 'interest':
        return 'text-green-600';
      case 'withdrawal':
      case 'withdrawal_request':
        return 'text-red-600';
    }
  };

  const getTransactionLabel = (type: SavingsTransaction['type']) => {
    switch (type) {
      case 'deposit':
        return 'Deposit';
      case 'withdrawal':
        return 'Withdrawal';
      case 'interest':
        return 'Interest';
      case 'withdrawal_request':
        return 'Pending Withdrawal';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-48">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Transaction History</CardTitle>
      </CardHeader>
      <CardContent>
        {transactions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Sparkles className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No transactions yet</p>
            <p className="text-sm">Make your first deposit to start saving</p>
          </div>
        ) : (
          <div className="space-y-3">
            {transactions.map((transaction) => (
              <div
                key={transaction.id}
                className="flex items-center justify-between py-3 border-b last:border-0"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-muted">
                    {getTransactionIcon(transaction.type)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{getTransactionLabel(transaction.type)}</span>
                      {transaction.type === 'interest' && (
                        <Badge variant="secondary" className="text-xs">Quarterly</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(transaction.created_at), 'MMM d, yyyy • h:mm a')}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`font-semibold ${getTransactionColor(transaction.type)}`}>
                    {transaction.type === 'deposit' || transaction.type === 'interest' ? '+' : '-'}
                    {formatCurrency(transaction.amount)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Balance: {formatCurrency(transaction.balance_after)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
