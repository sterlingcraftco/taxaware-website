import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calculator, History, TrendingUp, Settings, LogOut, ArrowLeft, Trash2, User, ChevronDown, Download, Wallet, CalendarClock, BarChart3, PiggyBank, Shield, Crown } from 'lucide-react';
import { MobileBottomNav } from '@/components/dashboard/MobileBottomNav';
import { toast } from 'sonner';
import DashboardCalculator from '@/components/DashboardCalculator';
import TINLookup from '@/components/TINLookup';
import { TransactionManager, RecurringTransactionManager } from '@/components/transactions';
import { IncomeExpenseChart, CategoryBreakdownChart, MonthlyTrendChart } from '@/components/dashboard';
import { useTransactions } from '@/hooks/useTransactions';
import { generateTaxPDF } from '@/lib/pdfGenerator';
import { CompleteTaxResult, migrateToCompleteTaxResult } from '@/lib/taxCalculations';
import { SavingsDashboard } from '@/components/savings';
import { useAdmin } from '@/hooks/useAdmin';
import { useFeatureFlag } from '@/hooks/useFeatureFlag';
import { useSubscription } from '@/hooks/useSubscription';
import { Badge } from '@/components/ui/badge';

interface SavedCalculation {
  id: string;
  annual_income: number;
  tax_result: CompleteTaxResult;
  notes: string | null;
  created_at: string;
}

