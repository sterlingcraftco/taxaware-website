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
  
  // Rent
  paysRent: boolean;
  rent: string;
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
};
