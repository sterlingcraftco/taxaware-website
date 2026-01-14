// Centralized tax calculation logic

export interface TaxBreakdown {
  band: string;
  rate: number;
  taxableInBand: number;
  taxInBand: number;
}

export interface IncomeSource {
  salary: number;
  freelance: number;
  business: number;
  benefitsInKind: number;
}

export interface Deductions {
  pension: number;
  nhf: number;
  nhis: number;
  lifeAssurance: number;
  mortgageInterest: number;
  rentRelief: number;
  totalDeductions: number;
}

export interface CompleteTaxResult {
  total: number;
  breakdown: TaxBreakdown[];
  grossIncome: number;
  totalIncome: IncomeSource;
  chargeableIncome: number;
  deductions: Deductions;
  monthlySavingsRecommended: number;
}

export const TAX_BANDS = [
  { threshold: 800000, rate: 0, label: "First ₦800,000" },
  { threshold: 2200000, rate: 0.15, label: "Next ₦2,200,000" },
  { threshold: 9000000, rate: 0.18, label: "Next ₦9,000,000" },
  { threshold: 13000000, rate: 0.21, label: "Next ₦13,000,000" },
  { threshold: 25000000, rate: 0.23, label: "Next ₦25,000,000" },
  { threshold: Infinity, rate: 0.25, label: "Above ₦50,000,000" },
];

export const formatCurrency = (amount: number): string => {
  return "₦" + new Intl.NumberFormat("en-NG", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

export const formatCurrencyPDF = (amount: number): string => {
  return "NGN " + new Intl.NumberFormat("en-NG", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

export const calculateCompleteTax = (
  income: IncomeSource,
  pensionContribution: number,
  nhfContribution: number,
  nhisContribution: number,
  lifeAssurance: number,
  mortgageInterest: number,
  annualRent: number
): CompleteTaxResult => {
  // Total gross income from all sources
  const grossIncome = income.salary + income.freelance + income.business + income.benefitsInKind;

  // Calculate rent relief (20% of annual rent, max ₦500,000)
  const rentRelief = Math.min(annualRent * 0.2, 500000);

  // Life assurance relief (capped at gross income * 0.1 or actual amount)
  const cappedLifeAssurance = Math.min(lifeAssurance, grossIncome * 0.1);

  // Mortgage interest relief (capped at certain limits based on property value - simplified to actual amount for now)
  const cappedMortgageInterest = mortgageInterest;

  // Total deductions
  const totalDeductions = pensionContribution + nhfContribution + nhisContribution +
    cappedLifeAssurance + cappedMortgageInterest + rentRelief;

  // Chargeable income after deductions
  const chargeableIncome = Math.max(0, grossIncome - totalDeductions);

  let remainingIncome = chargeableIncome;
  let totalTax = 0;
  const breakdown: TaxBreakdown[] = [];

  for (const band of TAX_BANDS) {
    if (remainingIncome <= 0) break;

    const taxableInBand = Math.min(remainingIncome, band.threshold);
    const taxInBand = taxableInBand * band.rate;

    breakdown.push({
      band: band.label,
      rate: band.rate * 100,
      taxableInBand,
      taxInBand,
    });

    totalTax += taxInBand;
    remainingIncome -= taxableInBand;
  }

  // Recommended monthly savings (tax / 12 + 10% buffer)
  const monthlySavingsRecommended = Math.ceil((totalTax * 1.1) / 12);

  return {
    total: totalTax,
    breakdown,
    grossIncome,
    totalIncome: income,
    chargeableIncome,
    deductions: {
      pension: pensionContribution,
      nhf: nhfContribution,
      nhis: nhisContribution,
      lifeAssurance: cappedLifeAssurance,
      mortgageInterest: cappedMortgageInterest,
      rentRelief,
      totalDeductions,
    },
    monthlySavingsRecommended,
  };
};

// Simple calculation for backward compatibility
export const calculateSimpleTax = (
  grossIncome: number,
  pensionContribution: number,
  nhfContribution: number,
  annualRent: number
): CompleteTaxResult => {
  return calculateCompleteTax(
    { salary: grossIncome, freelance: 0, business: 0, benefitsInKind: 0 },
    pensionContribution,
    nhfContribution,
    0,
    0,
    0,
    annualRent
  );
};
// Type guard to validate tax result data
export const isCompleteTaxResult = (data: any): data is CompleteTaxResult => {
  return (
    data &&
    typeof data.total === 'number' &&
    Array.isArray(data.breakdown) &&
    typeof data.grossIncome === 'number' &&
    typeof data.chargeableIncome === 'number' &&
    data.totalIncome &&
    typeof data.totalIncome.salary === 'number' &&
    data.deductions &&
    typeof data.deductions.totalDeductions === 'number'
  );
};

// Helper to migrate legacy/simple tax results to CompleteTaxResult
export const migrateToCompleteTaxResult = (data: any, fallbackGrossIncome: number): CompleteTaxResult => {
  if (isCompleteTaxResult(data)) {
    return data;
  }

  // Construct a default complete result from partial data
  const grossIncome = typeof data.grossIncome === 'number' ? data.grossIncome : fallbackGrossIncome;
  const total = typeof data.total === 'number' ? data.total : 0;

  // Try to extract known deductions or use defaults
  const pension = data.deductions?.pension || 0;
  const nhf = data.deductions?.nhf || 0;

  // For legacy "Simple" calculations, we might not have everything.
  // Reconstruct minimal valid object.
  return {
    total,
    breakdown: Array.isArray(data.breakdown) ? data.breakdown : [],
    grossIncome,
    totalIncome: {
      salary: grossIncome,
      freelance: 0,
      business: 0,
      benefitsInKind: 0
    },
    chargeableIncome: typeof data.chargeableIncome === 'number' ? data.chargeableIncome : (grossIncome - (pension + nhf)),
    deductions: {
      pension,
      nhf,
      nhis: data.deductions?.nhis || 0,
      lifeAssurance: data.deductions?.lifeAssurance || 0,
      mortgageInterest: data.deductions?.mortgageInterest || 0,
      rentRelief: data.deductions?.rentRelief || 0,
      totalDeductions: data.deductions?.totalDeductions || (pension + nhf)
    },
    monthlySavingsRecommended: data.monthlySavingsRecommended || Math.ceil((total * 1.1) / 12)
  };
};
