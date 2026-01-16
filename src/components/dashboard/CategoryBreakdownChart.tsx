import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { Transaction, TransactionCategory } from '@/hooks/useTransactions';

interface CategoryBreakdownChartProps {
  transactions: Transaction[];
  categories: TransactionCategory[];
}

const COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--accent))',
  'hsl(145 55% 60%)',
  'hsl(200 80% 50%)',
  'hsl(280 70% 60%)',
  'hsl(340 75% 55%)',
  'hsl(25 90% 55%)',
  'hsl(180 60% 45%)',
];

export function CategoryBreakdownChart({ transactions, categories }: CategoryBreakdownChartProps) {
  const getCategoryName = (categoryId: string | null) => {
    if (!categoryId) return 'Uncategorized';
    const cat = categories.find(c => c.id === categoryId);
    return cat?.name || 'Uncategorized';
  };

  const groupByCategory = (type: 'income' | 'expense') => {
    const filtered = transactions.filter(t => t.type === type);
    const grouped = filtered.reduce((acc, t) => {
      const categoryName = getCategoryName(t.category_id);
      if (!acc[categoryName]) {
        acc[categoryName] = 0;
      }
      acc[categoryName] += t.amount;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(grouped)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8); // Limit to top 8 categories
  };

  const incomeData = groupByCategory('income');
  const expenseData = groupByCategory('expense');

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
    }).format(value);
  };

  const formatShortCurrency = (value: number) => {
    if (value >= 1000000) {
      return `₦${(value / 1000000).toFixed(1)}M`;
    }
    if (value >= 1000) {
      return `₦${(value / 1000).toFixed(0)}K`;
    }
    return `₦${value.toFixed(0)}`;
  };

  const renderChart = (data: { name: string; value: number }[], emptyMessage: string) => {
    if (data.length === 0) {
      return (
        <div className="h-[220px] flex items-center justify-center text-muted-foreground text-sm">
          {emptyMessage}
        </div>
      );
    }

    const total = data.reduce((sum, d) => sum + d.value, 0);

    return (
      <div className="h-[220px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={45}
              outerRadius={70}
              paddingAngle={2}
              dataKey="value"
            >
              {data.map((_, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: number) => formatCurrency(value)}
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
                fontSize: '12px',
              }}
            />
            <Legend
              layout="vertical"
              align="right"
              verticalAlign="middle"
              formatter={(value, entry: any) => {
                const item = data.find(d => d.name === value);
                const percent = item ? ((item.value / total) * 100).toFixed(0) : 0;
                return (
                  <span className="text-xs text-foreground">
                    {value.length > 12 ? `${value.slice(0, 12)}...` : value} ({percent}%)
                  </span>
                );
              }}
              wrapperStyle={{ fontSize: '11px', paddingLeft: '10px' }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    );
  };

  const renderTopCategories = (data: { name: string; value: number }[]) => {
    if (data.length === 0) return null;
    
    const total = data.reduce((sum, d) => sum + d.value, 0);
    
    return (
      <div className="space-y-2 mt-3">
        {data.slice(0, 4).map((item, index) => {
          const percent = (item.value / total) * 100;
          return (
            <div key={item.name} className="flex items-center gap-2">
              <div 
                className="w-2 h-2 rounded-full flex-shrink-0" 
                style={{ backgroundColor: COLORS[index % COLORS.length] }} 
              />
              <span className="text-xs text-muted-foreground flex-1 truncate">{item.name}</span>
              <span className="text-xs font-medium">{formatShortCurrency(item.value)}</span>
              <span className="text-xs text-muted-foreground w-10 text-right">{percent.toFixed(0)}%</span>
            </div>
          );
        })}
      </div>
    );
  };

  if (transactions.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Category Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">
            Add transactions to see category breakdown
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Category Breakdown</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="expense" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="expense" className="text-xs">Expenses</TabsTrigger>
            <TabsTrigger value="income" className="text-xs">Income</TabsTrigger>
          </TabsList>
          
          <TabsContent value="expense" className="mt-0">
            {renderChart(expenseData, 'No expense transactions')}
            {renderTopCategories(expenseData)}
          </TabsContent>
          
          <TabsContent value="income" className="mt-0">
            {renderChart(incomeData, 'No income transactions')}
            {renderTopCategories(incomeData)}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
