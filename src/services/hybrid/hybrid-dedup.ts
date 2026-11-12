import { Transaction, TransactionSource } from '@/types/finance';

export interface CandidateTransaction {
  id: string;
  amount: number; // in paise
  type: string;
  date: string; // ISO string
  title: string;
  notes?: string;
  referenceNo?: string;
  source?: TransactionSource;
  isDuplicate?: boolean;
  duplicateOfId?: string;
  duplicateReason?: string;
}

export interface DedupOptions {
  timeWindowHours?: number; // default 12 hours
}

/**
 * Normalizes title strings for fuzzy merchant comparison.
 */
function normalizeTitle(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Checks whether candidate merchant name resembles existing transaction title.
 */
function areTitlesSimilar(candidateTitle: string, existingTitle: string): boolean {
  const cNorm = normalizeTitle(candidateTitle);
  const eNorm = normalizeTitle(existingTitle);

  if (!cNorm || !eNorm) return false;
  if (cNorm === eNorm) return true;
  if (cNorm.includes(eNorm) || eNorm.includes(cNorm)) return true;

  // Check shared tokens (e.g. "Swiggy" in "Swiggy UPI", "Starbucks" in "Starbucks Coffee")
  const cTokens = cNorm.split(' ').filter((w) => w.length > 2);
  const eTokens = eNorm.split(' ').filter((w) => w.length > 2);
  return cTokens.some((t) => eTokens.includes(t));
}

/**
 * Unifies cross-source deduplication across SMS, Email receipts, Bank Statements, and Manual entries.
 */
export function deduplicateAgainstExisting<T extends CandidateTransaction>(
  candidates: T[],
  existing: Transaction[],
  options?: DedupOptions
): {
  unique: T[];
  duplicates: T[];
  duplicateMap: Map<string, Transaction>;
} {
  const windowHours = options?.timeWindowHours ?? 12;
  const windowMs = windowHours * 60 * 60 * 1000;

  const unique: T[] = [];
  const duplicates: T[] = [];
  const duplicateMap = new Map<string, Transaction>();

  for (const candidate of candidates) {
    const candidateTime = new Date(candidate.date).getTime();

    const matchedTx = existing.find((tx) => {
      // 1. Must match amount and direction (expense / income)
      if (tx.amount !== candidate.amount || tx.type !== candidate.type) {
        return false;
      }

      // 2. High confidence: exact reference / RRN / UPI ID match
      if (candidate.referenceNo) {
        const ref = candidate.referenceNo.toLowerCase();
        if (tx.rawReference && tx.rawReference.toLowerCase().includes(ref)) {
          return true;
        }
        if (tx.notes && tx.notes.toLowerCase().includes(ref)) {
          return true;
        }
      }

      // 3. Proximity window check (e.g. ±12 hours)
      const txTime = new Date(tx.date).getTime();
      const diffMs = Math.abs(candidateTime - txTime);
      const isWithinTimeWindow = diffMs <= windowMs;

      if (!isWithinTimeWindow) {
        return false;
      }

      // 4. Same calendar day match + title similarity
      if (areTitlesSimilar(candidate.title, tx.title)) {
        return true;
      }

      // 5. If within tight 2-hour window and same amount/type
      if (diffMs <= 2 * 60 * 60 * 1000) {
        return true;
      }

      return false;
    });

    if (matchedTx) {
      const dupeItem = {
        ...candidate,
        isDuplicate: true,
        duplicateOfId: matchedTx.id,
        duplicateReason: `Matches existing transaction "${matchedTx.title}" on ${new Date(matchedTx.date).toLocaleDateString()}`,
      };
      duplicates.push(dupeItem);
      duplicateMap.set(candidate.id, matchedTx);
    } else {
      unique.push({
        ...candidate,
        isDuplicate: false,
      });
    }
  }

  return { unique, duplicates, duplicateMap };
}
