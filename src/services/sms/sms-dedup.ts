import { Transaction } from '@/types/finance';
import { ParsedSmsTransaction } from './types';
import { deduplicateAgainstExisting } from '@/services/hybrid/hybrid-dedup';

/**
 * Checks parsed SMS transactions against existing database transactions
 * using the unified hybrid deduplication engine.
 */
export function filterDuplicateTransactions(
  candidates: ParsedSmsTransaction[],
  existingTransactions: Transaction[]
): { unique: ParsedSmsTransaction[]; duplicates: ParsedSmsTransaction[] } {
  const result = deduplicateAgainstExisting(candidates, existingTransactions, {
    timeWindowHours: 12,
  });

  return {
    unique: result.unique,
    duplicates: result.duplicates,
  };
}
