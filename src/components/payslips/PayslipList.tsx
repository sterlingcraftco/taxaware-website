import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
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
import { FileText, Upload, Trash2, Download, Calendar, Copy, Pencil, ArrowRightLeft, Eye } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { MONTH_NAMES } from '@/lib/payslipCalculations';
import type { PayslipData } from '@/lib/payslipCalculations';
import { formatCurrency } from '@/lib/taxCalculations';
import { trackEvent } from '@/lib/analytics';
import PayslipTransactionsModal from './PayslipTransactionsModal';

interface PayslipRecord {
  id: string;
  pay_period_month: number;
  pay_period_year: number;
  tax_year: number;
  employee_name: string;
  company_name: string;
  gross_pay: number;
  total_deductions: number;
  net_pay: number;
  source: string;
  file_name: string | null;
  file_path: string | null;
  created_at: string;
  has_transactions?: boolean;
}

interface PayslipListProps {
  refreshKey?: number;
  onClone?: (data: Partial<PayslipData>) => void;
  onEdit?: (id: string, data: Partial<PayslipData>) => void;
}

export default function PayslipList({ refreshKey, onClone, onEdit }: PayslipListProps) {
  const { user } = useAuth();
  const [payslips, setPayslips] = useState<PayslipRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [taxYearFilter, setTaxYearFilter] = useState<string>('all');
  const [uploading, setUploading] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [recordingId, setRecordingId] = useState<string | null>(null);
  const [viewTransPayslipId, setViewTransPayslipId] = useState<string | null>(null);
  const [viewTransLabel, setViewTransLabel] = useState('');
  // Track which payslips have linked transactions
  const [linkedPayslipIds, setLinkedPayslipIds] = useState<Set<string>>(new Set());

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 6 }, (_, i) => currentYear - i);

  const fetchPayslips = useCallback(async () => {
    if (!user) return;
    try {
      let query = supabase
        .from('payslips')
        .select('id, pay_period_month, pay_period_year, tax_year, employee_name, company_name, gross_pay, total_deductions, net_pay, source, file_name, file_path, created_at')
        .order('pay_period_year', { ascending: false })
        .order('pay_period_month', { ascending: false });

      if (taxYearFilter !== 'all') {
        query = query.eq('tax_year', parseInt(taxYearFilter));
      }

      const { data, error } = await query;
      if (error) throw error;
      setPayslips(data || []);

      // Check which payslips have linked transactions
      if (data && data.length > 0) {
        const ids = data.map(p => p.id);
        const { data: linked } = await supabase
          .from('transactions')
          .select('payslip_id')
          .in('payslip_id', ids);
        if (linked) {
          setLinkedPayslipIds(new Set(linked.map(l => l.payslip_id).filter(Boolean) as string[]));
        }
      }
    } catch (err) {
      console.error('Error fetching payslips:', err);
      toast.error('Failed to load payslips');
    } finally {
      setLoading(false);
    }
  }, [user, taxYearFilter]);

  useEffect(() => {
    fetchPayslips();
  }, [fetchPayslips, refreshKey]);

  // --- Upload handler ---
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!user || !e.target.files?.length) return;
    const file = e.target.files[0];
    const maxSize = 10 * 1024 * 1024;

    if (file.size > maxSize) { toast.error('File must be less than 10MB'); return; }

    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) { toast.error('Only PDF, JPG, PNG files are allowed'); return; }

    setUploading(true);
    try {
      const filePath = `${user.id}/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage.from('payslip-documents').upload(filePath, file);
      if (uploadError) throw uploadError;

      const now = new Date();
      const { error: insertError } = await supabase.from('payslips').insert({
        user_id: user.id,
        pay_period_month: now.getMonth() + 1,
        pay_period_year: now.getFullYear(),
        tax_year: now.getFullYear(),
        employee_name: user.user_metadata?.full_name || 'Unknown',
        company_name: 'Uploaded Document',
        source: 'uploaded',
        file_name: file.name,
        file_path: filePath,
        file_size: file.size,
        mime_type: file.type,
      });
      if (insertError) throw insertError;

      toast.success('Payslip uploaded successfully');
      trackEvent('payslip_uploaded', { file_type: file.type });
      fetchPayslips();
    } catch (err: any) {
      console.error('Upload error:', err);
      toast.error('Failed to upload payslip');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  // --- Delete handler ---
  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      const payslip = payslips.find(p => p.id === deleteId);
      if (payslip?.file_path) {
        await supabase.storage.from('payslip-documents').remove([payslip.file_path]);
      }
      const { error } = await supabase.from('payslips').delete().eq('id', deleteId);
      if (error) throw error;
      setPayslips(prev => prev.filter(p => p.id !== deleteId));
      toast.success('Payslip deleted');
    } catch (err) {
      console.error('Delete error:', err);
      toast.error('Failed to delete payslip');
    } finally {
      setDeleteId(null);
    }
  };

  // --- Edit handler ---
  const handleEdit = async (slip: PayslipRecord) => {
    if (!onEdit || slip.source !== 'generated') return;
    const { data: full } = await supabase.from('payslips').select('*').eq('id', slip.id).single();
    if (!full) return;

    onEdit(slip.id, {
      employeeName: full.employee_name, employeeId: full.employee_id || '', department: full.department || '',
      jobTitle: full.job_title || '', companyName: full.company_name, payPeriodMonth: full.pay_period_month,
      payPeriodYear: full.pay_period_year, taxYear: full.tax_year, basicSalary: Number(full.basic_salary),
      housingAllowance: Number(full.housing_allowance), transportAllowance: Number(full.transport_allowance),
      utilityAllowance: Number(full.utility_allowance), mealAllowance: Number(full.meal_allowance),
      leaveAllowance: Number(full.leave_allowance), overtime: Number(full.overtime),
      otherAllowances: Number(full.other_allowances), loanRepayment: Number(full.loan_repayment),
      otherDeductions: Number(full.other_deductions), payeTax: Number(full.paye_tax),
      pensionEmployee: Number(full.pension_employee), pensionEmployer: Number(full.pension_employer),
      nhf: Number(full.nhf), nhis: Number(full.nhis), notes: full.notes || '',
    });
    toast.success('Payslip loaded for editing');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // --- Clone handler ---
  const handleClone = async (slip: PayslipRecord) => {
    if (!onClone || slip.source !== 'generated') return;
    const { data: full } = await supabase.from('payslips').select('*').eq('id', slip.id).single();
    if (!full) return;

    let nextMonth = full.pay_period_month + 1;
    let nextYear = full.pay_period_year;
    if (nextMonth > 12) { nextMonth = 1; nextYear += 1; }

    onClone({
      employeeName: full.employee_name, employeeId: full.employee_id || '', department: full.department || '',
      jobTitle: full.job_title || '', companyName: full.company_name, payPeriodMonth: nextMonth,
      payPeriodYear: nextYear, taxYear: nextYear, basicSalary: Number(full.basic_salary),
      housingAllowance: Number(full.housing_allowance), transportAllowance: Number(full.transport_allowance),
      utilityAllowance: Number(full.utility_allowance), mealAllowance: Number(full.meal_allowance),
      leaveAllowance: Number(full.leave_allowance), overtime: Number(full.overtime),
      otherAllowances: Number(full.other_allowances), loanRepayment: Number(full.loan_repayment),
      otherDeductions: Number(full.other_deductions), notes: '',
    });
    toast.success(`Cloned to ${MONTH_NAMES[nextMonth - 1]} ${nextYear}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // --- Record as Transactions handler ---
  const handleRecordTransactions = async (slip: PayslipRecord) => {
    if (!user || slip.source !== 'generated') return;
    if (linkedPayslipIds.has(slip.id)) {
      toast.error('Transactions already recorded for this payslip');
      return;
    }

    setRecordingId(slip.id);
    try {
      const { data: full } = await supabase.from('payslips').select('*').eq('id', slip.id).single();
      if (!full) throw new Error('Payslip not found');

      const monthLabel = `${MONTH_NAMES[full.pay_period_month - 1]} ${full.pay_period_year}`;
      const txDate = `${full.pay_period_year}-${String(full.pay_period_month).padStart(2, '0')}-28`;

      // Build transactions array
      const txns: any[] = [];

      // Income: Net pay
      txns.push({
        user_id: user.id,
        description: `Salary - ${monthLabel}`,
        type: 'income',
        amount: Number(full.net_pay),
        transaction_date: txDate,
        tax_year: full.tax_year,
        payslip_id: slip.id,
        notes: `Auto-recorded from payslip: ${full.company_name}`,
      });

      // Expenses: statutory deductions
      const deductions = [
        { amount: Number(full.paye_tax), label: 'PAYE Tax' },
        { amount: Number(full.pension_employee), label: 'Pension (Employee)' },
        { amount: Number(full.nhf), label: 'NHF Contribution' },
        { amount: Number(full.nhis), label: 'NHIS Contribution' },
        { amount: Number(full.loan_repayment), label: 'Loan Repayment' },
        { amount: Number(full.other_deductions), label: 'Other Deductions' },
      ];

      for (const d of deductions) {
        if (d.amount > 0) {
          txns.push({
            user_id: user.id,
            description: `${d.label} - ${monthLabel}`,
            type: 'expense',
            amount: d.amount,
            transaction_date: txDate,
            tax_year: full.tax_year,
            payslip_id: slip.id,
            notes: `Auto-recorded from payslip: ${full.company_name}`,
          });
        }
      }

      const { error } = await supabase.from('transactions').insert(txns);
      if (error) throw error;

      setLinkedPayslipIds(prev => new Set(prev).add(slip.id));
      toast.success(`${txns.length} transaction(s) recorded for ${monthLabel}`);
      trackEvent('payslip_transactions_recorded', { count: txns.length });
    } catch (err) {
      console.error('Error recording transactions:', err);
      toast.error('Failed to record transactions');
    } finally {
      setRecordingId(null);
    }
  };

  const handleDownloadFile = async (filePath: string, fileName: string) => {
    try {
      const { data, error } = await supabase.storage.from('payslip-documents').download(filePath);
      if (error) throw error;
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Failed to download file');
    }
  };

  return (
    <>
      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-accent/10">
                <FileText className="w-5 h-5 text-accent-foreground" />
              </div>
              <div>
                <CardTitle className="text-base">My Payslips</CardTitle>
                <CardDescription className="text-xs">Generated and uploaded payslips</CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Select value={taxYearFilter} onValueChange={setTaxYearFilter}>
                <SelectTrigger className="h-8 text-xs w-[110px]">
                  <Calendar className="w-3 h-3 mr-1" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Years</SelectItem>
                  {years.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                </SelectContent>
              </Select>
              <Label htmlFor="upload-payslip" className="cursor-pointer">
                <Button variant="outline" size="sm" className="h-8 text-xs gap-1" asChild disabled={uploading}>
                  <span>
                    <Upload className="w-3 h-3" />
                    {uploading ? 'Uploading...' : 'Upload'}
                  </span>
                </Button>
                <Input id="upload-payslip" type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" className="hidden" onChange={handleUpload} disabled={uploading} />
              </Label>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground animate-pulse">Loading payslips...</div>
          ) : payslips.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm">No payslips yet</p>
              <p className="text-xs mt-1">Generate one above or upload an existing payslip</p>
            </div>
          ) : (
            <div className="space-y-2">
              {payslips.map(slip => {
                const hasLinked = linkedPayslipIds.has(slip.id);
                return (
                  <div key={slip.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/30 transition-colors">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className={`p-1.5 rounded ${slip.source === 'uploaded' ? 'bg-blue-500/10' : 'bg-primary/10'}`}>
                        <FileText className={`w-4 h-4 ${slip.source === 'uploaded' ? 'text-blue-500' : 'text-primary'}`} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-medium truncate">
                            {MONTH_NAMES[slip.pay_period_month - 1]} {slip.pay_period_year}
                          </p>
                          <Badge variant={slip.source === 'uploaded' ? 'secondary' : 'outline'} className="text-[9px] px-1.5 py-0 shrink-0">
                            {slip.source === 'uploaded' ? 'Uploaded' : 'Generated'}
                          </Badge>
                          {hasLinked && (
                            <Badge variant="outline" className="text-[9px] px-1.5 py-0 shrink-0 border-green-500/50 text-green-600 cursor-pointer"
                              onClick={() => {
                                setViewTransPayslipId(slip.id);
                                setViewTransLabel(`${MONTH_NAMES[slip.pay_period_month - 1]} ${slip.pay_period_year} — ${slip.company_name}`);
                              }}
                            >
                              <ArrowRightLeft className="w-2.5 h-2.5 mr-0.5" />
                              Recorded
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                          {slip.source === 'uploaded' ? slip.file_name : `${slip.company_name} · Net: ${formatCurrency(slip.net_pay)}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0 ml-2">
                      {slip.source === 'generated' && (
                        <span className="text-sm font-semibold text-primary hidden sm:block mr-2">
                          {formatCurrency(slip.net_pay)}
                        </span>
                      )}
                      {slip.source === 'generated' && !hasLinked && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          title="Record as transactions"
                          disabled={recordingId === slip.id}
                          onClick={() => handleRecordTransactions(slip)}
                        >
                          <ArrowRightLeft className="w-3.5 h-3.5" />
                        </Button>
                      )}
                      {hasLinked && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          title="View linked transactions"
                          onClick={() => {
                            setViewTransPayslipId(slip.id);
                            setViewTransLabel(`${MONTH_NAMES[slip.pay_period_month - 1]} ${slip.pay_period_year} — ${slip.company_name}`);
                          }}
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </Button>
                      )}
                      {slip.source === 'generated' && onEdit && (
                        <Button variant="ghost" size="icon" className="h-7 w-7" title="View & edit" onClick={() => handleEdit(slip)}>
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                      )}
                      {slip.source === 'generated' && onClone && (
                        <Button variant="ghost" size="icon" className="h-7 w-7" title="Clone for next month" onClick={() => handleClone(slip)}>
                          <Copy className="w-3.5 h-3.5" />
                        </Button>
                      )}
                      {slip.file_path && (
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDownloadFile(slip.file_path!, slip.file_name || 'payslip')}>
                          <Download className="w-3.5 h-3.5" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => setDeleteId(slip.id)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>

        <AlertDialog open={!!deleteId} onOpenChange={open => !open && setDeleteId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Payslip</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete this payslip record. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </Card>

      <PayslipTransactionsModal
        open={!!viewTransPayslipId}
        onOpenChange={open => { if (!open) setViewTransPayslipId(null); }}
        payslipId={viewTransPayslipId}
        payslipLabel={viewTransLabel}
        onUnlinked={() => {
          if (viewTransPayslipId) {
            setLinkedPayslipIds(prev => {
              const next = new Set(prev);
              next.delete(viewTransPayslipId);
              return next;
            });
          }
        }}
      />
    </>
  );
}
