export type InputPeriod = "monthly" | "annual";

export interface IncomeFormData {
  salary: string;
  freelance: string;
  business: string;
  benefitsInKind: string;
}

export interface DeductionsFormData {
  // Pension
  hasPension: boolean;
  usePensionDefault: boolean;
  customPension: string;
  
  // NHF
  hasNhf: boolean;
  useNhfDefault: boolean;
  customNhf: string;
  
  // NHIS
  hasNhis: boolean;
  useNhisDefault: boolean;
  customNhis: string;
  
  // Life Assurance
  hasLifeAssurance: boolean;
  lifeAssurance: string;
  
  // Mortgage
  hasMortgage: boolean;
  mortgageInterest: string;
  
  // Rent - with separate period option
  paysRent: boolean;
  rent: string;
  rentPeriod: InputPeriod;
}

export interface CompleteCalculatorState {
  inputPeriod: InputPeriod;
  income: IncomeFormData;
  deductions: DeductionsFormData;
  currentStep: number;
}

export const CALCULATOR_STEPS = [
  { id: 1, title: "Income Sources", description: "Enter all your income" },
  { id: 2, title: "Statutory Deductions", description: "Pension, NHF, NHIS" },
  { id: 3, title: "Additional Reliefs", description: "Insurance, Mortgage, Rent" },
  { id: 4, title: "Review & Calculate", description: "View your results" },
];

export const initialIncomeData: IncomeFormData = {
  salary: "",
  freelance: "",
  business: "",
  benefitsInKind: "",
};

export const initialDeductionsData: DeductionsFormData = {
  hasPension: false,
  usePensionDefault: true,
  customPension: "",
  hasNhf: false,
  useNhfDefault: true,
  customNhf: "",
  hasNhis: false,
  useNhisDefault: true,
  customNhis: "",
  hasLifeAssurance: false,
  lifeAssurance: "",
  hasMortgage: false,
  mortgageInterest: "",
  paysRent: false,
  rent: "",
  rentPeriod: "annual",
};

// Helper to create pre-filled data from transaction aggregates
export interface TransactionTaxData {
  salary: number;
  freelance: number;
  businessIncome: number;
  pension: number;
  nhf: number;
  nhis: number;
  lifeInsurance: number;
  rent: number;
}

export function createIncomeFromTransactions(data: TransactionTaxData): IncomeFormData {
  return {
    salary: data.salary > 0 ? data.salary.toString() : "",
    freelance: data.freelance > 0 ? data.freelance.toString() : "",
    business: data.businessIncome > 0 ? data.businessIncome.toString() : "",
    benefitsInKind: "",
  };
}

export function createDeductionsFromTransactions(data: TransactionTaxData): DeductionsFormData {
  return {
    hasPension: data.pension > 0,
    usePensionDefault: false,
    customPension: data.pension > 0 ? data.pension.toString() : "",
    hasNhf: data.nhf > 0,
    useNhfDefault: false,
    customNhf: data.nhf > 0 ? data.nhf.toString() : "",
    hasNhis: data.nhis > 0,
    useNhisDefault: false,
    customNhis: data.nhis > 0 ? data.nhis.toString() : "",
    hasLifeAssurance: data.lifeInsurance > 0,
    lifeAssurance: data.lifeInsurance > 0 ? data.lifeInsurance.toString() : "",
    hasMortgage: false,
    mortgageInterest: "",
    paysRent: data.rent > 0,
    rent: data.rent > 0 ? data.rent.toString() : "",
    rentPeriod: "annual",
  };
}
