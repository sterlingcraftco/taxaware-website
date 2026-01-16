import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import type { TransactionCategory } from '@/hooks/useTransactions';
import {
  RecurringTransaction,
  FREQUENCY_OPTIONS,
  RecurrenceFrequency,
} from '@/hooks/useRecurringTransactions';

const formSchema = z.object({
  description: z.string().min(1, 'Description is required'),
  amount: z.number().positive('Amount must be positive'),
  type: z.enum(['income', 'expense']),
  category_id: z.string().optional(),
  frequency: z.enum(['daily', 'weekly', 'bi-weekly', 'monthly', 'quarterly', 'annually']),
  start_date: z.date(),
  end_date: z.date().optional().nullable(),
  notes: z.string().optional(),
  is_active: z.boolean(),
});

type FormValues = z.infer<typeof formSchema>;

interface RecurringTransactionFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction?: RecurringTransaction | null;
  categories: TransactionCategory[];
  onSubmit: (data: FormValues) => Promise<void>;
}

export function RecurringTransactionForm({
  open,
  onOpenChange,
  transaction,
  categories,
  onSubmit,
}: RecurringTransactionFormProps) {
  const [loading, setLoading] = useState(false);
  const isEditing = !!transaction;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      description: '',
      amount: 0,
      type: 'expense',
      category_id: undefined,
      frequency: 'monthly',
      start_date: new Date(),
      end_date: null,
      notes: '',
      is_active: true,
    },
  });

  useEffect(() => {
    if (transaction) {
      form.reset({
        description: transaction.description,
        amount: transaction.amount,
        type: transaction.type,
        category_id: transaction.category_id || undefined,
        frequency: transaction.frequency as RecurrenceFrequency,
        start_date: new Date(transaction.start_date),
        end_date: transaction.end_date ? new Date(transaction.end_date) : null,
        notes: transaction.notes || '',
        is_active: transaction.is_active ?? true,
      });
    } else {
      form.reset({
        description: '',
        amount: 0,
        type: 'expense',
        category_id: undefined,
        frequency: 'monthly',
        start_date: new Date(),
        end_date: null,
        notes: '',
        is_active: true,
      });
    }
  }, [transaction, form]);

  const selectedType = form.watch('type');
  const filteredCategories = categories.filter(c => c.type === selectedType);

  const handleSubmit = async (data: FormValues) => {
    setLoading(true);
    try {
      await onSubmit(data);
      onOpenChange(false);
      form.reset();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Edit Recurring Entry' : 'Add Recurring Entry'}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            {/* Type Selection */}
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Type</FormLabel>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant={field.value === 'income' ? 'default' : 'outline'}
                      className={cn(
                        'flex-1',
                        field.value === 'income' && 'bg-green-600 hover:bg-green-700'
                      )}
                      onClick={() => {
                        field.onChange('income');
                        form.setValue('category_id', undefined);
                      }}
                    >
                      Income
                    </Button>
                    <Button
                      type="button"
                      variant={field.value === 'expense' ? 'default' : 'outline'}
                      className={cn(
                        'flex-1',
                        field.value === 'expense' && 'bg-destructive hover:bg-destructive/90'
                      )}
                      onClick={() => {
                        field.onChange('expense');
                        form.setValue('category_id', undefined);
                      }}
                    >
                      Expense
                    </Button>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Description */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Monthly salary" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Amount */}
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount (₦)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      inputMode="decimal"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      {...field}
                      value={field.value || ''}
                      onChange={(e) => {
                        const value = e.target.value;
                        // Allow decimal input with up to 2 decimal places
                        if (value === '' || /^\d*\.?\d{0,2}$/.test(value)) {
                          field.onChange(parseFloat(value) || 0);
                        }
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Frequency */}
            <FormField
              control={form.control}
              name="frequency"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Frequency</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select frequency" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {FREQUENCY_OPTIONS.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Category */}
            <FormField
              control={form.control}
              name="category_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <Select
                    value={field.value || ''}
                    onValueChange={value => field.onChange(value || undefined)}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {filteredCategories.map(category => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.icon && <span className="mr-2">{category.icon}</span>}
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Start Date */}
            <FormField
              control={form.control}
              name="start_date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Start Date</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn(
                            'w-full pl-3 text-left font-normal',
                            !field.value && 'text-muted-foreground'
                          )}
                        >
                          {field.value ? format(field.value, 'PPP') : <span>Pick a date</span>}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* End Date (Optional) */}
            <FormField
              control={form.control}
              name="end_date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>End Date (Optional)</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn(
                            'w-full pl-3 text-left font-normal',
                            !field.value && 'text-muted-foreground'
                          )}
                        >
                          {field.value ? format(field.value, 'PPP') : <span>No end date</span>}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value ?? undefined}
                        onSelect={field.onChange}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Active Toggle */}
            <FormField
              control={form.control}
              name="is_active"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <FormLabel>Active</FormLabel>
                    <p className="text-sm text-muted-foreground">
                      Automatically generate transactions on schedule
                    </p>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

            {/* Notes */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Add any additional notes..."
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" className="flex-1" disabled={loading}>
                {loading ? 'Saving...' : isEditing ? 'Update' : 'Add'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
