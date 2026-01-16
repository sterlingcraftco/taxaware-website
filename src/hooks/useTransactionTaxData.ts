import { useMemo } from 'react';
import { useTransactions } from './useTransactions';

export interface AggregatedTaxData {
  // Income
  salary: number;
  freelance: number;
  businessIncome: number;
  rentalIncome: number;
  investmentReturns: number;
  otherIncome: number;
  totalIncome: number;
  
  // Deductions
  pension: number;
  nhf: number;
  nhis: number;
  lifeInsurance: number;
  voluntaryPension: number;
  rent: number;
  totalDeductions: number;
  
  // Tax year
  taxYear: number;
}

const CATEGORY_MAPPING: Record<string, keyof Omit<AggregatedTaxData, 'totalIncome' | 'totalDeductions' | 'taxYear'>> = {
  'Salary': 'salary',
  'Freelance': 'freelance',
  'Business Income': 'businessIncome',
  'Rental Income': 'rentalIncome',
  'Investment Returns': 'investmentReturns',
  'Other Income': 'otherIncome',
  'Pension Contribution': 'pension',
  'NHF Contribution': 'nhf',
  'NHIS Contribution': 'nhis',
  'Life Insurance': 'lifeInsurance',
  'Voluntary Pension': 'voluntaryPension',
  'Rent': 'rent',
};

export function useTransactionTaxData(taxYear?: number) {
  const { transactions, categories, loading } = useTransactions();
  
  const currentYear = taxYear || new Date().getFullYear();
  
  const aggregatedData = useMemo((): AggregatedTaxData => {
    const data: AggregatedTaxData = {
      salary: 0,
      freelance: 0,
      businessIncome: 0,
      rentalIncome: 0,
      investmentReturns: 0,
      otherIncome: 0,
      totalIncome: 0,
      pension: 0,
      nhf: 0,
      nhis: 0,
      lifeInsurance: 0,
      voluntaryPension: 0,
      rent: 0,
      totalDeductions: 0,
      taxYear: currentYear,
    };
    
    // Filter transactions by tax year
    const yearTransactions = transactions.filter(t => {
      const txYear = t.tax_year || new Date(t.transaction_date).getFullYear();
      return txYear === currentYear;
    });
    
    // Create category ID to name mapping
    const categoryIdToName = new Map(categories.map(c => [c.id, c.name]));
    
    // Aggregate amounts by category
    yearTransactions.forEach(t => {
      const categoryName = t.category_id ? categoryIdToName.get(t.category_id) : null;
      
      if (categoryName && CATEGORY_MAPPING[categoryName]) {
        const field = CATEGORY_MAPPING[categoryName];
        data[field] = (data[field] as number) + t.amount;
      } else {
        // Unmapped transactions go to "other"
        if (t.type === 'income') {
          data.otherIncome += t.amount;
        }
      }
    });
    
    // Calculate totals
    data.totalIncome = data.salary + data.freelance + data.businessIncome + 
                       data.rentalIncome + data.investmentReturns + data.otherIncome;
    data.totalDeductions = data.pension + data.nhf + data.nhis + 
                           data.lifeInsurance + data.voluntaryPension + data.rent;
    
    return data;
  }, [transactions, categories, currentYear]);
  
  return {
    data: aggregatedData,
    loading,
    hasData: aggregatedData.totalIncome > 0 || aggregatedData.totalDeductions > 0,
  };
}
