import { useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SavingsOverview } from './SavingsOverview';
import { SavingsTransactionHistory } from './SavingsTransactionHistory';
import { WithdrawalManager } from './WithdrawalManager';
import { useTaxSavings } from '@/hooks/useTaxSavings';
import { History, ArrowUpRight } from 'lucide-react';

export function SavingsDashboard() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { verifyDeposit, refresh } = useTaxSavings();
  const verifyingRef = useRef(false);
  const processedRef = useRef<string | null>(null);

  useEffect(() => {
    const paymentStatus = searchParams.get('payment');
    const reference = searchParams.get('reference');

    // Only process if we have a success payment with reference, haven't already processed it, and aren't currently verifying
    if (paymentStatus === 'success' && reference && !verifyingRef.current && processedRef.current !== reference) {
      verifyingRef.current = true;
      processedRef.current = reference;
      
      verifyDeposit(reference).finally(() => {
        verifyingRef.current = false;
        // Clean up URL params after verification
        setSearchParams({ tab: 'savings' });
      });
    }
  }, [searchParams, setSearchParams]); // Removed verifyDeposit from deps - it causes re-runs

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
