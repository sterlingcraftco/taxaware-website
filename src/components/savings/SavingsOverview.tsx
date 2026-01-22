import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PiggyBank, TrendingUp, ArrowUpRight, Loader2 } from 'lucide-react';
import { useTaxSavings } from '@/hooks/useTaxSavings';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

export function SavingsOverview() {
  const { account, loading, initializeDeposit, MINIMUM_DEPOSIT } = useTaxSavings();
  const [depositAmount, setDepositAmount] = useState('');
  const [isDepositing, setIsDepositing] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  const formatCurrency = (amount: number) => {
    return `NGN ${amount.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const handleDeposit = async () => {
    const amount = parseFloat(depositAmount);
    if (isNaN(amount) || amount < MINIMUM_DEPOSIT) {
      return;
    }

    setIsDepositing(true);
    const callbackUrl = `${window.location.origin}/dashboard?tab=savings&payment=success`;
    const result = await initializeDeposit(amount, callbackUrl);
    
    if (result?.authorization_url) {
      window.location.href = result.authorization_url;
    }
    setIsDepositing(false);
  };

  const handleAmountChange = (value: string) => {
    if (/^\d*\.?\d{0,2}$/.test(value)) {
      setDepositAmount(value);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-48">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const balance = account?.balance || 0;
  const totalInterest = account?.total_interest_earned || 0;
  const eligibleForInterest = !account?.has_withdrawal_this_quarter;

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Card className="md:col-span-2">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div>
            <CardTitle className="text-lg font-medium">Tax Savings Balance</CardTitle>
            <CardDescription>Save towards your tax liability and earn 10% p.a.</CardDescription>
          </div>
          <PiggyBank className="h-8 w-8 text-primary" />
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-primary mb-4">
            {formatCurrency(balance)}
          </div>
          
          <div className="flex flex-wrap gap-4 mb-4">
            <div className="flex items-center gap-2 text-sm">
              <TrendingUp className="h-4 w-4 text-green-500" />
              <span className="text-muted-foreground">Interest Earned:</span>
              <span className="font-medium text-green-600">{formatCurrency(totalInterest)}</span>
            </div>
            <div className="text-sm">
              <span className="text-muted-foreground">Interest Status:</span>
              <span className={`ml-2 font-medium ${eligibleForInterest ? 'text-green-600' : 'text-amber-600'}`}>
                {eligibleForInterest ? 'Eligible for quarterly interest' : 'Not eligible (withdrawal made)'}
              </span>
            </div>
          </div>

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="w-full sm:w-auto">
                <ArrowUpRight className="mr-2 h-4 w-4" />
                Make a Deposit
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Deposit to Tax Savings</DialogTitle>
                <DialogDescription>
                  Add funds to your tax savings account. Minimum deposit: NGN {MINIMUM_DEPOSIT.toLocaleString()}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="amount">Amount (NGN)</Label>
                  <Input
                    id="amount"
                    type="text"
                    inputMode="decimal"
                    placeholder={`Min. ${MINIMUM_DEPOSIT.toLocaleString()}`}
                    value={depositAmount}
                    onChange={(e) => handleAmountChange(e.target.value)}
                  />
                </div>
                <Button 
                  className="w-full" 
                  onClick={handleDeposit}
                  disabled={isDepositing || parseFloat(depositAmount) < MINIMUM_DEPOSIT}
                >
                  {isDepositing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>Pay with Paystack</>
                  )}
                </Button>
                <p className="text-xs text-muted-foreground text-center">
                  You'll be redirected to Paystack to complete payment
                </p>
              </div>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium">Interest Info</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Annual Rate</span>
            <span className="font-medium text-green-600">10% p.a.</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Payment</span>
            <span className="font-medium">Quarterly</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Withdrawal Time</span>
            <span className="font-medium">24 hours</span>
          </div>
          <hr className="my-2" />
          <p className="text-xs text-muted-foreground">
            Interest is only paid on accounts with no withdrawals during the quarter. Interest is automatically added to your balance.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
