import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Calculator, History, TrendingUp, Settings, LogOut, ArrowLeft, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface SavedCalculation {
  id: string;
  annual_income: number;
  tax_result: {
    totalTax: number;
    effectiveRate: number;
    netIncome: number;
  };
  notes: string | null;
  created_at: string;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, loading, signOut } = useAuth();
  const [calculations, setCalculations] = useState<SavedCalculation[]>([]);
  const [loadingCalcs, setLoadingCalcs] = useState(true);

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
      setCalculations((data || []).map(row => ({
        id: row.id,
        annual_income: row.annual_income,
        tax_result: row.tax_result as SavedCalculation['tax_result'],
        notes: row.notes,
        created_at: row.created_at,
      })));
    } catch (error) {
      console.error('Error fetching calculations:', error);
      toast.error('Failed to load saved calculations');
    } finally {
      setLoadingCalcs(false);
    }
  };

  const deleteCalculation = async (id: string) => {
    try {
      const { error } = await supabase
        .from('saved_calculations')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setCalculations(prev => prev.filter(calc => calc.id !== id));
      toast.success('Calculation deleted');
    } catch (error) {
      console.error('Error deleting calculation:', error);
      toast.error('Failed to delete calculation');
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
    <div className="min-h-screen bg-gradient-to-br from-muted/30 to-background">
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
                <h1 className="font-semibold">NTA 2025 Dashboard</h1>
                <p className="text-sm text-muted-foreground">
                  {user.email}
                </p>
              </div>
            </div>
          </div>
          <Button variant="outline" onClick={handleSignOut}>
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-2">
            Welcome back{user.user_metadata?.full_name ? `, ${user.user_metadata.full_name}` : ''}!
          </h2>
          <p className="text-muted-foreground">
            Track your tax calculations and manage your financial planning
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Quick Calculator Card */}
          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate('/')}>
            <CardHeader>
              <div className="p-3 rounded-lg bg-primary/10 w-fit mb-2">
                <Calculator className="w-6 h-6 text-primary" />
              </div>
              <CardTitle>Tax Calculator</CardTitle>
              <CardDescription>
                Calculate your tax under the new NTA 2025 system
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full">Calculate Now</Button>
            </CardContent>
          </Card>

          {/* Saved Calculations Card - Full Width */}
          <Card className="md:col-span-2 lg:col-span-3">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-lg bg-accent/10">
                  <History className="w-6 h-6 text-accent" />
                </div>
                <div>
                  <CardTitle>Saved Calculations</CardTitle>
                  <CardDescription>
                    View and manage your saved tax calculations
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loadingCalcs ? (
                <div className="text-center py-8 text-muted-foreground">
                  <div className="animate-pulse">Loading calculations...</div>
                </div>
              ) : calculations.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <History className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p className="text-sm">No saved calculations yet</p>
                  <p className="text-xs mt-1">Your saved calculations will appear here</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
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
                        <TableRow key={calc.id}>
                          <TableCell className="whitespace-nowrap">
                            {new Date(calc.created_at).toLocaleDateString('en-NG', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </TableCell>
                          <TableCell>{formatCurrency(calc.annual_income)}</TableCell>
                          <TableCell>{formatCurrency(calc.tax_result.totalTax)}</TableCell>
                          <TableCell>{calc.tax_result.effectiveRate.toFixed(2)}%</TableCell>
                          <TableCell>{formatCurrency(calc.tax_result.netIncome)}</TableCell>
                          <TableCell className="max-w-[200px] truncate">
                            {calc.notes || '-'}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={() => deleteCalculation(calc.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

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

          {/* Settings Card */}
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="p-3 rounded-lg bg-secondary/50 w-fit mb-2">
                <Settings className="w-6 h-6 text-secondary-foreground" />
              </div>
              <CardTitle>Profile Settings</CardTitle>
              <CardDescription>
                Manage your account and preferences
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <Settings className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm">Coming soon</p>
                <p className="text-xs mt-1">Update your profile settings</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