// Analytics Tab Component
function AnalyticsTab() {
  const { transactions, categories, loading, totals } = useTransactions();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const netBalance = totals.income - totals.expense;

  if (loading) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <div className="animate-pulse">Loading analytics...</div>
      </div>
    );
  }

  return (
    <>
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <TrendingUp className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Income</p>
                <p className="text-lg sm:text-xl font-bold text-green-600 truncate">
                  {formatCurrency(totals.income)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-destructive/10">
                <Wallet className="w-5 h-5 text-destructive" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Expenses</p>
                <p className="text-lg sm:text-xl font-bold text-destructive truncate">
                  {formatCurrency(totals.expense)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <BarChart3 className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Net Balance</p>
                <p className={`text-lg sm:text-xl font-bold truncate ${netBalance >= 0 ? 'text-green-600' : 'text-destructive'}`}>
                  {formatCurrency(netBalance)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <IncomeExpenseChart transactions={transactions} />
        <CategoryBreakdownChart transactions={transactions} categories={categories} />
      </div>

      {/* Trend Chart */}
      <MonthlyTrendChart transactions={transactions} />
    </>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, loading, signOut } = useAuth();
  const { isAdmin } = useAdmin();
  const { isEnabled: savingsEnabled } = useFeatureFlag('savings');
  const { isPro } = useSubscription();
  const [calculations, setCalculations] = useState<SavedCalculation[]>([]);
  const [loadingCalcs, setLoadingCalcs] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [calculationToDelete, setCalculationToDelete] = useState<string | null>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [selectedCalculation, setSelectedCalculation] = useState<SavedCalculation | null>(null);
  const [activeTab, setActiveTab] = useState('transactions');

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      fetchCalculations();
    }
  }, [user]);

  const fetchCalculations = async () => {
    try {
      const { data, error } = await supabase
        .from('saved_calculations')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const safeCalculations = (data || []).map(row => ({
        id: row.id,
        annual_income: row.annual_income,
        // Validate and migrate data to ensure it meets CompleteTaxResult interface
        tax_result: migrateToCompleteTaxResult(row.tax_result, row.annual_income),
        notes: row.notes,
        created_at: row.created_at,
      }));

      setCalculations(safeCalculations);
    } catch (error) {
      console.error('Error fetching calculations:', error);
      toast.error('Failed to load saved calculations');
    } finally {
      setLoadingCalcs(false);
    }
  };

  const handleDeleteClick = (id: string) => {
    setCalculationToDelete(id);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!calculationToDelete) return;

    try {
      const { error } = await supabase
        .from('saved_calculations')
        .delete()
        .eq('id', calculationToDelete);

      if (error) throw error;
      setCalculations(prev => prev.filter(calc => calc.id !== calculationToDelete));
      toast.success('Calculation deleted');
    } catch (error) {
      console.error('Error deleting calculation:', error);
      toast.error('Failed to delete calculation');
    } finally {
      setDeleteDialogOpen(false);
      setCalculationToDelete(null);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getTotalTax = (calc: SavedCalculation) => {
    return calc.tax_result?.total ?? 0;
  };

  const getEffectiveRate = (calc: SavedCalculation) => {
    if (!calc.annual_income || calc.annual_income === 0) return 0;
    const total = getTotalTax(calc);
    return (total / calc.annual_income) * 100;
  };

  const getNetIncome = (calc: SavedCalculation) => {
    return calc.annual_income - getTotalTax(calc);
  };

  const handleViewDetails = (calc: SavedCalculation) => {
    setSelectedCalculation(calc);
    setDetailsDialogOpen(true);
  };

  const handleDownloadPDF = (calc: SavedCalculation) => {
    generateTaxPDF(calc.tax_result, {
      notes: calc.notes || undefined,
      filename: `tax-calculation-${new Date(calc.created_at).toISOString().split('T')[0]}.pdf`,
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-muted/30 to-background pb-20 md:pb-0">
      {/* Header */}
      <header className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Calculator className="w-5 h-5 text-primary" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="font-semibold">TaxAware Dashboard</h1>
                  <Badge variant={isPro ? 'default' : 'secondary'} className="text-[10px] px-1.5 py-0">
                    {isPro ? 'Pro' : 'Free'}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {user.email}
                </p>
              </div>
            </div>
          </div>

          {/* User Dropdown Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2">
                <User className="w-4 h-4" />
                <span className="hidden sm:inline">Account</span>
                <ChevronDown className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-background border border-border shadow-lg">
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium">{user.user_metadata?.full_name || 'User'}</p>
                  <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate('/profile')} className="gap-2 cursor-pointer">
                <Settings className="w-4 h-4" />
                Profile Settings
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate('/subscription')} className="gap-2 cursor-pointer">
                <Crown className="w-4 h-4" />
                Subscription
              </DropdownMenuItem>
              {isAdmin && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate('/admin')} className="gap-2 cursor-pointer">
                    <Shield className="w-4 h-4" />
                    Admin Dashboard
                  </DropdownMenuItem>
                </>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut} className="gap-2 text-destructive focus:text-destructive">
                <LogOut className="w-4 h-4" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-4 sm:py-8">
        <div className="mb-6 sm:mb-8">
          <h2 className="text-xl sm:text-2xl font-bold mb-1 sm:mb-2">
            Welcome back{user.user_metadata?.full_name ? `, ${user.user_metadata.full_name}` : ''}!
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground">
            Track your tax calculations and manage your financial planning
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 sm:space-y-6">
          {/* Desktop Tab List - hidden on mobile since we use bottom nav */}
          <TabsList className={`hidden md:grid w-full ${savingsEnabled ? 'grid-cols-5' : 'grid-cols-4'} h-auto p-1`}>
            <TabsTrigger value="transactions" className="flex flex-row gap-2 py-2 px-3">
              <Wallet className="w-4 h-4" />
              <span>Transactions</span>
            </TabsTrigger>
            <TabsTrigger value="recurring" className="flex flex-row gap-2 py-2 px-3">
              <CalendarClock className="w-4 h-4" />
              <span>Recurring</span>
            </TabsTrigger>
            {savingsEnabled && (
              <TabsTrigger value="savings" className="flex flex-row gap-2 py-2 px-3">
                <PiggyBank className="w-4 h-4" />
                <span>Tax Savings</span>
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 ml-1">Beta</Badge>
              </TabsTrigger>
            )}
            <TabsTrigger value="analytics" className="flex flex-row gap-2 py-2 px-3">
              <BarChart3 className="w-4 h-4" />
              <span>Analytics</span>
            </TabsTrigger>
            <TabsTrigger value="calculations" className="flex flex-row gap-2 py-2 px-3">
              <Calculator className="w-4 h-4" />
              <span>Tax Tools</span>
            </TabsTrigger>
          </TabsList>

          {/* Transactions Tab */}
          <TabsContent value="transactions" className="space-y-6">
            <TransactionManager />
          </TabsContent>

          {/* Savings Tab */}
          {savingsEnabled && (
            <TabsContent value="savings" className="space-y-6">
              <SavingsDashboard />
            </TabsContent>
          )}

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-6">
            <AnalyticsTab />
          </TabsContent>

          {/* Recurring Tab */}
          <TabsContent value="recurring" className="space-y-6">
            <RecurringTransactionManager />
          </TabsContent>

          {/* Tax Calculations Tab */}
          <TabsContent value="calculations">
            <div className="grid md:grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Saved Calculations Card - Takes up 2 columns on large screens */}
              <Card className="lg:col-span-2">
                <CardHeader className="pb-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 sm:p-3 rounded-lg bg-accent/10">
                        <History className="w-5 h-5 sm:w-6 sm:h-6 text-accent" />
                      </div>
                      <div>
                        <CardTitle className="text-base sm:text-lg">Saved Calculations</CardTitle>
                        <CardDescription className="text-xs sm:text-sm">
                          View and manage your saved tax calculations
                        </CardDescription>
                      </div>
                    </div>
                    <DashboardCalculator onCalculationSaved={fetchCalculations} />
                  </div>
                </CardHeader>
                <CardContent>
                  {loadingCalcs ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <div className="animate-pulse">Loading calculations...</div>
                    </div>
                  ) : calculations.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <History className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p className="text-sm">No saved calculations yet</p>
                      <p className="text-xs mt-1">Click "New Calculation" to get started</p>
                    </div>
                  ) : (
                    <>
                      {/* Mobile Card Layout */}
                      <div className="md:hidden space-y-3">
                        {calculations.map((calc) => (
                          <div
                            key={calc.id}
                            className="border rounded-lg p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                            onClick={() => handleViewDetails(calc)}
                          >
                            <div className="flex items-start justify-between mb-3">
                              <div>
                                <p className="text-sm text-muted-foreground">
                                  {new Date(calc.created_at).toLocaleDateString('en-NG', {
                                    day: 'numeric',
                                    month: 'short',
                                    year: 'numeric',
                                  })}
                                </p>
                                <p className="font-semibold text-base sm:text-lg truncate">
                                  {formatCurrency(calc.annual_income)}
                                </p>
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10 -mr-2 -mt-1"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteClick(calc.id);
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                            <div className="grid grid-cols-3 gap-1 text-sm">
                              <div className="min-w-0">
                                <p className="text-muted-foreground text-xs">Tax</p>
                                <p className="font-medium text-xs sm:text-sm truncate">{formatCurrency(getTotalTax(calc))}</p>
                              </div>
                              <div className="min-w-0">
                                <p className="text-muted-foreground text-xs">Rate</p>
                                <p className="font-medium text-xs sm:text-sm">{getEffectiveRate(calc).toFixed(1)}%</p>
                              </div>
                              <div className="min-w-0">
                                <p className="text-muted-foreground text-xs">Net</p>
                                <p className="font-medium text-xs sm:text-sm truncate">{formatCurrency(getNetIncome(calc))}</p>
                              </div>
                            </div>
                            {calc.notes && (
                              <p className="text-xs text-muted-foreground mt-2 truncate">
                                {calc.notes}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>

                      {/* Desktop Table Layout */}
                      <div className="hidden md:block overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Date</TableHead>
                              <TableHead>Annual Income</TableHead>
                              <TableHead>Total Tax</TableHead>
                              <TableHead>Effective Rate</TableHead>
                              <TableHead>Net Income</TableHead>
                              <TableHead>Notes</TableHead>
                              <TableHead className="w-[50px]"></TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {calculations.map((calc) => (
                              <TableRow
                                key={calc.id}
                                className="cursor-pointer hover:bg-muted/50"
                                onClick={() => handleViewDetails(calc)}
                              >
                                <TableCell className="whitespace-nowrap">
                                  {new Date(calc.created_at).toLocaleDateString('en-NG', {
                                    day: 'numeric',
                                    month: 'short',
                                    year: 'numeric',
                                  })}
                                </TableCell>
                                <TableCell>{formatCurrency(calc.annual_income)}</TableCell>
                                <TableCell>{formatCurrency(getTotalTax(calc))}</TableCell>
                                <TableCell>{getEffectiveRate(calc).toFixed(2)}%</TableCell>
                                <TableCell>{formatCurrency(getNetIncome(calc))}</TableCell>
                                <TableCell className="max-w-[200px] truncate">
                                  {calc.notes || '-'}
                                </TableCell>
                                <TableCell>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteClick(calc.id);
                                    }}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* TIN Lookup Card */}
              <TINLookup />

              {/* Tax Trends Card */}
              <Card className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="p-3 rounded-lg bg-green-500/10 w-fit mb-2">
                    <TrendingUp className="w-6 h-6 text-green-500" />
                  </div>
                  <CardTitle>Tax Trends</CardTitle>
                  <CardDescription>
                    Track your tax obligations over time
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8 text-muted-foreground">
                    <TrendingUp className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p className="text-sm">Coming soon</p>
                    <p className="text-xs mt-1">Visualize your tax history</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </main>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Calculation</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this calculation? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* View Details Dialog */}
      <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
        <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader className="pr-2 sm:pr-8">
            <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Calculator className="w-4 h-4 sm:w-5 sm:h-5" />
              Calculation Details
            </DialogTitle>
          </DialogHeader>

          {selectedCalculation && isPro && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleDownloadPDF(selectedCalculation)}
              className="absolute right-10 sm:right-12 top-3 sm:top-4 gap-1 sm:gap-2 h-8 sm:h-9 px-2 sm:px-3 text-xs sm:text-sm"
            >
              <Download className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">PDF</span>
            </Button>
          )}
          {selectedCalculation && !isPro && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/subscription')}
              className="absolute right-10 sm:right-12 top-3 sm:top-4 gap-1 sm:gap-2 h-8 sm:h-9 px-2 sm:px-3 text-xs sm:text-sm"
            >
              <Crown className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">PDF</span>
            </Button>
          )}

          {selectedCalculation && (
            <div className="space-y-4 sm:space-y-6">
              {/* Date */}
              <p className="text-xs sm:text-sm text-muted-foreground">
                Saved on {new Date(selectedCalculation.created_at).toLocaleDateString('en-NG', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </p>

              {/* Summary Cards */}
              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                <div className="bg-muted/50 rounded-lg sm:rounded-xl p-2 sm:p-4">
                  <span className="text-[10px] sm:text-xs font-medium text-muted-foreground">Annual Income</span>
                  <p className="text-sm sm:text-xl font-bold text-foreground">{formatCurrency(selectedCalculation.annual_income)}</p>
                </div>

                <div className="bg-primary/10 rounded-lg sm:rounded-xl p-2 sm:p-4">
                  <span className="text-[10px] sm:text-xs font-medium text-muted-foreground">Total Tax</span>
                  <p className="text-sm sm:text-xl font-bold text-foreground">{formatCurrency(getTotalTax(selectedCalculation))}</p>
                </div>

                <div className="bg-accent/10 rounded-lg sm:rounded-xl p-2 sm:p-4">
                  <span className="text-[10px] sm:text-xs font-medium text-muted-foreground">Take Home</span>
                  <p className="text-sm sm:text-xl font-bold text-foreground">{formatCurrency(getNetIncome(selectedCalculation))}</p>
                </div>
              </div>

              {/* Visual Bar */}
              <div>
                <div className="flex justify-between text-xs font-medium mb-1">
                  <span className="text-muted-foreground">Income Distribution</span>
                  <span className="text-foreground">Effective Rate: {getEffectiveRate(selectedCalculation).toFixed(2)}%</span>
                </div>
                <div className="h-6 rounded-full overflow-hidden flex bg-muted">
                  <div
                    className="bg-primary transition-all duration-500"
                    style={{ width: `${Math.min((getTotalTax(selectedCalculation) / selectedCalculation.annual_income) * 100, 100)}%` }}
                  />
                  <div
                    className="bg-accent transition-all duration-500"
                    style={{ width: `${Math.max(100 - (getTotalTax(selectedCalculation) / selectedCalculation.annual_income) * 100, 0)}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs mt-1">
                  <span className="text-primary font-medium">Tax: {formatCurrency(getTotalTax(selectedCalculation))}</span>
                  <span className="text-accent-foreground font-medium">Take Home: {formatCurrency(getNetIncome(selectedCalculation))}</span>
                </div>
              </div>

              {/* Breakdown Table */}
              {selectedCalculation.tax_result?.breakdown && selectedCalculation.tax_result.breakdown.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-foreground mb-3">Tax Band Breakdown</h4>
                  <div className="overflow-x-auto -mx-4 sm:mx-0">
                    <table className="w-full text-sm min-w-[400px]">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left py-2 px-3 font-semibold text-muted-foreground sticky left-0 bg-background z-10">Band</th>
                          <th className="text-right py-2 px-3 font-semibold text-muted-foreground">Rate</th>
                          <th className="text-right py-2 px-3 font-semibold text-muted-foreground">Taxable</th>
                          <th className="text-right py-2 px-3 font-semibold text-muted-foreground">Tax</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedCalculation.tax_result.breakdown.map((row, index) => (
                          <tr key={index} className="border-b border-border/50 last:border-0">
                            <td className="py-2 px-3 font-medium text-foreground sticky left-0 bg-background z-10">{row.band}</td>
                            <td className="py-2 px-3 text-right text-muted-foreground">{row.rate}%</td>
                            <td className="py-2 px-3 text-right text-foreground">{formatCurrency(row.taxableInBand)}</td>
                            <td className="py-2 px-3 text-right font-semibold text-primary">{formatCurrency(row.taxInBand)}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="bg-muted/50">
                          <td className="py-2 px-3 font-bold text-foreground sticky left-0 bg-muted/50 z-10">Total</td>
                          <td colSpan={2} className="py-2 px-3 font-bold text-foreground text-right">Tax Liability</td>
                          <td className="py-2 px-3 text-right font-bold text-primary">{formatCurrency(getTotalTax(selectedCalculation))}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              )}

              {/* Notes */}
              {selectedCalculation.notes && (
                <div>
                  <h4 className="text-sm font-semibold text-foreground mb-2">Notes</h4>
                  <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
                    {selectedCalculation.notes}
                  </p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav activeTab={activeTab} onTabChange={setActiveTab} savingsEnabled={savingsEnabled} />
    </div>
  );
}
