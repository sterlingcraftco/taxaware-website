import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { calculateCompleteTax, calculateSimpleTax } from '@/lib/taxCalculations';

export interface TaxReadinessData {
  estimatedLiability: number;
  payePaid: number;
  remainingLiability: number;
  readinessPercent: number;
  grossIncome: number;
  employmentIncome: number;
  nonEmploymentIncome: number;
  taxYear: number;
  loading: boolean;
  hasData: boolean;
  monthlyRecommendation: number;
  scenario: 'no_data' | 'employment_only' | 'self_employed' | 'mixed';
  isPartialYear: boolean;
  monthsOfData: number;
  employerCount: number;
  potentialRefund: number;
}

export function useTaxReadiness(taxYear?: number) {
  const currentYear = taxYear || new Date().getFullYear();
  const [incomeTotal, setIncomeTotal] = useState(0);
  const [employmentIncome, setEmploymentIncome] = useState(0);
  const [nonEmploymentIncome, setNonEmploymentIncome] = useState(0);
  const [deductionTotals, setDeductionTotals] = useState({ pension: 0, nhf: 0, nhis: 0 });
  const [payePaid, setPayePaid] = useState(0);
  const [employerCount, setEmployerCount] = useState(0);
  const [monthsOfData, setMonthsOfData] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

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
          .select('paye_tax, pension_employee, nhf, nhis, tax_year, gross_pay, company_name, pay_period_month')
          .eq('tax_year', currentYear),
      ]);

      // Process income transactions for the year
      const transactions = transactionsRes.data || [];
      const yearIncome = transactions.filter(t => {
        const yr = t.tax_year || new Date(t.transaction_date).getFullYear();
        return yr === currentYear;
      });
      const totalIncome = yearIncome.reduce((sum, t) => sum + Number(t.amount), 0);

      // Employment income from payslips
      const payslips = payslipsRes.data || [];
      const empIncome = payslips.reduce((s, p) => s + Number(p.gross_pay), 0);
      const nonEmpIncome = Math.max(0, totalIncome - empIncome);

      setIncomeTotal(totalIncome);
      setEmploymentIncome(empIncome);
      setNonEmploymentIncome(nonEmpIncome);

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
      const totalPaye = payslips.reduce((sum, p) => sum + Number(p.paye_tax), 0);
      setPayePaid(totalPaye);

      // Also aggregate payslip deductions if no expense transactions recorded
      if (pension === 0 && nhf === 0 && nhis === 0 && payslips.length > 0) {
        pension = payslips.reduce((s, p) => s + Number(p.pension_employee), 0);
        nhf = payslips.reduce((s, p) => s + Number(p.nhf), 0);
        nhis = payslips.reduce((s, p) => s + Number(p.nhis), 0);
        setDeductionTotals({ pension, nhf, nhis });
      }

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
    const remainingLiability = Math.max(0, estimatedLiability - payePaid);
    const readinessPercent = estimatedLiability > 0
      ? Math.min(100, Math.round((payePaid / estimatedLiability) * 100))
      : incomeTotal > 0 ? 100 : 0;

    const monthsLeft = Math.max(1, 12 - new Date().getMonth());
    const monthlyRecommendation = remainingLiability > 0 ? Math.ceil(remainingLiability / monthsLeft) : 0;

    // Determine scenario
    const hasEmployment = employmentIncome > 0;
    const hasOtherIncome = nonEmploymentIncome > 0;
    let scenario: TaxReadinessData['scenario'] = 'no_data';
    if (hasEmployment && hasOtherIncome) scenario = 'mixed';
    else if (hasEmployment) scenario = 'employment_only';
    else if (hasOtherIncome || incomeTotal > 0) scenario = 'self_employed';

    return {
      estimatedLiability,
      payePaid,
      remainingLiability,
      readinessPercent,
      grossIncome: incomeTotal,
      employmentIncome,
      nonEmploymentIncome,
      taxYear: currentYear,
      loading,
      hasData: incomeTotal > 0 || payePaid > 0,
      monthlyRecommendation,
      scenario,
    };
  }, [incomeTotal, employmentIncome, nonEmploymentIncome, deductionTotals, payePaid, currentYear, loading]);

  return readiness;
}
