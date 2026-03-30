import { useCallback } from 'react';
import type { Transaction } from '@/hooks/useTransactions';
import type { ParsedTransaction } from './types';

/**
 * Check if a parsed transaction is a potential duplicate of an existing one.
 * Match criteria: same amount AND date within ±1 day.
 */
export function useDuplicateDetection(existingTransactions: Transaction[]) {
  const detectDuplicates = useCallback(
    (parsed: ParsedTransaction[]): ParsedTransaction[] => {
      return parsed.map((tx) => {
        const txDate = new Date(tx.date);
        const match = existingTransactions.find((existing) => {
          if (Math.abs(existing.amount - tx.amount) > 0.01) return false;

          const existingDate = new Date(existing.transaction_date);
          const diffMs = Math.abs(txDate.getTime() - existingDate.getTime());
          const diffDays = diffMs / (1000 * 60 * 60 * 24);

          return diffDays <= 1;
        });

        return {
          ...tx,
          isDuplicate: !!match,
          duplicateOf: match
            ? `${match.description} (${match.transaction_date})`
            : undefined,
        };
      });
    },
    [existingTransactions]
  );

  return { detectDuplicates };
}
