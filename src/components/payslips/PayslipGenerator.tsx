import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Download, Save, Calculator, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import {
  PayslipData,
  getDefaultPayslipData,
  autoCalculateDeductions,
  calculateGrossPay,
  calculateTotalDeductions,
  calculateNetPay,
  MONTH_NAMES,
} from '@/lib/payslipCalculations';
import { generatePayslipPDF, YTDTotals, PayslipTheme } from '@/lib/payslipPdfGenerator';
import { formatCurrency } from '@/lib/taxCalculations';
import { trackEvent } from '@/lib/analytics';
import { Checkbox } from '@/components/ui/checkbox';

interface PayslipGeneratorProps {
  onSaved?: () => void;
  cloneData?: Partial<PayslipData> | null;
  onCloneConsumed?: () => void;
  editId?: string | null;
  editData?: Partial<PayslipData> | null;
  onEditCleared?: () => void;
}

export default function PayslipGenerator({ onSaved, cloneData, onCloneConsumed, editId, editData, onEditCleared }: PayslipGeneratorProps) {
  const { user } = useAuth();
  const [data, setData] = useState<PayslipData>(getDefaultPayslipData());
  const [autoCalc, setAutoCalc] = useState(true);
  const [includeYTD, setIncludeYTD] = useState(false);
  const [pdfTheme, setPdfTheme] = useState<PayslipTheme>('branded');
  const [saving, setSaving] = useState(false);

  // Pre-fill employee name from profile
  useEffect(() => {
    if (user) {
      const name = user.user_metadata?.full_name || user.user_metadata?.name || '';
      setData(prev => ({ ...prev, employeeName: prev.employeeName || name }));
    }
  }, [user]);

  // Apply cloned data
  useEffect(() => {
    if (cloneData) {
      setData(prev => ({ ...prev, ...cloneData }));
      onCloneConsumed?.();
    }
  }, [cloneData, onCloneConsumed]);

  // Apply edit data
  useEffect(() => {
    if (editData) {
      setAutoCalc(false); // preserve saved values
      setData(prev => ({ ...prev, ...editData }));
    }
  }, [editData]);


  useEffect(() => {
    if (!autoCalc) return;
    const updates = autoCalculateDeductions(data);
    setData(prev => ({ ...prev, ...updates }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    autoCalc,
    data.basicSalary,
    data.housingAllowance,
    data.transportAllowance,
    data.utilityAllowance,
    data.mealAllowance,
    data.leaveAllowance,
    data.overtime,
    data.otherAllowances,
  ]);

  const handleRecalculate = () => {
    const updates = autoCalculateDeductions(data);
    setData(prev => ({ ...prev, ...updates }));
    toast.success('Deductions recalculated');
  };

  const update = (field: keyof PayslipData, value: string | number) => {
    setData(prev => ({ ...prev, [field]: value }));
  };

  const numField = (field: keyof PayslipData, label: string, disabled = false) => (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <Input
        type="number"
        min={0}
        step="0.01"
        value={data[field] as number || ''}
        onChange={e => update(field, parseFloat(e.target.value) || 0)}
        disabled={disabled}
        className="h-9 text-sm"
        placeholder="0.00"
      />
    </div>
  );

  const grossPay = calculateGrossPay(data);
  const totalDeductions = calculateTotalDeductions(data);
  const netPay = calculateNetPay(data);

  const fetchYTDTotals = async (): Promise<YTDTotals | undefined> => {
    if (!user || !includeYTD) return undefined;
    try {
      const { data: slips } = await supabase
        .from('payslips')
        .select('gross_pay, total_deductions, net_pay')
        .eq('tax_year', data.taxYear)
        .eq('source', 'generated');

      if (!slips || slips.length === 0) {
        // Include current payslip only
        return {
          grossPay: grossPay,
          totalDeductions: totalDeductions,
          netPay: netPay,
          monthsCovered: 1,
        };
      }

      // Sum saved payslips + current
      const ytd: YTDTotals = {
        grossPay: grossPay,
        totalDeductions: totalDeductions,
        netPay: netPay,
        monthsCovered: slips.length + 1,
      };
      slips.forEach(s => {
        ytd.grossPay += Number(s.gross_pay);
        ytd.totalDeductions += Number(s.total_deductions);
        ytd.netPay += Number(s.net_pay);
      });
      return ytd;
    } catch {
      return undefined;
    }
  };

  const handleDownloadPDF = async () => {
    const ytd = await fetchYTDTotals();
    generatePayslipPDF(data, true, ytd, pdfTheme);
    trackEvent('payslip_download', { month: data.payPeriodMonth, year: data.payPeriodYear, ytd: includeYTD });
  };

  const handleSave = async () => {
    if (!user) {
      toast.error('Please sign in to save payslips');
      return;
    }
    if (!data.employeeName || !data.companyName || grossPay <= 0) {
      toast.error('Please fill in employee name, company name, and at least one earning');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        user_id: user.id,
        pay_period_month: data.payPeriodMonth,
        pay_period_year: data.payPeriodYear,
        tax_year: data.taxYear,
        employee_name: data.employeeName,
        employee_id: data.employeeId || null,
        department: data.department || null,
        job_title: data.jobTitle || null,
        company_name: data.companyName,
        basic_salary: data.basicSalary,
        housing_allowance: data.housingAllowance,
        transport_allowance: data.transportAllowance,
        utility_allowance: data.utilityAllowance,
        meal_allowance: data.mealAllowance,
        leave_allowance: data.leaveAllowance,
        overtime: data.overtime,
        other_allowances: data.otherAllowances,
        gross_pay: grossPay,
        paye_tax: data.payeTax,
        pension_employee: data.pensionEmployee,
        pension_employer: data.pensionEmployer,
        nhf: data.nhf,
        nhis: data.nhis,
        loan_repayment: data.loanRepayment,
        other_deductions: data.otherDeductions,
        total_deductions: totalDeductions,
        net_pay: netPay,
        source: 'generated' as const,
        notes: data.notes || null,
      };

      if (editId) {
        const { error } = await supabase.from('payslips').update(payload).eq('id', editId);
        if (error) throw error;
        toast.success('Payslip updated!');
        trackEvent('payslip_updated', { month: data.payPeriodMonth, year: data.payPeriodYear });
      } else {
        const { error } = await supabase.from('payslips').insert(payload);
        if (error) throw error;
        toast.success('Payslip saved!');
        trackEvent('payslip_saved', { month: data.payPeriodMonth, year: data.payPeriodYear });
      }
      onSaved?.();
    } catch (err: any) {
      console.error('Error saving payslip:', err);
      toast.error(editId ? 'Failed to update payslip' : 'Failed to save payslip');
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setData(getDefaultPayslipData());
    setAutoCalc(true);
    onEditCleared?.();
  };

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Calculator className="w-5 h-5 text-primary" />
          </div>
          <div>
            <CardTitle className="text-base">{editId ? 'Edit Payslip' : 'Generate Payslip'}</CardTitle>
            <CardDescription className="text-xs">
              {editId ? 'Update this saved payslip' : 'Create a payslip with auto-calculated deductions under NTA 2025'}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Employee & Employer Info */}
        <div>
          <h4 className="text-sm font-semibold mb-3">Employee & Company Info</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Employee Name *</Label>
              <Input value={data.employeeName} onChange={e => update('employeeName', e.target.value)} className="h-9 text-sm" placeholder="Full name" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Company Name *</Label>
              <Input value={data.companyName} onChange={e => update('companyName', e.target.value)} className="h-9 text-sm" placeholder="Employer name" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Employee ID</Label>
              <Input value={data.employeeId} onChange={e => update('employeeId', e.target.value)} className="h-9 text-sm" placeholder="Optional" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Job Title</Label>
              <Input value={data.jobTitle} onChange={e => update('jobTitle', e.target.value)} className="h-9 text-sm" placeholder="Optional" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Department</Label>
              <Input value={data.department} onChange={e => update('department', e.target.value)} className="h-9 text-sm" placeholder="Optional" />
            </div>
          </div>
        </div>

        {/* Pay Period */}
        <div>
          <h4 className="text-sm font-semibold mb-3">Pay Period</h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Month</Label>
              <Select value={String(data.payPeriodMonth)} onValueChange={v => update('payPeriodMonth', parseInt(v))}>
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MONTH_NAMES.map((m, i) => (
                    <SelectItem key={i + 1} value={String(i + 1)}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Year</Label>
              <Select value={String(data.payPeriodYear)} onValueChange={v => update('payPeriodYear', parseInt(v))}>
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {years.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Tax Year</Label>
              <Select value={String(data.taxYear)} onValueChange={v => update('taxYear', parseInt(v))}>
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {years.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <Separator />

        {/* Earnings */}
        <div>
          <h4 className="text-sm font-semibold mb-3">Monthly Earnings (₦)</h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {numField('basicSalary', 'Basic Salary *')}
            {numField('housingAllowance', 'Housing Allowance')}
            {numField('transportAllowance', 'Transport Allowance')}
            {numField('utilityAllowance', 'Utility Allowance')}
            {numField('mealAllowance', 'Meal Allowance')}
            {numField('leaveAllowance', 'Leave Allowance')}
            {numField('overtime', 'Overtime')}
            {numField('otherAllowances', 'Other Allowances')}
          </div>
          <div className="mt-3 p-3 bg-muted/50 rounded-lg flex items-center justify-between">
            <span className="text-sm font-medium">Gross Pay</span>
            <span className="text-lg font-bold text-primary">{formatCurrency(grossPay)}</span>
          </div>
        </div>

        <Separator />

        {/* Deductions */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold">Monthly Deductions (₦)</h4>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Switch checked={autoCalc} onCheckedChange={setAutoCalc} id="auto-calc" />
                <Label htmlFor="auto-calc" className="text-xs cursor-pointer">Auto-calculate</Label>
              </div>
              {!autoCalc && (
                <Button variant="ghost" size="sm" onClick={handleRecalculate} className="h-7 text-xs gap-1">
                  <RefreshCw className="w-3 h-3" /> Recalculate
                </Button>
              )}
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {numField('payeTax', 'PAYE Tax', autoCalc)}
            {numField('pensionEmployee', 'Pension (Employee 8%)', autoCalc)}
            {numField('nhf', 'NHF (2.5%)', autoCalc)}
            {numField('nhis', 'NHIS (5%)', autoCalc)}
            {numField('loanRepayment', 'Loan Repayment')}
            {numField('otherDeductions', 'Other Deductions')}
          </div>
          {data.pensionEmployer > 0 && (
            <p className="text-xs text-muted-foreground mt-2 italic">
              Employer Pension Contribution (10%): {formatCurrency(data.pensionEmployer)}
            </p>
          )}
          <div className="mt-3 p-3 bg-destructive/5 rounded-lg flex items-center justify-between">
            <span className="text-sm font-medium">Total Deductions</span>
            <span className="text-lg font-bold text-destructive">{formatCurrency(totalDeductions)}</span>
          </div>
        </div>

        <Separator />

        {/* Net Pay */}
        <div className="p-4 bg-primary/10 rounded-xl flex items-center justify-between">
          <span className="text-base font-bold">Net Pay</span>
          <span className="text-2xl font-bold text-primary">{formatCurrency(netPay)}</span>
        </div>

        {/* Notes */}
        <div className="space-y-1.5">
          <Label className="text-xs">Notes (optional)</Label>
          <Textarea
            value={data.notes}
            onChange={e => update('notes', e.target.value)}
            placeholder="Any additional notes..."
            className="text-sm resize-none"
            rows={2}
          />
        </div>

        {/* PDF Options */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex items-center gap-2">
            <Checkbox id="include-ytd" checked={includeYTD} onCheckedChange={(v) => setIncludeYTD(!!v)} />
            <Label htmlFor="include-ytd" className="text-xs cursor-pointer">
              Include YTD totals
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <Label className="text-xs">PDF Theme:</Label>
            <Select value={pdfTheme} onValueChange={(v) => setPdfTheme(v as PayslipTheme)}>
              <SelectTrigger className="h-8 text-xs w-[130px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="branded">TaxAware</SelectItem>
                <SelectItem value="generic">Generic</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Button onClick={handleDownloadPDF} variant="outline" className="flex-1 gap-2" disabled={grossPay <= 0}>
            <Download className="w-4 h-4" /> Download PDF
          </Button>
          <Button onClick={handleSave} className="flex-1 gap-2" disabled={saving || grossPay <= 0}>
            <Save className="w-4 h-4" /> {saving ? 'Saving...' : editId ? 'Update Payslip' : 'Save to Account'}
          </Button>
          {editId && (
            <Button onClick={handleCancelEdit} variant="ghost" className="gap-2">
              Cancel Edit
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
