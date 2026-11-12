import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';

import { useAuth } from './auth-context';
import { BudgetRepository } from '@/services/budget-repository';
import { TransactionRepository } from '@/services/transaction-repository';
import { Budget, BudgetPeriod, BudgetStatus, Transaction } from '@/types/finance';

interface FinanceContextType {
  transactions: Transaction[];
  isLoading: boolean;
  todaySpent: number;
  monthSpent: number;
  monthIncome: number;
  dailyBudget: Budget | null;
  monthlyBudget: Budget | null;
  dailyStatus: BudgetStatus;
  monthlyStatus: BudgetStatus;
  addTransaction: (
    data: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>
  ) => Promise<Transaction>;
  editTransaction: (id: string, updates: Partial<Transaction>) => Promise<Transaction>;
  removeTransaction: (id: string) => Promise<boolean>;
  saveBudget: (
    period: BudgetPeriod,
    amountInPaise: number,
    thresholds?: number[]
  ) => Promise<Budget>;
  refreshData: () => Promise<void>;
  resetAllData: () => Promise<void>;
}

const defaultStatus: BudgetStatus = {
  budget: 0,
  spent: 0,
  remaining: 0,
  percentage: 0,
  isExceeded: false,
  thresholdReached: null,
};

const FinanceContext = createContext<FinanceContextType | undefined>(undefined);

export function FinanceProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [todaySpent, setTodaySpent] = useState(0);
  const [monthSpent, setMonthSpent] = useState(0);
  const [monthIncome, setMonthIncome] = useState(0);

  const [dailyBudget, setDailyBudget] = useState<Budget | null>(null);
  const [monthlyBudget, setMonthlyBudget] = useState<Budget | null>(null);
  const [dailyStatus, setDailyStatus] = useState<BudgetStatus>(defaultStatus);
  const [monthlyStatus, setMonthlyStatus] = useState<BudgetStatus>(defaultStatus);

  const refreshData = useCallback(async () => {
    try {
      const now = new Date();
      const [txs, todayExp, monthTotals, budgets, dStatus, mStatus] = await Promise.all([
        TransactionRepository.getTransactions({ limit: 100 }),
        TransactionRepository.getDailySpending(now),
        TransactionRepository.getMonthSpending(now.getFullYear(), now.getMonth()),
        BudgetRepository.getBudgets(),
        BudgetRepository.getBudgetStatus('daily', now),
        BudgetRepository.getBudgetStatus('monthly', now),
      ]);

      setTransactions(txs);
      setTodaySpent(todayExp);
      setMonthSpent(monthTotals.totalExpense);
      setMonthIncome(monthTotals.totalIncome);
      setDailyBudget(budgets.daily);
      setMonthlyBudget(budgets.monthly);
      setDailyStatus(dStatus);
      setMonthlyStatus(mStatus);
    } catch (err) {
      console.error('Error refreshing finance data:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refreshData();
  }, [refreshData, user]);

  const addTransaction = useCallback(
    async (
      data: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>
    ): Promise<Transaction> => {
      const created = await TransactionRepository.createTransaction({
        ...data,
        userId: user?.id,
      });
      await refreshData();
      return created;
    },
    [user?.id, refreshData]
  );

  const editTransaction = useCallback(
    async (id: string, updates: Partial<Transaction>): Promise<Transaction> => {
      const updated = await TransactionRepository.updateTransaction(id, updates);
      await refreshData();
      return updated;
    },
    [refreshData]
  );

  const removeTransaction = useCallback(
    async (id: string): Promise<boolean> => {
      const removed = await TransactionRepository.deleteTransaction(id);
      await refreshData();
      return removed;
    },
    [refreshData]
  );

  const saveBudget = useCallback(
    async (
      period: BudgetPeriod,
      amountInPaise: number,
      thresholds: number[] = [50, 80, 100]
    ): Promise<Budget> => {
      const saved = await BudgetRepository.setBudget(period, amountInPaise, thresholds);
      await refreshData();
      return saved;
    },
    [refreshData]
  );

  const resetAllData = useCallback(async (): Promise<void> => {
    await Promise.all([
      TransactionRepository.clearAll(),
      BudgetRepository.clearAll(),
    ]);

    setTransactions([]);
    setTodaySpent(0);
    setMonthSpent(0);
    setMonthIncome(0);
    setDailyBudget(null);
    setMonthlyBudget(null);
    setDailyStatus(defaultStatus);
    setMonthlyStatus(defaultStatus);

    await refreshData();
  }, [refreshData]);

  const value = useMemo(
    () => ({
      transactions,
      isLoading,
      todaySpent,
      monthSpent,
      monthIncome,
      dailyBudget,
      monthlyBudget,
      dailyStatus,
      monthlyStatus,
      addTransaction,
      editTransaction,
      removeTransaction,
      saveBudget,
      refreshData,
      resetAllData,
    }),
    [
      transactions,
      isLoading,
      todaySpent,
      monthSpent,
      monthIncome,
      dailyBudget,
      monthlyBudget,
      dailyStatus,
      monthlyStatus,
      addTransaction,
      editTransaction,
      removeTransaction,
      saveBudget,
      refreshData,
      resetAllData,
    ]
  );

  return <FinanceContext.Provider value={value}>{children}</FinanceContext.Provider>;
}

export function useFinance() {
  const context = useContext(FinanceContext);
  if (!context) {
    throw new Error('useFinance must be used within a FinanceProvider');
  }
  return context;
}
