// Pre-2026 PITA (Personal Income Tax Act) tax calculation logic
// This applies to tax years 2025 and earlier

import { CompleteTaxResult, TaxBreakdown, IncomeSource, Deductions } from './taxCalculations';

export const LEGACY_TAX_BANDS = [
  { threshold: 300000, rate: 0.07, label: "First ₦300,000" },
  { threshold: 300000, rate: 0.11, label: "Next ₦300,000" },
  { threshold: 500000, rate: 0.15, label: "Next ₦500,000" },
  { threshold: 500000, rate: 0.19, label: "Next ₦500,000" },
  { threshold: 1600000, rate: 0.21, label: "Next ₦1,600,000" },
  { threshold: Infinity, rate: 0.24, label: "Above ₦3,200,000" },
];

/**
 * Calculate Consolidated Relief Allowance (CRA) under PITA
 * CRA = Higher of (₦200,000 or 1% of gross income) + 20% of gross income
 */
export const calculateCRA = (grossIncome: number): number => {
  const fixedOrPercent = Math.max(200000, grossIncome * 0.01);
  const twentyPercent = grossIncome * 0.20;
  return fixedOrPercent + twentyPercent;
};

/**
 * Calculate tax under the legacy PITA system (pre-2026)
 * Key differences from NTA 2025:
 * - Consolidated Relief Allowance (CRA) applies automatically
 * - Different tax bands: 7%, 11%, 15%, 19%, 21%, 24%
 * - No tax-free threshold (CRA provides the relief instead)
 * - Minimum tax: 1% of gross income applies if tax calculated is less
 */
export const calculateLegacyTax = (
  income: IncomeSource,
  pensionContribution: number,
  nhfContribution: number,
  nhisContribution: number,
  lifeAssurance: number,
  mortgageInterest: number,
  annualRent: number
): CompleteTaxResult => {
  const grossIncome = income.salary + income.freelance + income.business + income.benefitsInKind;

  // CRA - Consolidated Relief Allowance
  const cra = calculateCRA(grossIncome);

  // Life assurance relief (capped at gross income * 0.1 or actual amount)
  const cappedLifeAssurance = Math.min(lifeAssurance, grossIncome * 0.1);

  // Mortgage interest relief
  const cappedMortgageInterest = mortgageInterest;

  // Total deductions (CRA replaces the NTA 2025 approach of per-item deductions for tax purposes)
  // Under PITA, pension and NHF are part of the CRA/relief calculation but we still track them
  const totalDeductions = cra + pensionContribution + nhfContribution + nhisContribution +
    cappedLifeAssurance + cappedMortgageInterest;

  // Chargeable income after deductions
  const chargeableIncome = Math.max(0, grossIncome - totalDeductions);

  let remainingIncome = chargeableIncome;
  let totalTax = 0;
  const breakdown: TaxBreakdown[] = [];

  for (const band of LEGACY_TAX_BANDS) {
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

  // Minimum tax rule under PITA: 1% of gross income
  const minimumTax = grossIncome * 0.01;
  if (totalTax < minimumTax && grossIncome > 0) {
    totalTax = minimumTax;
    // Clear breakdown and show minimum tax
    breakdown.length = 0;
    breakdown.push({
      band: "Minimum Tax (1% of Gross)",
      rate: 1,
      taxableInBand: grossIncome,
      taxInBand: minimumTax,
    });
  }

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
      rentRelief: 0, // No rent relief under PITA (handled via CRA)
      totalDeductions,
    },
    monthlySavingsRecommended,
    taxLaw: 'pita' as const,
    cra,
  };
};

/**
 * Simple legacy calculation for backward compatibility
 */
export const calculateSimpleLegacyTax = (
  grossIncome: number,
  pensionContribution: number,
  nhfContribution: number,
  annualRent: number
): CompleteTaxResult => {
  return calculateLegacyTax(
    { salary: grossIncome, freelance: 0, business: 0, benefitsInKind: 0 },
    pensionContribution,
    nhfContribution,
    0,
    0,
    0,
    annualRent
  );
};
