import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SavingsOverview } from './SavingsOverview';
import { SavingsTransactionHistory } from './SavingsTransactionHistory';
import { WithdrawalManager } from './WithdrawalManager';
import { useTaxSavings } from '@/hooks/useTaxSavings';
import { PiggyBank, History, ArrowUpRight } from 'lucide-react';

export function SavingsDashboard() {
  const [searchParams] = useSearchParams();
  const { verifyDeposit, refresh } = useTaxSavings();

  useEffect(() => {
    const paymentStatus = searchParams.get('payment');
    const reference = searchParams.get('reference');

    if (paymentStatus === 'success' && reference) {
      verifyDeposit(reference);
      // Clean up URL
      window.history.replaceState({}, '', window.location.pathname + '?tab=savings');
    }
  }, [searchParams, verifyDeposit]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Tax Savings</h2>
          <p className="text-muted-foreground">
            Save towards your tax liability and earn 10% annual interest
          </p>
        </div>
      </div>

      <SavingsOverview />

      <Tabs defaultValue="history" className="space-y-4">
        <TabsList>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            History
          </TabsTrigger>
          <TabsTrigger value="withdrawals" className="flex items-center gap-2">
            <ArrowUpRight className="h-4 w-4" />
            Withdrawals
          </TabsTrigger>
        </TabsList>
        <TabsContent value="history">
          <SavingsTransactionHistory />
        </TabsContent>
        <TabsContent value="withdrawals">
          <WithdrawalManager />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export { SavingsOverview, SavingsTransactionHistory, WithdrawalManager };
