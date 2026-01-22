import { useState } from 'react';
import { format } from 'date-fns';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useTaxSavings } from '@/hooks/useTaxSavings';
import { ArrowUpRight, Clock, X, Loader2, Building, Receipt } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
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

export function WithdrawalManager() {
  const { 
    account, 
    withdrawalRequests, 
    availableBalance, 
    requestWithdrawal, 
    cancelWithdrawal,
    loading 
  } = useTaxSavings();
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [selectedWithdrawalId, setSelectedWithdrawalId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [withdrawalType, setWithdrawalType] = useState<'bank_transfer' | 'tax_payment'>('bank_transfer');
  const [amount, setAmount] = useState('');
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountName, setAccountName] = useState('');

  const formatCurrency = (amount: number) => {
    return `NGN ${amount.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const handleAmountChange = (value: string) => {
    if (/^\d*\.?\d{0,2}$/.test(value)) {
      setAmount(value);
    }
  };

  const handleSubmit = async () => {
    const amountValue = parseFloat(amount);
    if (isNaN(amountValue) || amountValue <= 0) return;
    if (amountValue > availableBalance) return;

    setIsSubmitting(true);
    const result = await requestWithdrawal({
      amount: amountValue,
      withdrawal_type: withdrawalType,
      bank_name: withdrawalType === 'bank_transfer' ? bankName : undefined,
      account_number: withdrawalType === 'bank_transfer' ? accountNumber : undefined,
      account_name: withdrawalType === 'bank_transfer' ? accountName : undefined,
    });

    if (result) {
      setDialogOpen(false);
      resetForm();
    }
    setIsSubmitting(false);
  };

  const handleCancelClick = (id: string) => {
    setSelectedWithdrawalId(id);
    setCancelDialogOpen(true);
  };

  const handleConfirmCancel = async () => {
    if (selectedWithdrawalId) {
      await cancelWithdrawal(selectedWithdrawalId);
      setCancelDialogOpen(false);
      setSelectedWithdrawalId(null);
    }
  };

  const resetForm = () => {
    setAmount('');
    setBankName('');
    setAccountNumber('');
    setAccountName('');
    setWithdrawalType('bank_transfer');
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">Pending</Badge>;
      case 'processing':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Processing</Badge>;
      case 'completed':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Completed</Badge>;
      case 'cancelled':
        return <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">Cancelled</Badge>;
    }
  };

  const pendingRequests = withdrawalRequests.filter(w => w.status === 'pending');

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-48">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg">Withdrawals</CardTitle>
            <CardDescription>
              Available: {formatCurrency(availableBalance)}
              {pendingRequests.length > 0 && (
                <span className="text-amber-600 ml-2">
                  ({pendingRequests.length} pending)
                </span>
              )}
            </CardDescription>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" disabled={availableBalance <= 0}>
                <ArrowUpRight className="mr-2 h-4 w-4" />
                Request Withdrawal
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Request Withdrawal</DialogTitle>
                <DialogDescription>
                  Withdrawals take 24 hours to process. Note: Making a withdrawal will make you ineligible for quarterly interest.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>Withdrawal Method</Label>
                  <RadioGroup value={withdrawalType} onValueChange={(v) => setWithdrawalType(v as 'bank_transfer' | 'tax_payment')}>
                    <div className="flex items-center space-x-2 p-3 border rounded-lg">
                      <RadioGroupItem value="bank_transfer" id="bank" />
                      <Label htmlFor="bank" className="flex items-center gap-2 cursor-pointer">
                        <Building className="h-4 w-4" />
                        Bank Transfer
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2 p-3 border rounded-lg">
                      <RadioGroupItem value="tax_payment" id="tax" />
                      <Label htmlFor="tax" className="flex items-center gap-2 cursor-pointer">
                        <Receipt className="h-4 w-4" />
                        Apply to Tax Payment
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="amount">Amount (NGN)</Label>
                  <Input
                    id="amount"
                    type="text"
                    inputMode="decimal"
                    placeholder="Enter amount"
                    value={amount}
                    onChange={(e) => handleAmountChange(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Available: {formatCurrency(availableBalance)}
                  </p>
                </div>

                {withdrawalType === 'bank_transfer' && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="bankName">Bank Name</Label>
                      <Input
                        id="bankName"
                        placeholder="e.g., First Bank"
                        value={bankName}
                        onChange={(e) => setBankName(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="accountNumber">Account Number</Label>
                      <Input
                        id="accountNumber"
                        placeholder="10-digit account number"
                        value={accountNumber}
                        onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, '').slice(0, 10))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="accountName">Account Name</Label>
                      <Input
                        id="accountName"
                        placeholder="Account holder name"
                        value={accountName}
                        onChange={(e) => setAccountName(e.target.value)}
                      />
                    </div>
                  </>
                )}

                <Button 
                  className="w-full" 
                  onClick={handleSubmit}
                  disabled={
                    isSubmitting || 
                    parseFloat(amount) <= 0 || 
                    parseFloat(amount) > availableBalance ||
                    (withdrawalType === 'bank_transfer' && (!bankName || !accountNumber || !accountName))
                  }
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    'Submit Request'
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {withdrawalRequests.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No withdrawal requests yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {withdrawalRequests.map((request) => (
                <div
                  key={request.id}
                  className="flex items-center justify-between py-3 border-b last:border-0"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-full bg-muted">
                      {request.withdrawal_type === 'bank_transfer' ? (
                        <Building className="h-4 w-4" />
                      ) : (
                        <Receipt className="h-4 w-4" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          {request.withdrawal_type === 'bank_transfer' ? 'Bank Transfer' : 'Tax Payment'}
                        </span>
                        {getStatusBadge(request.status)}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(request.created_at), 'MMM d, yyyy • h:mm a')}
                      </p>
                      {request.bank_name && (
                        <p className="text-xs text-muted-foreground">
                          {request.bank_name} • {request.account_number}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-red-600">
                      -{formatCurrency(request.amount)}
                    </p>
                    {request.status === 'pending' && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-red-600"
                        onClick={() => handleCancelClick(request.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Withdrawal Request?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel this withdrawal request? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Request</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmCancel} className="bg-red-600 hover:bg-red-700">
              Cancel Request
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
