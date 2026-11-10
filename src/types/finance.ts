export type TransactionType = 'expense' | 'income' | 'transfer' | 'refund';

export interface Transaction {
  id: string;
  userId?: string;
  amount: number; // Integer paise (e.g. ₹150.50 -> 15050)
  type: TransactionType;
  categoryId: string;
  date: string; // ISO 8601 string
  title: string;
  notes?: string;
  paymentMethod?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  type: 'expense' | 'income';
}

export type BudgetPeriod = 'daily' | 'monthly';

export interface Budget {
  id: string;
  period: BudgetPeriod;
  amount: number; // Integer paise
  thresholds: number[]; // e.g. [50, 80, 100]
  updatedAt: string;
}

export interface BudgetStatus {
  budget: number; // paise
  spent: number; // paise
  remaining: number; // paise
  percentage: number; // 0 - 100+
  isExceeded: boolean;
  thresholdReached: number | null;
}
