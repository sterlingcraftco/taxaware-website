export interface ParsedTransaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
  balance: number | null;
  category_id: string | null;
  included: boolean;
  isDuplicate: boolean;
  duplicateOf?: string; // description of matching existing transaction
}

export interface AccountInfo {
  bank_name: string | null;
  account_number: string | null;
  account_name: string | null;
  currency: string | null;
  period_start?: string | null;
  period_end?: string | null;
}

export interface ImportSource {
  type: 'csv' | 'excel' | 'pdf' | 'mono';
  fileName?: string;
}
