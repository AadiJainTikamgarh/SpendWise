import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import { Platform } from 'react-native';

import { getDatabase } from './db';
import { TransactionRepository } from './transaction-repository';
import { Budget, BudgetPeriod, BudgetStatus } from '@/types/finance';

const WEB_BUDGET_KEY = '@spendwise_budgets';

async function getWebBudgets(): Promise<Record<BudgetPeriod, Budget | null>> {
  try {
    if (Platform.OS === 'web' && typeof window === 'undefined') {
      return { daily: null, monthly: null };
    }
    const raw = await AsyncStorage.getItem(WEB_BUDGET_KEY);
    return raw ? JSON.parse(raw) : { daily: null, monthly: null };
  } catch {
    return { daily: null, monthly: null };
  }
}

async function saveWebBudgets(budgets: Record<BudgetPeriod, Budget | null>): Promise<void> {
  if (Platform.OS === 'web' && typeof window === 'undefined') {
    return;
  }
  await AsyncStorage.setItem(WEB_BUDGET_KEY, JSON.stringify(budgets));
}

interface RawBudgetRow {
  id: string;
  period: string;
  amount: number;
  thresholds: string;
  updated_at: string;
}

function mapRowToBudget(row: RawBudgetRow): Budget {
  let thresholds: number[] = [50, 80, 100];
  try {
    thresholds = JSON.parse(row.thresholds);
  } catch {
    // fallback
  }

  return {
    id: row.id,
    period: row.period as BudgetPeriod,
    amount: row.amount,
    thresholds,
    updatedAt: row.updated_at,
  };
}

export const BudgetRepository = {
  async getBudgets(): Promise<{ daily: Budget | null; monthly: Budget | null }> {
    const db = getDatabase();
    if (!db || Platform.OS === 'web') {
      return getWebBudgets();
    }

    const rows = await db.getAllAsync<RawBudgetRow>('SELECT * FROM budgets');
    const result: { daily: Budget | null; monthly: Budget | null } = {
      daily: null,
      monthly: null,
    };

    for (const row of rows) {
      if (row.period === 'daily') result.daily = mapRowToBudget(row);
      if (row.period === 'monthly') result.monthly = mapRowToBudget(row);
    }

    return result;
  },

  async setBudget(
    period: BudgetPeriod,
    amountInPaise: number,
    thresholds: number[] = [50, 80, 100]
  ): Promise<Budget> {
    const now = new Date().toISOString();
    const db = getDatabase();

    const budget: Budget = {
      id: Crypto.randomUUID(),
      period,
      amount: amountInPaise,
      thresholds,
      updatedAt: now,
    };

    if (!db || Platform.OS === 'web') {
      const all = await getWebBudgets();
      all[period] = budget;
      await saveWebBudgets(all);
      return budget;
    }

    await db.runAsync(
      `INSERT INTO budgets (id, period, amount, thresholds, updated_at)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(period) DO UPDATE SET
         amount = excluded.amount,
         thresholds = excluded.thresholds,
         updated_at = excluded.updated_at`,
      budget.id,
      budget.period,
      budget.amount,
      JSON.stringify(budget.thresholds),
      budget.updatedAt
    );

    return budget;
  },

  async getBudgetStatus(period: BudgetPeriod, asOfDate?: Date): Promise<BudgetStatus> {
    const date = asOfDate || new Date();
    const budgets = await this.getBudgets();
    const currentBudget = budgets[period];

    let spent = 0;
    if (period === 'daily') {
      spent = await TransactionRepository.getDailySpending(date);
    } else {
      const { totalExpense } = await TransactionRepository.getMonthSpending(
        date.getFullYear(),
        date.getMonth()
      );
      spent = totalExpense;
    }

    const budgetAmount = currentBudget?.amount || 0;
    const remaining = Math.max(0, budgetAmount - spent);
    const percentage = budgetAmount > 0 ? Math.round((spent / budgetAmount) * 100) : 0;
    const isExceeded = budgetAmount > 0 && spent > budgetAmount;

    let thresholdReached: number | null = null;
    const thresholds = currentBudget?.thresholds || [50, 80, 100];
    const sorted = [...thresholds].sort((a, b) => b - a);
    for (const t of sorted) {
      if (percentage >= t) {
        thresholdReached = t;
        break;
      }
    }

    return {
      budget: budgetAmount,
      spent,
      remaining,
      percentage,
      isExceeded,
      thresholdReached,
    };
  },

  async clearAll(): Promise<void> {
    const db = getDatabase();
    if (Platform.OS === 'web' || !db) {
      if (Platform.OS !== 'web' || typeof window !== 'undefined') {
        await AsyncStorage.removeItem(WEB_BUDGET_KEY);
      }
      return;
    }

    try {
      await db.execAsync('DELETE FROM budgets;');
    } catch (e) {
      console.warn('Error clearing SQLite budgets:', e);
    }
    try {
      await AsyncStorage.removeItem(WEB_BUDGET_KEY);
    } catch {
      // ignore
    }
  },
};
