import { CandidateTransaction, deduplicateAgainstExisting } from '../hybrid-dedup';
import { Transaction } from '@/types/finance';

export function runHybridDedupTests() {
  const failures: string[] = [];
  let successes = 0;

  const baseExisting: Transaction = {
    id: 'tx-1',
    amount: 50000,
    type: 'expense',
    categoryId: 'food',
    date: '2026-11-12T10:00:00.000Z',
    title: 'Swiggy',
    source: 'sms',
    rawReference: 'UPI/4314241241/SWIGGY',
    createdAt: '2026-11-12T10:00:00.000Z',
    updatedAt: '2026-11-12T10:00:00.000Z',
  };

  // Test 1: Bidirectional reference matching (candidate has sub-string of rawReference)
  const candidate1: CandidateTransaction = {
    id: 'cand-1',
    amount: 50000,
    type: 'expense',
    date: '2026-11-12T10:05:00.000Z',
    title: 'Swiggy UPI',
    referenceNo: '4314241241',
  };
  const res1 = deduplicateAgainstExisting([candidate1], [baseExisting]);
  if (res1.duplicates.length !== 1 || !res1.duplicates[0].isDuplicate) {
    failures.push('Test 1 failed: Candidate referenceNo substring of tx.rawReference was not detected as duplicate.');
  } else {
    successes++;
  }

  // Test 2: Reverse bidirectional reference matching (tx.rawReference is substring of candidate.referenceNo)
  const existingShortRef: Transaction = {
    ...baseExisting,
    rawReference: '4314241241',
  };
  const candidate2: CandidateTransaction = {
    id: 'cand-2',
    amount: 50000,
    type: 'expense',
    date: '2026-11-12T10:05:00.000Z',
    title: 'Swiggy UPI',
    referenceNo: 'UPI/4314241241/SWIGGY',
  };
  const res2 = deduplicateAgainstExisting([candidate2], [existingShortRef]);
  if (res2.duplicates.length !== 1 || !res2.duplicates[0].isDuplicate) {
    failures.push('Test 2 failed: tx.rawReference substring of candidate.referenceNo was not detected as duplicate.');
  } else {
    successes++;
  }

  // Test 3: smsId matching against tx.rawReference when referenceNo is undefined
  const existingWithSmsId: Transaction = {
    ...baseExisting,
    rawReference: 'sms-cursor-98765',
  };
  const candidate3: CandidateTransaction = {
    id: 'cand-3',
    amount: 50000,
    type: 'expense',
    date: '2026-11-12T10:05:00.000Z',
    title: 'Swiggy',
    smsId: 'sms-cursor-98765',
    referenceNo: undefined,
  };
  const res3 = deduplicateAgainstExisting([candidate3], [existingWithSmsId]);
  if (res3.duplicates.length !== 1 || !res3.duplicates[0].isDuplicate) {
    failures.push('Test 3 failed: candidate.smsId matching tx.rawReference without referenceNo was not detected as duplicate.');
  } else {
    successes++;
  }

  // Test 4: candidate.id matching against tx.rawReference
  const existingWithCandId: Transaction = {
    ...baseExisting,
    rawReference: 'sync-hash-abc-123',
  };
  const candidate4: CandidateTransaction = {
    id: 'sync-hash-abc-123',
    amount: 50000,
    type: 'expense',
    date: '2026-11-12T10:05:00.000Z',
    title: 'Swiggy',
  };
  const res4 = deduplicateAgainstExisting([candidate4], [existingWithCandId]);
  if (res4.duplicates.length !== 1 || !res4.duplicates[0].isDuplicate) {
    failures.push('Test 4 failed: candidate.id matching tx.rawReference was not detected as duplicate.');
  } else {
    successes++;
  }

  // Test 5: Guard against false positives with short smsId
  const existingWithLongRef: Transaction = {
    ...baseExisting,
    rawReference: '431602819231',
  };
  const candidateShortId: CandidateTransaction = {
    id: 'cand-short',
    amount: 50000,
    type: 'expense',
    date: '2026-11-12T10:05:00.000Z',
    title: 'Other Merchant Differing',
    smsId: '1', // "1" is inside "431602819231"
  };
  // Use long time diff and different title so Rule 3, 4, 5 do not trigger
  const candidateShortIdFar: CandidateTransaction = {
    ...candidateShortId,
    date: '2026-11-15T10:05:00.000Z', // 3 days later
  };
  const res5 = deduplicateAgainstExisting([candidateShortIdFar], [existingWithLongRef], { timeWindowHours: 12 });
  if (res5.duplicates.length > 0) {
    failures.push('Test 5 failed: Short smsId "1" incorrectly substring-matched long reference "431602819231".');
  } else {
    successes++;
  }

  // Test 6: Rule 1 preservation: differing amount does not match even with identical reference
  const candidateDiffAmount: CandidateTransaction = {
    id: 'cand-diff-amt',
    amount: 99999, // Different amount
    type: 'expense',
    date: '2026-11-12T10:05:00.000Z',
    title: 'Swiggy',
    referenceNo: '4314241241',
  };
  const res6 = deduplicateAgainstExisting([candidateDiffAmount], [baseExisting]);
  if (res6.duplicates.length > 0) {
    failures.push('Test 6 failed: Candidate with differing amount was matched as duplicate.');
  } else {
    successes++;
  }

  return {
    passed: failures.length === 0,
    total: successes + failures.length,
    successes,
    failures,
  };
}

const res = runHybridDedupTests();
console.log(`Hybrid Dedup Rule 2 Tests: ${res.successes}/${res.total} passed.`);
if (!res.passed) {
  console.error('Failures:\n' + res.failures.join('\n'));
  process.exit(1);
} else {
  console.log('ALL HYBRID DEDUP RULE 2 TESTS PASSED PERFECTLY!');
}
