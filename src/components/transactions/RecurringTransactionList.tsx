import { format } from 'date-fns';
import {
  Edit,
  Trash2,
  Play,
  Pause,
  RefreshCw,
  CalendarClock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import type { RecurringTransaction, FREQUENCY_OPTIONS } from '@/hooks/useRecurringTransactions';
import type { TransactionCategory } from '@/hooks/useTransactions';

interface RecurringTransactionListProps {
  transactions: RecurringTransaction[];
  getCategoryById: (id: string | null) => TransactionCategory | null;
  onEdit: (transaction: RecurringTransaction) => void;
  onDelete: (id: string) => void;
  onToggleActive: (id: string, isActive: boolean) => void;
  onProcessNow: (id: string) => void;
}

const FREQUENCY_LABELS: Record<string, string> = {
  daily: 'Daily',
  weekly: 'Weekly',
  'bi-weekly': 'Bi-Weekly',
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  annually: 'Annually',
};

export function RecurringTransactionList({
  transactions,
  getCategoryById,
  onEdit,
  onDelete,
  onToggleActive,
  onProcessNow,
}: RecurringTransactionListProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  if (transactions.length === 0) {
    return (
      <div className="text-center py-12">
        <CalendarClock className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
        <p className="text-muted-foreground mb-2">No recurring entries yet</p>
        <p className="text-sm text-muted-foreground">
          Add recurring income or expenses to automate your tracking
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Description</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead className="hidden sm:table-cell">Frequency</TableHead>
            <TableHead className="hidden md:table-cell">Next</TableHead>
            <TableHead className="hidden lg:table-cell">Category</TableHead>
            <TableHead>Active</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {transactions.map(transaction => {
            const category = getCategoryById(transaction.category_id);
            const isActive = transaction.is_active ?? true;

            return (
              <TableRow
                key={transaction.id}
                className={cn(!isActive && 'opacity-60')}
              >
                <TableCell>
                  <div className="font-medium">{transaction.description}</div>
                  <div className="text-sm text-muted-foreground sm:hidden">
                    {FREQUENCY_LABELS[transaction.frequency] || transaction.frequency}
                  </div>
                </TableCell>
                <TableCell>
                  <span
                    className={cn(
                      'font-semibold',
                      transaction.type === 'income'
                        ? 'text-green-600'
                        : 'text-destructive'
                    )}
                  >
                    {transaction.type === 'income' ? '+' : '-'}
                    {formatCurrency(transaction.amount)}
                  </span>
                </TableCell>
                <TableCell className="hidden sm:table-cell">
                  <Badge variant="outline">
                    {FREQUENCY_LABELS[transaction.frequency] || transaction.frequency}
                  </Badge>
                </TableCell>
                <TableCell className="hidden md:table-cell text-muted-foreground">
                  {format(new Date(transaction.next_occurrence), 'MMM d, yyyy')}
                </TableCell>
                <TableCell className="hidden lg:table-cell">
                  {category ? (
                    <Badge
                      variant="secondary"
                      style={{
                        backgroundColor: category.color
                          ? `${category.color}20`
                          : undefined,
                        color: category.color || undefined,
                      }}
                    >
                      {category.icon && <span className="mr-1">{category.icon}</span>}
                      {category.name}
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell>
                  <Switch
                    checked={isActive}
                    onCheckedChange={checked => onToggleActive(transaction.id, checked)}
                    aria-label={isActive ? 'Deactivate' : 'Activate'}
                  />
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onProcessNow(transaction.id)}
                      title="Generate transaction now"
                      disabled={!isActive}
                    >
                      <RefreshCw className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onEdit(transaction)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onDelete(transaction.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
