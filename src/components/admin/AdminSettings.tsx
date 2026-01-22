import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAdmin } from '@/hooks/useAdmin';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  Settings,
  Percent,
  Clock,
  Calendar,
  RefreshCw,
  Loader2,
  Info,
  CheckCircle2,
  AlertTriangle,
  PiggyBank,
  TrendingUp
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert';

export function AdminSettings() {
  const { stats, refresh } = useAdmin();
  const [calculatingInterest, setCalculatingInterest] = useState(false);
  const [resettingFlags, setResettingFlags] = useState(false);
  const [confirmAction, setConfirmAction] = useState<'interest' | 'reset' | null>(null);

  const handleCalculateInterest = async () => {
    setCalculatingInterest(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      
      const response = await supabase.functions.invoke('calculate-interest', {
        headers: {
          Authorization: `Bearer ${session.session?.access_token}`,
        },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      if (response.data?.success) {
        toast.success(`Interest calculated for ${response.data.processed} accounts`);
        refresh();
      } else {
        throw new Error(response.data?.error || 'Failed to calculate interest');
      }
    } catch (error) {
      console.error('Error calculating interest:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to calculate interest');
    } finally {
      setCalculatingInterest(false);
      setConfirmAction(null);
    }
  };

  const handleResetQuarterlyFlags = async () => {
    setResettingFlags(true);
    try {
      const { error } = await supabase.rpc('reset_quarterly_withdrawal_flags');
      
      if (error) throw error;

      toast.success('Quarterly withdrawal flags have been reset');
      refresh();
    } catch (error) {
      console.error('Error resetting flags:', error);
      toast.error('Failed to reset quarterly flags');
    } finally {
      setResettingFlags(false);
      setConfirmAction(null);
    }
  };

  const currentQuarter = Math.ceil((new Date().getMonth() + 1) / 3);
  const currentYear = new Date().getFullYear();

  return (
    <div className="space-y-6">
      {/* Interest Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Percent className="h-5 w-5 text-primary" />
            Interest Configuration
          </CardTitle>
          <CardDescription>
            Current interest rate settings for tax savings accounts
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium text-muted-foreground">Annual Rate</span>
              </div>
              <p className="text-2xl font-bold text-green-600">10%</p>
            </div>
            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium text-muted-foreground">Quarterly Rate</span>
              </div>
              <p className="text-2xl font-bold text-primary">2.5%</p>
            </div>
            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium text-muted-foreground">Current Quarter</span>
              </div>
              <p className="text-2xl font-bold">Q{currentQuarter} {currentYear}</p>
            </div>
          </div>

          <Alert>
            <Info className="h-4 w-4" />
            <AlertTitle>Interest Eligibility</AlertTitle>
            <AlertDescription>
              Users are eligible for quarterly interest only if they have not made any withdrawals during the current quarter.
              Interest is automatically credited to accounts at the end of each quarter.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Platform Statistics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PiggyBank className="h-5 w-5 text-primary" />
            Platform Statistics
          </CardTitle>
          <CardDescription>
            Overview of the savings platform
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="p-4 border rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">Total Deposits</p>
              <p className="text-xl font-bold text-green-600">
                NGN {(stats?.totalDeposits || 0).toLocaleString('en-NG', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="p-4 border rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">Total Withdrawals</p>
              <p className="text-xl font-bold text-red-600">
                NGN {(stats?.totalWithdrawals || 0).toLocaleString('en-NG', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="p-4 border rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">Total Interest Paid</p>
              <p className="text-xl font-bold text-amber-600">
                NGN {(stats?.totalInterestPaid || 0).toLocaleString('en-NG', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="p-4 border rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">Net Balance</p>
              <p className="text-xl font-bold text-primary">
                NGN {(stats?.totalSavingsBalance || 0).toLocaleString('en-NG', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Admin Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-primary" />
            Administrative Actions
          </CardTitle>
          <CardDescription>
            Manual triggers for scheduled tasks
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert variant="destructive" className="border-amber-200 bg-amber-50 text-amber-800">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Caution</AlertTitle>
            <AlertDescription>
              These actions are normally automated. Only use manual triggers if there's an issue with the scheduled tasks.
            </AlertDescription>
          </Alert>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="p-4 border rounded-lg space-y-3">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-green-600" />
                <div>
                  <h4 className="font-medium">Calculate Quarterly Interest</h4>
                  <p className="text-sm text-muted-foreground">
                    Manually trigger interest calculation for all eligible accounts
                  </p>
                </div>
              </div>
              <Button 
                onClick={() => setConfirmAction('interest')}
                disabled={calculatingInterest}
                className="w-full"
              >
                {calculatingInterest ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Calculating...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Calculate Interest
                  </>
                )}
              </Button>
            </div>

            <div className="p-4 border rounded-lg space-y-3">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                <div>
                  <h4 className="font-medium">Reset Quarterly Flags</h4>
                  <p className="text-sm text-muted-foreground">
                    Reset withdrawal flags for all accounts (start of new quarter)
                  </p>
                </div>
              </div>
              <Button 
                variant="outline"
                onClick={() => setConfirmAction('reset')}
                disabled={resettingFlags}
                className="w-full"
              >
                {resettingFlags ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Resetting...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Reset Flags
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* System Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5 text-muted-foreground" />
            System Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between py-2 border-b">
              <span className="text-muted-foreground">Interest Calculation</span>
              <Badge variant="outline" className="text-green-600 border-green-200">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Quarterly (Automated)
              </Badge>
            </div>
            <div className="flex items-center justify-between py-2 border-b">
              <span className="text-muted-foreground">Withdrawal Processing</span>
              <Badge variant="outline" className="text-primary border-primary/20">
                <Clock className="h-3 w-3 mr-1" />
                Manual (24hr SLA)
              </Badge>
            </div>
            <div className="flex items-center justify-between py-2 border-b">
              <span className="text-muted-foreground">Recurring Transactions</span>
              <Badge variant="outline" className="text-green-600 border-green-200">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Daily (Automated)
              </Badge>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-muted-foreground">Platform Version</span>
              <Badge variant="secondary">v1.0.0</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <AlertDialog open={!!confirmAction} onOpenChange={() => setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction === 'interest' 
                ? 'Calculate Quarterly Interest?' 
                : 'Reset Quarterly Withdrawal Flags?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction === 'interest' 
                ? 'This will calculate and credit interest to all eligible accounts. This action is normally automated at the end of each quarter.'
                : 'This will reset the withdrawal flag for all accounts, making them eligible for interest again. This should only be done at the start of a new quarter.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmAction === 'interest' ? handleCalculateInterest : handleResetQuarterlyFlags}
            >
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
