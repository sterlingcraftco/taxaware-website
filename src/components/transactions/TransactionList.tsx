import { format } from 'date-fns';
import { MoreHorizontal, Pencil, Trash2, ArrowUpCircle, ArrowDownCircle, Paperclip } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { CategoryIcon } from '@/components/CategoryIcon';
import type { Transaction, TransactionCategory } from '@/hooks/useTransactions';

interface TransactionListProps {
  transactions: Transaction[];
  getCategoryById: (id: string | null) => TransactionCategory | null;
  onEdit: (transaction: Transaction) => void;
  onDelete: (id: string) => void;
  onViewDocuments: (transaction: Transaction) => void;
  documentCounts?: Record<string, number>;
}

export function TransactionList({
  transactions,
  getCategoryById,
  onEdit,
  onDelete,
  onViewDocuments,
  documentCounts = {},
}: TransactionListProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  if (transactions.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <ArrowUpCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
        <p className="text-sm">No transactions yet</p>
        <p className="text-xs mt-1">Click "Add Transaction" to get started</p>
      </div>
    );
  }

  return (
    <>
      {/* Mobile Card Layout */}
      <div className="md:hidden space-y-3">
        {transactions.map((transaction) => {
          const category = getCategoryById(transaction.category_id);
          return (
            <div
              key={transaction.id}
              className="border rounded-lg p-4 bg-card"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  {transaction.type === 'income' ? (
                    <ArrowUpCircle className="w-5 h-5 text-green-500" />
                  ) : (
                    <ArrowDownCircle className="w-5 h-5 text-destructive" />
                  )}
                  <div>
                    <p className="font-medium text-sm">{transaction.description}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(transaction.transaction_date), 'MMM d, yyyy')}
                    </p>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-background border shadow-lg">
                    <DropdownMenuItem onClick={() => onViewDocuments(transaction)}>
                      <Paperclip className="mr-2 h-4 w-4" />
                      Documents
                      {documentCounts[transaction.id] > 0 && (
                        <Badge variant="secondary" className="ml-2 h-5 px-1.5">
                          {documentCounts[transaction.id]}
                        </Badge>
                      )}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => onEdit(transaction)}>
                      <Pencil className="mr-2 h-4 w-4" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => onDelete(transaction.id)}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {category && (
                    <Badge variant="secondary" className="text-xs flex items-center gap-1">
                      <CategoryIcon name={category.icon} className="w-3 h-3" />
                      {category.name}
                    </Badge>
                  )}
                  {documentCounts[transaction.id] > 0 && (
                    <Badge 
                      variant="outline" 
                      className="text-xs cursor-pointer hover:bg-muted"
                      onClick={() => onViewDocuments(transaction)}
                    >
                      <Paperclip className="w-3 h-3 mr-1" />
                      {documentCounts[transaction.id]}
                    </Badge>
                  )}
                </div>
                <p
                  className={cn(
                    'font-semibold',
                    transaction.type === 'income' ? 'text-green-600' : 'text-destructive'
                  )}
                >
                  {transaction.type === 'income' ? '+' : '-'}
                  {formatCurrency(transaction.amount)}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Desktop Table Layout */}
      <div className="hidden md:block overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[100px]">Date</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead className="w-[60px]">Docs</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions.map((transaction) => {
              const category = getCategoryById(transaction.category_id);
              return (
                <TableRow key={transaction.id}>
                  <TableCell className="whitespace-nowrap">
                    {format(new Date(transaction.transaction_date), 'MMM d, yyyy')}
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{transaction.description}</p>
                      {transaction.notes && (
                        <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                          {transaction.notes}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {category ? (
                      <Badge variant="secondary" className="flex items-center gap-1 w-fit">
                        <CategoryIcon name={category.icon} className="w-3.5 h-3.5" />
                        {category.name}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={transaction.type === 'income' ? 'default' : 'destructive'}
                      className={cn(
                        transaction.type === 'income' && 'bg-green-600 hover:bg-green-700'
                      )}
                    >
                      {transaction.type === 'income' ? (
                        <ArrowUpCircle className="w-3 h-3 mr-1" />
                      ) : (
                        <ArrowDownCircle className="w-3 h-3 mr-1" />
                      )}
                      {transaction.type}
                    </Badge>
                  </TableCell>
                  <TableCell
                    className={cn(
                      'text-right font-semibold',
                      transaction.type === 'income' ? 'text-green-600' : 'text-destructive'
                    )}
                  >
                    {transaction.type === 'income' ? '+' : '-'}
                    {formatCurrency(transaction.amount)}
                  </TableCell>
                  <TableCell>
                    {documentCounts[transaction.id] > 0 ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2"
                        onClick={() => onViewDocuments(transaction)}
                      >
                        <Paperclip className="w-4 h-4 mr-1" />
                        {documentCounts[transaction.id]}
                      </Button>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2 text-muted-foreground"
                        onClick={() => onViewDocuments(transaction)}
                      >
                        <Paperclip className="w-4 h-4" />
                      </Button>
                    )}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-background border shadow-lg">
                        <DropdownMenuItem onClick={() => onViewDocuments(transaction)}>
                          <Paperclip className="mr-2 h-4 w-4" />
                          Documents
                          {documentCounts[transaction.id] > 0 && (
                            <Badge variant="secondary" className="ml-2 h-5 px-1.5">
                              {documentCounts[transaction.id]}
                            </Badge>
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => onEdit(transaction)}>
                          <Pencil className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => onDelete(transaction.id)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
