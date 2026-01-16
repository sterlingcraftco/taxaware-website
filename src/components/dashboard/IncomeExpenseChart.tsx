import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { TrendingUp, TrendingDown } from 'lucide-react';
import type { Transaction } from '@/hooks/useTransactions';

interface IncomeExpenseChartProps {
  transactions: Transaction[];
}

export function IncomeExpenseChart({ transactions }: IncomeExpenseChartProps) {
  // Group transactions by month
  const monthlyData = transactions.reduce((acc, t) => {
    const date = new Date(t.transaction_date);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const monthLabel = date.toLocaleDateString('en-NG', { month: 'short', year: '2-digit' });
    
    if (!acc[monthKey]) {
      acc[monthKey] = { month: monthLabel, monthKey, income: 0, expense: 0 };
    }
    
    if (t.type === 'income') {
      acc[monthKey].income += t.amount;
    } else {
      acc[monthKey].expense += t.amount;
    }
    
    return acc;
  }, {} as Record<string, { month: string; monthKey: string; income: number; expense: number }>);

  // Sort by month and take last 6 months
  const chartData = Object.values(monthlyData)
    .sort((a, b) => a.monthKey.localeCompare(b.monthKey))
    .slice(-6);

  // Calculate totals
  const totals = transactions.reduce(
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

  const netAmount = totals.income - totals.expense;
  const isPositive = netAmount >= 0;

  const formatCurrency = (value: number) => {
    if (value >= 1000000) {
      return `₦${(value / 1000000).toFixed(1)}M`;
    }
    if (value >= 1000) {
      return `₦${(value / 1000).toFixed(0)}K`;
    }
    return `₦${value.toFixed(0)}`;
  };

  const formatTooltipValue = (value: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
    }).format(value);
  };

  if (transactions.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Income vs Expenses</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">
            Add transactions to see your chart
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Income vs Expenses</CardTitle>
          <div className={`flex items-center gap-1 text-sm font-medium ${isPositive ? 'text-primary' : 'text-destructive'}`}>
            {isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            {formatCurrency(Math.abs(netAmount))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Summary stats */}
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Income</p>
            <p className="text-sm font-semibold text-primary">{formatCurrency(totals.income)}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Expenses</p>
            <p className="text-sm font-semibold text-destructive">{formatCurrency(totals.expense)}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Net</p>
            <p className={`text-sm font-semibold ${isPositive ? 'text-primary' : 'text-destructive'}`}>
              {formatCurrency(netAmount)}
            </p>
          </div>
        </div>

        {/* Chart */}
        <div className="h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="month" 
                tick={{ fontSize: 11 }} 
                className="text-muted-foreground"
              />
              <YAxis 
                tickFormatter={formatCurrency} 
                tick={{ fontSize: 11 }} 
                className="text-muted-foreground"
              />
              <Tooltip 
                formatter={(value: number) => formatTooltipValue(value)}
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))', 
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  fontSize: '12px'
                }}
              />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
              <Bar dataKey="income" name="Income" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              <Bar dataKey="expense" name="Expenses" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
