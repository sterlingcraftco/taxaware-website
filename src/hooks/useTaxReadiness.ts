import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { calculateCompleteTax, calculateSimpleTax } from '@/lib/taxCalculations';

export interface TaxReadinessData {
  estimatedLiability: number;
  payePaid: number;
  remainingLiability: number;
  readinessPercent: number;
  grossIncome: number;
  taxYear: number;
  loading: boolean;
  hasData: boolean;
  monthlyRecommendation: number;
}

export function useTaxReadiness(taxYear?: number) {
  const currentYear = taxYear || new Date().getFullYear();
  const [incomeTotal, setIncomeTotal] = useState(0);
  const [deductionTotals, setDeductionTotals] = useState({ pension: 0, nhf: 0, nhis: 0 });
  const [payePaid, setPayePaid] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      // Fetch all data in parallel
      const [transactionsRes, categoriesRes, payslipsRes] = await Promise.all([
        supabase
          .from('transactions')
          .select('amount, type, category_id, transaction_date, tax_year')
          .eq('type', 'income'),
        supabase
          .from('transaction_categories')
          .select('id, name, type'),
        supabase
          .from('payslips')
          .select('paye_tax, pension_employee, nhf, nhis, tax_year')
          .eq('tax_year', currentYear),
      ]);

      // Process income transactions for the year
      const transactions = transactionsRes.data || [];
      const yearIncome = transactions.filter(t => {
        const yr = t.tax_year || new Date(t.transaction_date).getFullYear();
        return yr === currentYear;
      });
      const totalIncome = yearIncome.reduce((sum, t) => sum + Number(t.amount), 0);
      setIncomeTotal(totalIncome);

      // Process expense transactions for deductions
      const expenseRes = await supabase
        .from('transactions')
        .select('amount, category_id, transaction_date, tax_year')
        .eq('type', 'expense');
      
      const expenseTransactions = (expenseRes.data || []).filter(t => {
        const yr = t.tax_year || new Date(t.transaction_date).getFullYear();
        return yr === currentYear;
      });

      const categories = categoriesRes.data || [];
      const catMap = new Map(categories.map(c => [c.id, c.name]));

      let pension = 0, nhf = 0, nhis = 0;
      expenseTransactions.forEach(t => {
        const name = t.category_id ? catMap.get(t.category_id) : null;
        if (name === 'Pension Contribution') pension += Number(t.amount);
        else if (name === 'NHF Contribution') nhf += Number(t.amount);
        else if (name === 'NHIS Contribution') nhis += Number(t.amount);
      });
      setDeductionTotals({ pension, nhf, nhis });

      // Sum PAYE from payslips
      const payslips = payslipsRes.data || [];
      const totalPaye = payslips.reduce((sum, p) => sum + Number(p.paye_tax), 0);
      setPayePaid(totalPaye);

      // Also aggregate payslip deductions if no expense transactions recorded
      if (pension === 0 && nhf === 0 && nhis === 0 && payslips.length > 0) {
        pension = payslips.reduce((s, p) => s + Number(p.pension_employee), 0);
        nhf = payslips.reduce((s, p) => s + Number(p.nhf), 0);
        nhis = payslips.reduce((s, p) => s + Number(p.nhis), 0);
        setDeductionTotals({ pension, nhf, nhis });
      }

      // Tax savings balance
      const balance = savingsRes.data ? Number(savingsRes.data.balance) : 0;
      setTaxSaved(balance);
    } catch (error) {
      console.error('Error fetching tax readiness data:', error);
    } finally {
      setLoading(false);
    }
  }, [currentYear]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const readiness = useMemo((): TaxReadinessData => {
    // Use the appropriate tax law based on year
    const taxResult = currentYear < 2026
      ? calculateSimpleTax(incomeTotal, deductionTotals.pension, deductionTotals.nhf, 0)
      : calculateCompleteTax(
          { salary: incomeTotal, freelance: 0, business: 0, benefitsInKind: 0 },
          deductionTotals.pension,
          deductionTotals.nhf,
          deductionTotals.nhis,
          0, 0, 0
        );

    const estimatedLiability = taxResult.total;
    const totalCovered = payePaid + taxSaved;
    const shortfall = Math.max(0, estimatedLiability - totalCovered);
    const readinessPercent = estimatedLiability > 0
      ? Math.min(100, Math.round((totalCovered / estimatedLiability) * 100))
      : incomeTotal > 0 ? 100 : 0;

    return {
      estimatedLiability,
      payePaid,
      taxSaved,
      totalCovered,
      shortfall,
      readinessPercent,
      grossIncome: incomeTotal,
      taxYear: currentYear,
      loading,
      hasData: incomeTotal > 0 || payePaid > 0,
    };
  }, [incomeTotal, deductionTotals, payePaid, taxSaved, currentYear, loading]);

  return readiness;
}
