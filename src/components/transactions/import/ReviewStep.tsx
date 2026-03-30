import { useState, useMemo } from 'react';
import {
  AlertTriangle, Check, X, ChevronDown,
  CheckSquare, Square, MinusSquare,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from '@/components/ui/tooltip';
import { CategoryIcon } from '@/components/CategoryIcon';
import type { TransactionCategory } from '@/hooks/useTransactions';
import type { ParsedTransaction, AccountInfo, ImportSource } from './types';

interface ReviewStepProps {
  transactions: ParsedTransaction[];
  accountInfo: AccountInfo | null;
  source: ImportSource;
  categories: TransactionCategory[];
  onTransactionsChange: (transactions: ParsedTransaction[]) => void;
  onBack: () => void;
  onConfirm: () => void;
}

export function ReviewStep({
  transactions,
  accountInfo,
  source,
  categories,
  onTransactionsChange,
  onBack,
  onConfirm,
}: ReviewStepProps) {
  const [editingId, setEditingId] = useState<string | null>(null);

  const incomeCategories = useMemo(
    () => categories.filter((c) => c.type === 'income'),
    [categories]
  );
  const expenseCategories = useMemo(
    () => categories.filter((c) => c.type === 'expense'),
    [categories]
  );

  const includedCount = transactions.filter((t) => t.included).length;
  const duplicateCount = transactions.filter((t) => t.isDuplicate).length;
  const allIncluded = includedCount === transactions.length;
  const noneIncluded = includedCount === 0;

  const updateTransaction = (id: string, updates: Partial<ParsedTransaction>) => {
    onTransactionsChange(
      transactions.map((t) => {
        if (t.id !== id) return t;
        const updated = { ...t, ...updates };
        // If type changed, reset category
        if (updates.type && updates.type !== t.type) {
          updated.category_id = null;
        }
        return updated;
      })
    );
  };

  const toggleAll = () => {
    const newState = !allIncluded;
    onTransactionsChange(transactions.map((t) => ({ ...t, included: newState })));
  };

  const excludeDuplicates = () => {
    onTransactionsChange(
      transactions.map((t) => ({
        ...t,
        included: t.isDuplicate ? false : t.included,
      }))
    );
  };

  const setCategoryForSelected = (categoryId: string) => {
    onTransactionsChange(
      transactions.map((t) => (t.included ? { ...t, category_id: categoryId } : t))
    );
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 2,
    }).format(amount);

  const getCategoryName = (id: string | null) => {
    if (!id) return null;
    return categories.find((c) => c.id === id);
  };

  return (
    <div className="space-y-4">
      {/* Account Info Banner */}
      {accountInfo?.bank_name && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 text-sm">
          <span className="font-medium">{accountInfo.bank_name}</span>
          {accountInfo.account_number && (
            <span className="text-muted-foreground">
              •••{accountInfo.account_number.slice(-4)}
            </span>
          )}
          {accountInfo.account_name && (
            <span className="text-muted-foreground">— {accountInfo.account_name}</span>
          )}
        </div>
      )}

      {/* Summary Bar */}
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline">
          {transactions.length} transactions found
        </Badge>
        <Badge variant="default" className="bg-primary">
          {includedCount} selected
        </Badge>
        {duplicateCount > 0 && (
          <Badge variant="destructive" className="gap-1">
            <AlertTriangle className="w-3 h-3" />
            {duplicateCount} possible duplicates
          </Badge>
        )}
        <div className="flex-1" />
        {duplicateCount > 0 && (
          <Button variant="ghost" size="sm" onClick={excludeDuplicates}>
            Skip duplicates
          </Button>
        )}
        <Button variant="ghost" size="sm" onClick={toggleAll}>
          {allIncluded ? (
            <><MinusSquare className="w-4 h-4 mr-1" /> Deselect All</>
          ) : (
            <><CheckSquare className="w-4 h-4 mr-1" /> Select All</>
          )}
        </Button>
      </div>

      {/* Transactions Table */}
      <div className="rounded-lg border overflow-hidden">
        <div className="overflow-x-auto max-h-[60vh]">
          <Table>
            <TableHeader className="sticky top-0 bg-background z-10">
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox
                    checked={allIncluded}
                    onCheckedChange={() => toggleAll()}
                  />
                </TableHead>
                <TableHead className="w-28">Date</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="w-24 text-right">Amount</TableHead>
                <TableHead className="w-24">Type</TableHead>
                <TableHead className="w-40">Category</TableHead>
                <TableHead className="w-16" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.map((tx) => {
                const isEditing = editingId === tx.id;
                const cat = getCategoryName(tx.category_id);
                const relevantCats = tx.type === 'income' ? incomeCategories : expenseCategories;

                return (
                  <TableRow
                    key={tx.id}
                    className={`${!tx.included ? 'opacity-40' : ''} ${
                      tx.isDuplicate ? 'bg-yellow-50/50 dark:bg-yellow-900/10' : ''
                    }`}
                  >
                    <TableCell>
                      <Checkbox
                        checked={tx.included}
                        onCheckedChange={(v) =>
                          updateTransaction(tx.id, { included: !!v })
                        }
                      />
                    </TableCell>
                    <TableCell>
                      {isEditing ? (
                        <Input
                          type="date"
                          value={tx.date}
                          className="h-8 w-full text-xs"
                          onChange={(e) =>
                            updateTransaction(tx.id, { date: e.target.value })
                          }
                        />
                      ) : (
                        <span className="text-sm whitespace-nowrap">{tx.date}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {isEditing ? (
                          <Input
                            value={tx.description}
                            className="h-8 text-xs"
                            onChange={(e) =>
                              updateTransaction(tx.id, { description: e.target.value })
                            }
                          />
                        ) : (
                          <span className="text-sm truncate max-w-[200px]">
                            {tx.description}
                          </span>
                        )}
                        {tx.isDuplicate && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger>
                                <AlertTriangle className="w-4 h-4 text-yellow-500 shrink-0" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="text-xs">
                                  Possible duplicate of: {tx.duplicateOf}
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      {isEditing ? (
                        <Input
                          type="number"
                          step="0.01"
                          value={tx.amount}
                          className="h-8 text-xs text-right w-28"
                          onChange={(e) =>
                            updateTransaction(tx.id, {
                              amount: parseFloat(e.target.value) || 0,
                            })
                          }
                        />
                      ) : (
                        <span
                          className={`text-sm font-medium ${
                            tx.type === 'income'
                              ? 'text-green-600'
                              : 'text-destructive'
                          }`}
                        >
                          {formatCurrency(tx.amount)}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Select
                        value={tx.type}
                        onValueChange={(v) =>
                          updateTransaction(tx.id, { type: v as 'income' | 'expense' })
                        }
                      >
                        <SelectTrigger className="h-8 text-xs w-24">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="income">Income</SelectItem>
                          <SelectItem value="expense">Expense</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={tx.category_id || 'none'}
                        onValueChange={(v) =>
                          updateTransaction(tx.id, {
                            category_id: v === 'none' ? null : v,
                          })
                        }
                      >
                        <SelectTrigger className="h-8 text-xs w-36">
                          <SelectValue placeholder="Select...">
                            {cat ? (
                              <span className="flex items-center gap-1.5">
                                {cat.icon && <CategoryIcon iconName={cat.icon} className="w-3 h-3" />}
                                <span className="truncate">{cat.name}</span>
                              </span>
                            ) : (
                              'Select...'
                            )}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No category</SelectItem>
                          {relevantCats.map((c) => (
                            <SelectItem key={c.id} value={c.id}>
                              <span className="flex items-center gap-1.5">
                                {c.icon && <CategoryIcon iconName={c.icon} className="w-3.5 h-3.5" />}
                                {c.name}
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={() =>
                          setEditingId(isEditing ? null : tx.id)
                        }
                      >
                        {isEditing ? (
                          <Check className="w-3.5 h-3.5" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5" />
                        )}
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-between pt-2">
        <Button variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button
          onClick={onConfirm}
          disabled={noneIncluded}
          className="gap-2"
        >
          <Check className="w-4 h-4" />
          Review {includedCount} Transaction{includedCount !== 1 ? 's' : ''}
        </Button>
      </div>
    </div>
  );
}
