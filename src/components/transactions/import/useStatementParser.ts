import { useCallback } from 'react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { supabase } from '@/integrations/supabase/client';
import type { ParsedTransaction, AccountInfo } from './types';

function generateId() {
  return Math.random().toString(36).substring(2, 15);
}

function parseDate(raw: string): string {
  if (!raw) return new Date().toISOString().split('T')[0];

  // Try common date formats
  const trimmed = raw.trim();

  // Already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;

  // DD/MM/YYYY or DD-MM-YYYY
  const dmyMatch = trimmed.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/);
  if (dmyMatch) {
    const [, d, m, y] = dmyMatch;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  // MM/DD/YYYY
  const mdyMatch = trimmed.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/);
  if (mdyMatch) {
    // Ambiguous — assume DD/MM/YYYY for Nigerian banks
    const [, d, m, y] = mdyMatch;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  // Try native Date parsing
  const parsed = new Date(trimmed);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().split('T')[0];
  }

  return new Date().toISOString().split('T')[0];
}

function inferType(row: Record<string, string>, amount: number): 'income' | 'expense' {
  // Check for credit/debit columns
  const keys = Object.keys(row).map((k) => k.toLowerCase());
  const creditKey = keys.find((k) => k.includes('credit') || k.includes('cr'));
  const debitKey = keys.find((k) => k.includes('debit') || k.includes('dr'));

  if (creditKey && debitKey) {
    const creditVal = parseFloat(String(row[Object.keys(row)[keys.indexOf(creditKey)]]).replace(/[,\s]/g, ''));
    if (!isNaN(creditVal) && creditVal > 0) return 'income';
    return 'expense';
  }

  // Check description keywords
  const desc = Object.values(row).join(' ').toLowerCase();
  if (desc.includes('salary') || desc.includes('credit') || desc.includes('deposit') || desc.includes('transfer from')) {
    return 'income';
  }

  return amount < 0 ? 'income' : 'expense'; // Negative in bank statements often means credit
}

function parseNumeric(val: string | number): number {
  if (typeof val === 'number') return Math.abs(val);
  const cleaned = String(val).replace(/[^0-9.\-]/g, '');
  return Math.abs(parseFloat(cleaned)) || 0;
}

function rowsToTransactions(rows: Record<string, string>[]): ParsedTransaction[] {
  if (rows.length === 0) return [];

  const keys = Object.keys(rows[0]);
  const lowerKeys = keys.map((k) => k.toLowerCase());

  // Find column mappings
  const dateCol = keys[lowerKeys.findIndex((k) => k.includes('date') || k.includes('trans') || k.includes('value'))];
  const descCol = keys[lowerKeys.findIndex((k) => k.includes('desc') || k.includes('narration') || k.includes('particular') || k.includes('remark') || k.includes('detail'))];
  const amountCol = keys[lowerKeys.findIndex((k) => k.includes('amount') && !k.includes('balance'))];
  const creditCol = keys[lowerKeys.findIndex((k) => k.includes('credit') || k === 'cr')];
  const debitCol = keys[lowerKeys.findIndex((k) => k.includes('debit') || k === 'dr')];
  const balanceCol = keys[lowerKeys.findIndex((k) => k.includes('balance') || k.includes('bal'))];

  return rows
    .filter((row) => {
      // Filter out empty/header rows
      const vals = Object.values(row).filter(Boolean);
      return vals.length >= 2;
    })
    .map((row) => {
      let amount = 0;
      let type: 'income' | 'expense' = 'expense';

      if (creditCol && debitCol) {
        const credit = parseNumeric(row[creditCol]);
        const debit = parseNumeric(row[debitCol]);
        if (credit > 0) {
          amount = credit;
          type = 'income';
        } else {
          amount = debit;
          type = 'expense';
        }
      } else if (amountCol) {
        amount = parseNumeric(row[amountCol]);
        type = inferType(row, parseFloat(String(row[amountCol]).replace(/[,\s]/g, '')));
      }

      const balance = balanceCol ? parseNumeric(row[balanceCol]) || null : null;

      return {
        id: generateId(),
        date: parseDate(row[dateCol] || ''),
        description: (row[descCol] || 'Unknown transaction').trim(),
        amount,
        type,
        balance,
        category_id: null,
        included: true,
        isDuplicate: false,
      };
    })
    .filter((tx) => tx.amount > 0);
}

export function useStatementParser() {
  const parseCSV = useCallback((file: File): Promise<{ transactions: ParsedTransaction[]; accountInfo: AccountInfo | null }> => {
    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          try {
            const transactions = rowsToTransactions(results.data as Record<string, string>[]);
            resolve({ transactions, accountInfo: null });
          } catch (err) {
            reject(err);
          }
        },
        error: (err) => reject(err),
      });
    });
  }, []);

  const parseExcel = useCallback((file: File): Promise<{ transactions: ParsedTransaction[]; accountInfo: AccountInfo | null }> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          const rows = XLSX.utils.sheet_to_json<Record<string, string>>(firstSheet, { raw: false });
          const transactions = rowsToTransactions(rows);
          resolve({ transactions, accountInfo: null });
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsArrayBuffer(file);
    });
  }, []);

  const parsePDF = useCallback(async (file: File): Promise<{ transactions: ParsedTransaction[]; accountInfo: AccountInfo | null }> => {
    const formData = new FormData();
    formData.append('file', file);

    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/parse-statement-pdf`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({ error: 'Failed to parse PDF' }));
      throw new Error(err.error || 'Failed to parse PDF');
    }

    const result = await response.json();

    const transactions: ParsedTransaction[] = (result.transactions || []).map((tx: any) => ({
      id: generateId(),
      date: tx.date || new Date().toISOString().split('T')[0],
      description: tx.description || 'Unknown',
      amount: Math.abs(tx.amount || 0),
      type: tx.type === 'income' ? 'income' : 'expense',
      balance: tx.balance || null,
      category_id: null,
      included: true,
      isDuplicate: false,
    }));

    return {
      transactions,
      accountInfo: result.account_info || null,
    };
  }, []);

  const parseFile = useCallback(async (file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase();

    if (ext === 'csv') return parseCSV(file);
    if (ext === 'xlsx' || ext === 'xls') return parseExcel(file);
    if (ext === 'pdf') return parsePDF(file);

    throw new Error(`Unsupported file type: .${ext}`);
  }, [parseCSV, parseExcel, parsePDF]);

  return { parseFile, parseCSV, parseExcel, parsePDF };
}
