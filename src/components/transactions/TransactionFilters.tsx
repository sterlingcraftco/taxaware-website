import { useState } from 'react';
import { Calendar, Filter, X, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
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
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import type { TransactionCategory } from '@/hooks/useTransactions';

export interface TransactionFilters {
  dateFrom: Date | undefined;
  dateTo: Date | undefined;
  type: 'all' | 'income' | 'expense';
  categoryId: string | null;
  taxYear: number | null;
}

interface TransactionFiltersProps {
  filters: TransactionFilters;
  onFiltersChange: (filters: TransactionFilters) => void;
  categories: TransactionCategory[];
}

const currentYear = new Date().getFullYear();
const taxYears = Array.from({ length: 5 }, (_, i) => currentYear - i);

export function TransactionFiltersComponent({
  filters,
  onFiltersChange,
  categories,
}: TransactionFiltersProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const activeFilterCount = [
    filters.dateFrom,
    filters.dateTo,
    filters.type !== 'all',
    filters.categoryId,
    filters.taxYear,
  ].filter(Boolean).length;

  const clearFilters = () => {
    onFiltersChange({
      dateFrom: undefined,
      dateTo: undefined,
      type: 'all',
      categoryId: null,
      taxYear: null,
    });
  };

  const updateFilter = <K extends keyof TransactionFilters>(
    key: K,
    value: TransactionFilters[K]
  ) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  return (
    <div className="space-y-3">
      {/* Filter Toggle Button */}
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsExpanded(!isExpanded)}
          className="gap-2"
        >
          <Filter className="w-4 h-4" />
          Filters
          {activeFilterCount > 0 && (
            <Badge variant="secondary" className="ml-1 h-5 px-1.5">
              {activeFilterCount}
            </Badge>
          )}
          <ChevronDown
            className={cn(
              'w-4 h-4 transition-transform',
              isExpanded && 'rotate-180'
            )}
          />
        </Button>

        {activeFilterCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="gap-1 text-muted-foreground"
          >
            <X className="w-4 h-4" />
            Clear all
          </Button>
        )}
      </div>

      {/* Expanded Filter Panel */}
      {isExpanded && (
        <div className="p-4 border rounded-lg bg-muted/30 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Date Range */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Date From</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !filters.dateFrom && 'text-muted-foreground'
                    )}
                  >
                    <Calendar className="mr-2 h-4 w-4" />
                    {filters.dateFrom
                      ? format(filters.dateFrom, 'MMM d, yyyy')
                      : 'Select date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={filters.dateFrom}
                    onSelect={(date) => updateFilter('dateFrom', date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Date To</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !filters.dateTo && 'text-muted-foreground'
                    )}
                  >
                    <Calendar className="mr-2 h-4 w-4" />
                    {filters.dateTo
                      ? format(filters.dateTo, 'MMM d, yyyy')
                      : 'Select date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={filters.dateTo}
                    onSelect={(date) => updateFilter('dateTo', date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Transaction Type */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Type</Label>
              <Select
                value={filters.type}
                onValueChange={(value: 'all' | 'income' | 'expense') =>
                  updateFilter('type', value)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All types</SelectItem>
                  <SelectItem value="income">Income</SelectItem>
                  <SelectItem value="expense">Expense</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Category */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Category</Label>
              <Select
                value={filters.categoryId || 'all'}
                onValueChange={(value) =>
                  updateFilter('categoryId', value === 'all' ? null : value)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="All categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All categories</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.icon} {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Tax Year - Second Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Tax Year</Label>
              <Select
                value={filters.taxYear?.toString() || 'all'}
                onValueChange={(value) =>
                  updateFilter('taxYear', value === 'all' ? null : parseInt(value))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="All years" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All years</SelectItem>
                  {taxYears.map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Active Filters Summary */}
          {activeFilterCount > 0 && (
            <div className="flex flex-wrap gap-2 pt-2 border-t">
              {filters.dateFrom && (
                <Badge variant="secondary" className="gap-1">
                  From: {format(filters.dateFrom, 'MMM d, yyyy')}
                  <X
                    className="w-3 h-3 cursor-pointer"
                    onClick={() => updateFilter('dateFrom', undefined)}
                  />
                </Badge>
              )}
              {filters.dateTo && (
                <Badge variant="secondary" className="gap-1">
                  To: {format(filters.dateTo, 'MMM d, yyyy')}
                  <X
                    className="w-3 h-3 cursor-pointer"
                    onClick={() => updateFilter('dateTo', undefined)}
                  />
                </Badge>
              )}
              {filters.type !== 'all' && (
                <Badge variant="secondary" className="gap-1 capitalize">
                  {filters.type}
                  <X
                    className="w-3 h-3 cursor-pointer"
                    onClick={() => updateFilter('type', 'all')}
                  />
                </Badge>
              )}
              {filters.categoryId && (
                <Badge variant="secondary" className="gap-1">
                  {categories.find((c) => c.id === filters.categoryId)?.name || 'Category'}
                  <X
                    className="w-3 h-3 cursor-pointer"
                    onClick={() => updateFilter('categoryId', null)}
                  />
                </Badge>
              )}
              {filters.taxYear && (
                <Badge variant="secondary" className="gap-1">
                  Tax Year: {filters.taxYear}
                  <X
                    className="w-3 h-3 cursor-pointer"
                    onClick={() => updateFilter('taxYear', null)}
                  />
                </Badge>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
