import { generateCSV, generateJSONBackup } from '../export-service';
import { Transaction } from '@/types/finance';

const mockTransactions: Transaction[] = [
  {
    id: 'tx-1',
    amount: 25000, // ₹250.00
    type: 'expense',
    categoryId: 'food',
    date: '2026-11-10T14:30:00.000Z',
    title: 'Swiggy Burger King',
    notes: 'Dinner with team, order #1234',
    paymentMethod: 'UPI / Online',
    source: 'statement',
    rawReference: 'UPI-REF-9988',
    createdAt: '2026-11-10T14:30:00.000Z',
    updatedAt: '2026-11-10T14:30:00.000Z',
  },
  {
    id: 'tx-2',
    amount: 5000000, // ₹50,000.00
    type: 'income',
    categoryId: 'salary',
    date: '2026-11-01T09:00:00.000Z',
    title: 'Monthly Salary',
    paymentMethod: 'Bank Transfer',
    source: 'sms',
    createdAt: '2026-11-01T09:00:00.000Z',
    updatedAt: '2026-11-01T09:00:00.000Z',
  },
];

export function runExportTests(): { passed: boolean; message: string } {
  const csv = generateCSV(mockTransactions);
  if (!csv.includes('Date,Time,Title,Type,Category,Amount (INR),Payment Method,Source,Notes,Reference ID')) {
    return { passed: false, message: 'CSV header mismatch' };
  }
  if (!csv.includes('Swiggy Burger King') || !csv.includes('250.00')) {
    return { passed: false, message: 'CSV content missing tx-1 values' };
  }
  if (!csv.includes('"Dinner with team, order #1234"')) {
    return { passed: false, message: 'CSV escaping failed for commas' };
  }

  const jsonStr = generateJSONBackup(mockTransactions, {
    daily: null,
    monthly: {
      id: 'b-1',
      period: 'monthly',
      amount: 3000000,
      thresholds: [50, 80, 100],
      updatedAt: '2026-11-01T00:00:00.000Z',
    },
  });

  const parsed = JSON.parse(jsonStr);
  if (parsed.appName !== 'SpendWise' || parsed.transactionCount !== 2) {
    return { passed: false, message: 'JSON backup metadata mismatch' };
  }
  if (parsed.budgets?.monthly?.amount !== 3000000) {
    return { passed: false, message: 'JSON backup budget mismatch' };
  }

  return { passed: true, message: 'All export tests passed successfully (CSV & JSON)' };
}

const result = runExportTests();
console.log(result.message);
if (!result.passed) {
  process.exit(1);
}
