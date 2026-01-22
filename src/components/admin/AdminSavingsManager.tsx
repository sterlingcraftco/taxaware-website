import { useState } from 'react';
import { format } from 'date-fns';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAdmin } from '@/hooks/useAdmin';
import { 
  Users, 
  PiggyBank, 
  TrendingUp, 
  ArrowDownLeft, 
  ArrowUpRight, 
  Clock,
  Check,
  X,
  Loader2,
  Search
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export function AdminSavingsManager() {
  const { 
    isAdmin, 
    loading, 
    stats, 
    withdrawalRequests, 
    savingsAccounts,
    processWithdrawal,
    refresh 
  } = useAdmin();
  
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<string | null>(null);
  const [actionType, setActionType] = useState<'approve' | 'reject' | null>(null);
  const [notes, setNotes] = useState('');
  const [processing, setProcessing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedDetails, setSelectedDetails] = useState<typeof withdrawalRequests[0] | null>(null);

  const formatCurrency = (amount: number) => {
    return `NGN ${amount.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const handleAction = (id: string, action: 'approve' | 'reject') => {
    setSelectedWithdrawal(id);
    setActionType(action);
    setNotes('');
  };

  const confirmAction = async () => {
    if (!selectedWithdrawal || !actionType) return;
    
    setProcessing(true);
    await processWithdrawal(selectedWithdrawal, actionType, notes || undefined);
    setProcessing(false);
    setSelectedWithdrawal(null);
    setActionType(null);
    setNotes('');
  };

  const viewDetails = (withdrawal: typeof withdrawalRequests[0]) => {
    setSelectedDetails(withdrawal);
    setDetailsOpen(true);
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
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const pendingWithdrawals = withdrawalRequests.filter(w => w.status === 'pending');
  const filteredAccounts = savingsAccounts.filter(a => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      a.profiles?.full_name?.toLowerCase().includes(search) ||
      a.profiles?.email?.toLowerCase().includes(search)
    );
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64">
          <div className="text-center text-muted-foreground">
            <X className="h-12 w-12 mx-auto mb-4 text-red-500" />
            <h3 className="text-lg font-semibold">Access Denied</h3>
            <p>You don't have admin permissions to view this page.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalUsers || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Savings</CardTitle>
            <PiggyBank className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats?.totalSavingsBalance || 0)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Interest Paid</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(stats?.totalInterestPaid || 0)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Withdrawals</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{stats?.pendingWithdrawals || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {formatCurrency(stats?.pendingWithdrawalAmount || 0)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Pending Withdrawals */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-amber-500" />
            Pending Withdrawal Requests
          </CardTitle>
          <CardDescription>
            Review and process withdrawal requests (24-hour processing)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {pendingWithdrawals.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Check className="h-12 w-12 mx-auto mb-4 text-green-500" />
              <p>No pending withdrawal requests</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Bank Details</TableHead>
                    <TableHead>Requested</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingWithdrawals.map((withdrawal) => (
                    <TableRow key={withdrawal.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{withdrawal.profiles?.full_name || 'N/A'}</p>
                          <p className="text-sm text-muted-foreground">{withdrawal.profiles?.email}</p>
                        </div>
                      </TableCell>
                      <TableCell className="font-semibold">{formatCurrency(withdrawal.amount)}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {withdrawal.withdrawal_type === 'bank_transfer' ? 'Bank Transfer' : 'Tax Payment'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {withdrawal.bank_name ? (
                          <div className="text-sm">
                            <p>{withdrawal.bank_name}</p>
                            <p className="text-muted-foreground">{withdrawal.account_number}</p>
                            <p className="text-muted-foreground">{withdrawal.account_name}</p>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">N/A</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">
                        {format(new Date(withdrawal.created_at), 'MMM d, yyyy')}
                        <br />
                        <span className="text-muted-foreground">
                          {format(new Date(withdrawal.created_at), 'h:mm a')}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="default"
                            className="bg-green-600 hover:bg-green-700"
                            onClick={() => handleAction(withdrawal.id, 'approve')}
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleAction(withdrawal.id, 'reject')}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* All Savings Accounts */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle>All Savings Accounts</CardTitle>
              <CardDescription>View all user savings accounts</CardDescription>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredAccounts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <PiggyBank className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No savings accounts found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Balance</TableHead>
                    <TableHead>Total Deposits</TableHead>
                    <TableHead>Total Withdrawals</TableHead>
                    <TableHead>Interest Earned</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAccounts.map((account) => (
                    <TableRow key={account.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{account.profiles?.full_name || 'N/A'}</p>
                          <p className="text-sm text-muted-foreground">{account.profiles?.email}</p>
                        </div>
                      </TableCell>
                      <TableCell className="font-semibold">{formatCurrency(account.balance)}</TableCell>
                      <TableCell className="text-green-600">
                        <div className="flex items-center gap-1">
                          <ArrowDownLeft className="h-3 w-3" />
                          {formatCurrency(account.total_deposits)}
                        </div>
                      </TableCell>
                      <TableCell className="text-red-600">
                        <div className="flex items-center gap-1">
                          <ArrowUpRight className="h-3 w-3" />
                          {formatCurrency(account.total_withdrawals)}
                        </div>
                      </TableCell>
                      <TableCell className="text-amber-600">{formatCurrency(account.total_interest_earned)}</TableCell>
                      <TableCell>
                        {account.has_withdrawal_this_quarter ? (
                          <Badge variant="outline" className="text-amber-600 border-amber-200">
                            No Interest
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-green-600 border-green-200">
                            Eligible
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <AlertDialog open={!!selectedWithdrawal && !!actionType} onOpenChange={() => {
        setSelectedWithdrawal(null);
        setActionType(null);
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {actionType === 'approve' ? 'Approve Withdrawal?' : 'Reject Withdrawal?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {actionType === 'approve' 
                ? 'This will process the withdrawal and deduct the amount from the user\'s savings account.'
                : 'This will reject the withdrawal request. The user will be notified.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              placeholder="Add any notes about this decision..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="mt-2"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={processing}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmAction}
              disabled={processing}
              className={actionType === 'approve' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}
            >
              {processing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                actionType === 'approve' ? 'Approve' : 'Reject'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
