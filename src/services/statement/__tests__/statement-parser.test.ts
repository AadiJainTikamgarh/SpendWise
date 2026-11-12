import { deduplicateAgainstExisting } from '@/services/hybrid/hybrid-dedup';
import {
  parseCsvStatement,
  parseEmailReceipt,
} from '../statement-parser';
import { Transaction } from '@/types/finance';

export function runStatementTests() {
  const failures: string[] = [];
  let successes = 0;

  // 1. Test Email Receipt - Swiggy
  const swiggyReceipt = `Swiggy Order Receipt
Order #18392019
Date: 10 Nov 2026
Restaurant: Burger King
Order Total: ₹340.00
Paid via Credit Card`;

  const parsedSwiggy = parseEmailReceipt(swiggyReceipt);
  if (!parsedSwiggy) {
    failures.push('Failed to parse Swiggy email receipt');
  } else if (parsedSwiggy.amount !== 34000) {
    failures.push(`Swiggy amount mismatch: expected 34000 paise, got ${parsedSwiggy.amount}`);
  } else if (parsedSwiggy.categoryId !== 'food') {
    failures.push(`Swiggy category mismatch: expected food, got ${parsedSwiggy.categoryId}`);
  } else {
    successes++;
  }

  // 2. Test Email Receipt - Uber
  const uberReceipt = `Your Uber Trip Receipt
Date: 09 Nov 2026
Trip Fare: ₹245.50
Trip ID: ub-92847291`;

  const parsedUber = parseEmailReceipt(uberReceipt);
  if (!parsedUber) {
    failures.push('Failed to parse Uber email receipt');
  } else if (parsedUber.amount !== 24550) {
    failures.push(`Uber amount mismatch: expected 24550 paise, got ${parsedUber.amount}`);
  } else if (parsedUber.categoryId !== 'transport') {
    failures.push(`Uber category mismatch: expected transport, got ${parsedUber.categoryId}`);
  } else {
    successes++;
  }

  // 3. Test Bank CSV Parser
  const bankCsv = `Date,Narration,Debit,Credit,Ref No
09/11/2026,"UPI/4314241/SWIGGY, BANGALORE",450.00,,4314241241
08/11/2026,POS 9284 STARBUCKS,"1,250.00",,928472194
01/11/2026,ACH/SALARY/TECHCORP,,85000.00,SAL928412`;

  const csvRows = parseCsvStatement(bankCsv);
  if (csvRows.length !== 3) {
    failures.push(`CSV parsing row count mismatch: expected 3, got ${csvRows.length}`);
  } else {
    // Check row 1 (Expense ₹450 with quoted narration containing comma)
    if (csvRows[0].amount !== 45000 || csvRows[0].type !== 'expense') {
      failures.push(`CSV Row 1 mismatch: ${JSON.stringify(csvRows[0])}`);
    } else {
      successes++;
    }

    // Check row 2 (Expense ₹1,250 with quoted amount containing comma)
    if (csvRows[1].amount !== 125000 || csvRows[1].type !== 'expense') {
      failures.push(`CSV Row 2 mismatch: expected 125000, got ${csvRows[1].amount}`);
    } else {
      successes++;
    }

    // Check row 3 (Salary Income ₹85,000)
    if (csvRows[2].amount !== 8500000 || csvRows[2].type !== 'income') {
      failures.push(`CSV Row 3 mismatch: ${JSON.stringify(csvRows[2])}`);
    } else {
      successes++;
    }
  }

  // 4. Test Cross-Source Hybrid Deduplication
  const existingTxs: Transaction[] = [
    {
      id: 'existing-swiggy',
      amount: 45000, // ₹450
      type: 'expense',
      categoryId: 'food',
      date: '2026-11-09T14:30:00.000Z',
      title: 'Swiggy',
      source: 'manual',
      rawReference: '4314241241',
      createdAt: '2026-11-09T14:30:00.000Z',
      updatedAt: '2026-11-09T14:30:00.000Z',
    },
  ];

  const incomingCandidate = {
    id: 'incoming-bank-statement',
    amount: 45000,
    type: 'expense' as const,
    date: '2026-11-09T14:35:00.000Z',
    title: 'Swiggy HDFC UPI',
    referenceNo: '4314241241',
    source: 'statement' as const,
    categoryId: 'food',
    rawLine: '...',
  };

  const incomingUnique = {
    id: 'incoming-unique-grocery',
    amount: 120000,
    type: 'expense' as const,
    date: '2026-11-09T18:00:00.000Z',
    title: 'Nature Basket',
    source: 'statement' as const,
    categoryId: 'groceries',
    rawLine: '...',
  };

  const dedupResult = deduplicateAgainstExisting(
    [incomingCandidate, incomingUnique],
    existingTxs,
    { timeWindowHours: 12 }
  );

  if (dedupResult.duplicates.length !== 1) {
    failures.push(`Deduplication duplicate count mismatch: expected 1, got ${dedupResult.duplicates.length}`);
  } else if (dedupResult.duplicates[0].id !== 'incoming-bank-statement') {
    failures.push(`Deduplication detected wrong duplicate: ${dedupResult.duplicates[0].id}`);
  } else {
    successes++;
  }

  if (dedupResult.unique.length !== 1 || dedupResult.unique[0].id !== 'incoming-unique-grocery') {
    failures.push(`Deduplication unique count mismatch: ${JSON.stringify(dedupResult.unique)}`);
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

const res = runStatementTests();
console.log(`Statement & Hybrid Dedup Tests: ${res.successes}/${res.total} passed.`);
if (!res.passed) {
  console.error('Failures:\n' + res.failures.join('\n'));
  process.exit(1);
} else {
  console.log('ALL STATEMENT & HYBRID DEDUP TESTS PASSED!');
}
