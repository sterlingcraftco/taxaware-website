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
import { Calculator, History, TrendingUp, Settings, LogOut, ArrowLeft, Trash2, User, ChevronDown, Download } from 'lucide-react';
import jsPDF from 'jspdf';
import { toast } from 'sonner';
import DashboardCalculator from '@/components/DashboardCalculator';

interface TaxBreakdown {
  band: string;
  rate: number;
  taxableInBand: number;
  taxInBand: number;
}

interface SavedCalculation {
  id: string;
  annual_income: number;
  tax_result: {
    total: number;
    breakdown: TaxBreakdown[];
  };
  notes: string | null;
  created_at: string;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, loading, signOut } = useAuth();
  const [calculations, setCalculations] = useState<SavedCalculation[]>([]);
  const [loadingCalcs, setLoadingCalcs] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [calculationToDelete, setCalculationToDelete] = useState<string | null>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [selectedCalculation, setSelectedCalculation] = useState<SavedCalculation | null>(null);

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
        tax_result: row.tax_result as unknown as SavedCalculation['tax_result'],
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
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    let y = 20;

    // Title
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('Tax Calculation Report', pageWidth / 2, y, { align: 'center' });
    y += 10;

    // Date
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100);
    doc.text(`Generated on ${new Date(calc.created_at).toLocaleDateString('en-NG', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })}`, pageWidth / 2, y, { align: 'center' });
    y += 15;

    // Summary Section
    doc.setTextColor(0);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Summary', 20, y);
    y += 8;

    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    const summaryData = [
      ['Annual Income', formatCurrency(calc.annual_income)],
      ['Total Tax', formatCurrency(getTotalTax(calc))],
      ['Take Home', formatCurrency(getNetIncome(calc))],
      ['Effective Rate', `${getEffectiveRate(calc).toFixed(2)}%`],
    ];

    summaryData.forEach(([label, value]) => {
      doc.text(`${label}:`, 20, y);
      doc.setFont('helvetica', 'bold');
      doc.text(value, 80, y);
      doc.setFont('helvetica', 'normal');
      y += 7;
    });

    y += 10;

    // Tax Band Breakdown
    if (calc.tax_result?.breakdown && calc.tax_result.breakdown.length > 0) {
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Tax Band Breakdown', 20, y);
      y += 10;

      // Table Header
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setFillColor(240, 240, 240);
      doc.rect(20, y - 5, pageWidth - 40, 8, 'F');
      doc.text('Band', 22, y);
      doc.text('Rate', 80, y);
      doc.text('Taxable', 110, y);
      doc.text('Tax', 160, y);
      y += 8;

      // Table Rows
      doc.setFont('helvetica', 'normal');
      calc.tax_result.breakdown.forEach((row) => {
        doc.text(row.band, 22, y);
        doc.text(`${row.rate}%`, 80, y);
        doc.text(formatCurrency(row.taxableInBand), 110, y);
        doc.text(formatCurrency(row.taxInBand), 160, y);
        y += 7;
      });

      // Total Row
      y += 3;
      doc.setFont('helvetica', 'bold');
      doc.setFillColor(240, 240, 240);
      doc.rect(20, y - 5, pageWidth - 40, 8, 'F');
      doc.text('Total Tax Liability', 22, y);
      doc.text(formatCurrency(getTotalTax(calc)), 160, y);
      y += 12;
    }

    // Notes
    if (calc.notes) {
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Notes', 20, y);
      y += 8;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      const splitNotes = doc.splitTextToSize(calc.notes, pageWidth - 40);
      doc.text(splitNotes, 20, y);
    }

    // Footer
    const pageHeight = doc.internal.pageSize.getHeight();
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text('NTA 2025 Tax Calculator', pageWidth / 2, pageHeight - 10, { align: 'center' });

    // Save PDF
    const fileName = `tax-calculation-${new Date(calc.created_at).toISOString().split('T')[0]}.pdf`;
    doc.save(fileName);
    toast.success('PDF downloaded successfully');
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
              <DropdownMenuItem disabled className="gap-2">
                <Settings className="w-4 h-4" />
                Profile Settings
                <span className="ml-auto text-xs text-muted-foreground">Soon</span>
              </DropdownMenuItem>
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
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-2">
            Welcome back{user.user_metadata?.full_name ? `, ${user.user_metadata.full_name}` : ''}!
          </h2>
          <p className="text-muted-foreground">
            Track your tax calculations and manage your financial planning
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Saved Calculations Card - Takes up 2 columns on large screens */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <div className="flex items-center justify-between">
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
        </div>
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
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-2">
                <Calculator className="w-5 h-5" />
                Calculation Details
              </DialogTitle>
              {selectedCalculation && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDownloadPDF(selectedCalculation)}
                  className="gap-2"
                >
                  <Download className="w-4 h-4" />
                  Download PDF
                </Button>
              )}
            </div>
          </DialogHeader>
          
          {selectedCalculation && (
            <div className="space-y-6">
              {/* Date */}
              <p className="text-sm text-muted-foreground">
                Saved on {new Date(selectedCalculation.created_at).toLocaleDateString('en-NG', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </p>

              {/* Summary Cards */}
              <div className="grid sm:grid-cols-3 gap-3">
                <div className="bg-muted/50 rounded-xl p-4">
                  <span className="text-xs font-medium text-muted-foreground">Annual Income</span>
                  <p className="text-xl font-bold text-foreground">{formatCurrency(selectedCalculation.annual_income)}</p>
                </div>

                <div className="bg-primary/10 rounded-xl p-4">
                  <span className="text-xs font-medium text-muted-foreground">Total Tax</span>
                  <p className="text-xl font-bold text-foreground">{formatCurrency(getTotalTax(selectedCalculation))}</p>
                </div>

                <div className="bg-accent/10 rounded-xl p-4">
                  <span className="text-xs font-medium text-muted-foreground">Take Home</span>
                  <p className="text-xl font-bold text-foreground">{formatCurrency(getNetIncome(selectedCalculation))}</p>
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
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left py-2 px-3 font-semibold text-muted-foreground">Band</th>
                          <th className="text-right py-2 px-3 font-semibold text-muted-foreground">Rate</th>
                          <th className="text-right py-2 px-3 font-semibold text-muted-foreground">Taxable</th>
                          <th className="text-right py-2 px-3 font-semibold text-muted-foreground">Tax</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedCalculation.tax_result.breakdown.map((row, index) => (
                          <tr key={index} className="border-b border-border/50 last:border-0">
                            <td className="py-2 px-3 font-medium text-foreground">{row.band}</td>
                            <td className="py-2 px-3 text-right text-muted-foreground">{row.rate}%</td>
                            <td className="py-2 px-3 text-right text-foreground">{formatCurrency(row.taxableInBand)}</td>
                            <td className="py-2 px-3 text-right font-semibold text-primary">{formatCurrency(row.taxInBand)}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="bg-muted/50">
                          <td colSpan={3} className="py-2 px-3 font-bold text-foreground">Total Tax Liability</td>
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
    </div>
  );
}
