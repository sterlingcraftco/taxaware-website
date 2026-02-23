import { TAX_BANDS } from './taxCalculations';

export interface PayslipData {
  // Employee/Employer
  employeeName: string;
  employeeId: string;
  department: string;
  jobTitle: string;
  companyName: string;
  payPeriodMonth: number;
  payPeriodYear: number;
  taxYear: number;

  // Earnings
  basicSalary: number;
  housingAllowance: number;
  transportAllowance: number;
  utilityAllowance: number;
  mealAllowance: number;
  leaveAllowance: number;
  overtime: number;
  otherAllowances: number;

  // Deductions (overridable)
  payeTax: number;
  pensionEmployee: number;
  pensionEmployer: number;
  nhf: number;
  nhis: number;
  loanRepayment: number;
  otherDeductions: number;

  notes: string;
}

export const getDefaultPayslipData = (): PayslipData => {
  const now = new Date();
  return {
    employeeName: '',
    employeeId: '',
    department: '',
    jobTitle: '',
    companyName: '',
    payPeriodMonth: now.getMonth() + 1,
    payPeriodYear: now.getFullYear(),
    taxYear: now.getFullYear(),
    basicSalary: 0,
    housingAllowance: 0,
    transportAllowance: 0,
    utilityAllowance: 0,
    mealAllowance: 0,
    leaveAllowance: 0,
    overtime: 0,
    otherAllowances: 0,
    payeTax: 0,
    pensionEmployee: 0,
    pensionEmployer: 0,
    nhf: 0,
    nhis: 0,
    loanRepayment: 0,
    otherDeductions: 0,
    notes: '',
  };
};

export const calculateGrossPay = (data: PayslipData): number => {
  return (
    data.basicSalary +
    data.housingAllowance +
    data.transportAllowance +
    data.utilityAllowance +
    data.mealAllowance +
    data.leaveAllowance +
    data.overtime +
    data.otherAllowances
  );
};

export const calculateTotalDeductions = (data: PayslipData): number => {
  return (
    data.payeTax +
    data.pensionEmployee +
    data.nhf +
    data.nhis +
    data.loanRepayment +
    data.otherDeductions
  );
};

export const calculateNetPay = (data: PayslipData): number => {
  return calculateGrossPay(data) - calculateTotalDeductions(data);
};

/**
 * Auto-calculate statutory deductions from monthly gross salary.
 * - Pension (Employee): 8% of basic + housing + transport
 * - Pension (Employer): 10% of basic + housing + transport
 * - NHF: 2.5% of basic salary
 * - NHIS: 5% of basic salary (employee share)
 * - PAYE: Monthly PAYE based on annualized income through NTA 2025 bands
 */
export const autoCalculateDeductions = (data: PayslipData): Partial<PayslipData> => {
  const pensionBase = data.basicSalary + data.housingAllowance + data.transportAllowance;
  const pensionEmployee = Math.round(pensionBase * 0.08);
  const pensionEmployer = Math.round(pensionBase * 0.10);
  const nhf = Math.round(data.basicSalary * 0.025);
  const nhis = Math.round(data.basicSalary * 0.05);

  // Calculate monthly PAYE
  const monthlyGross = calculateGrossPay({ ...data });
  const annualGross = monthlyGross * 12;
  const annualPension = pensionEmployee * 12;
  const annualNhf = nhf * 12;
  const annualNhis = nhis * 12;
  const totalAnnualDeductions = annualPension + annualNhf + annualNhis;
  const chargeableIncome = Math.max(0, annualGross - totalAnnualDeductions);

  let remainingIncome = chargeableIncome;
  let annualTax = 0;
  for (const band of TAX_BANDS) {
    if (remainingIncome <= 0) break;
    const taxableInBand = Math.min(remainingIncome, band.threshold);
    annualTax += taxableInBand * band.rate;
    remainingIncome -= taxableInBand;
  }

  const monthlyPaye = Math.round(annualTax / 12);

  return {
    pensionEmployee,
    pensionEmployer,
    nhf,
    nhis,
    payeTax: monthlyPaye,
  };
};

export const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
