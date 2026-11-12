import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import { Platform } from 'react-native';

import { getDatabase } from './db';
import { Transaction, TransactionType } from '@/types/finance';
import { getEndOfDay, getEndOfMonth, getStartOfDay, getStartOfMonth, parseDate } from '@/utils/date';

const WEB_STORAGE_KEY = '@spendwise_transactions';

async function getWebTransactions(): Promise<Transaction[]> {
  try {
    if (Platform.OS === 'web' && typeof window === 'undefined') {
      return [];
    }
    const raw = await AsyncStorage.getItem(WEB_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

async function saveWebTransactions(txs: Transaction[]): Promise<void> {
  if (Platform.OS === 'web' && typeof window === 'undefined') {
    return;
  }
  await AsyncStorage.setItem(WEB_STORAGE_KEY, JSON.stringify(txs));
}

interface RawTransactionRow {
  id: string;
  user_id: string | null;
  amount: number;
  type: string;
  category_id: string;
  date: string;
  title: string;
  notes: string | null;
  payment_method: string | null;
  source: string | null;
  raw_reference: string | null;
  created_at: string;
  updated_at: string;
}

function mapRowToTransaction(row: RawTransactionRow): Transaction {
  return {
    id: row.id,
    userId: row.user_id || undefined,
    amount: row.amount,
    type: row.type as TransactionType,
    categoryId: row.category_id,
    date: row.date,
    title: row.title,
    notes: row.notes || undefined,
    paymentMethod: row.payment_method || undefined,
    source: (row.source as any) || 'manual',
    rawReference: row.raw_reference || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const TransactionRepository = {
  async getTransactions(filter?: {
    startDate?: string;
    endDate?: string;
    categoryId?: string;
    type?: TransactionType | 'all';
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<Transaction[]> {
    const db = getDatabase();

    if (!db || Platform.OS === 'web') {
      let list = await getWebTransactions();

      if (filter?.startDate) {
        list = list.filter((t) => t.date >= filter.startDate!);
      }
      if (filter?.endDate) {
        list = list.filter((t) => t.date <= filter.endDate!);
      }
      if (filter?.categoryId && filter.categoryId !== 'all') {
        list = list.filter((t) => t.categoryId === filter.categoryId);
      }
      if (filter?.type && filter.type !== 'all') {
        list = list.filter((t) => t.type === filter.type);
      }
      if (filter?.search) {
        const query = filter.search.toLowerCase();
        list = list.filter(
          (t) =>
            t.title.toLowerCase().includes(query) ||
            (t.notes && t.notes.toLowerCase().includes(query))
        );
      }

      list.sort((a, b) => (b.date > a.date ? 1 : -1));

      if (filter?.offset) {
        list = list.slice(filter.offset);
      }
      if (filter?.limit) {
        list = list.slice(0, filter.limit);
      }

      return list;
    }

    const conditions: string[] = [];
    const params: (string | number)[] = [];

    if (filter?.startDate) {
      conditions.push('date >= ?');
      params.push(filter.startDate);
    }
    if (filter?.endDate) {
      conditions.push('date <= ?');
      params.push(filter.endDate);
    }
    if (filter?.categoryId && filter.categoryId !== 'all') {
      conditions.push('category_id = ?');
      params.push(filter.categoryId);
    }
    if (filter?.type && filter.type !== 'all') {
      conditions.push('type = ?');
      params.push(filter.type);
    }
    if (filter?.search) {
      conditions.push('(LOWER(title) LIKE ? OR LOWER(notes) LIKE ?)');
      const term = `%${filter.search.toLowerCase()}%`;
      params.push(term, term);
    }

    let query = 'SELECT * FROM transactions';
    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }
    query += ' ORDER BY date DESC';

    if (filter?.limit) {
      query += ' LIMIT ?';
      params.push(filter.limit);
      if (filter?.offset) {
        query += ' OFFSET ?';
        params.push(filter.offset);
      }
    }

    const rows = await db.getAllAsync<RawTransactionRow>(query, ...params);
    return rows.map(mapRowToTransaction);
  },

  async getTransactionById(id: string): Promise<Transaction | null> {
    const db = getDatabase();
    if (!db || Platform.OS === 'web') {
      const list = await getWebTransactions();
      return list.find((t) => t.id === id) || null;
    }

    const row = await db.getFirstAsync<RawTransactionRow>(
      'SELECT * FROM transactions WHERE id = ?',
      id
    );
    return row ? mapRowToTransaction(row) : null;
  },

  async createTransaction(
    data: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<Transaction> {
    const now = new Date().toISOString();
    const newTx: Transaction = {
      ...data,
      id: Crypto.randomUUID(),
      createdAt: now,
      updatedAt: now,
    };

    const db = getDatabase();
    if (!db || Platform.OS === 'web') {
      const list = await getWebTransactions();
      if (newTx.rawReference) {
        const existing = list.find(
          (t) => t.rawReference && t.rawReference.toLowerCase() === newTx.rawReference!.toLowerCase()
        );
        if (existing) {
          return existing;
        }
      }
      list.unshift(newTx);
      await saveWebTransactions(list);
      return newTx;
    }

    try {
      await db.runAsync(
        `INSERT INTO transactions (id, user_id, amount, type, category_id, date, title, notes, payment_method, source, raw_reference, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        newTx.id,
        newTx.userId || null,
        newTx.amount,
        newTx.type,
        newTx.categoryId,
        newTx.date,
        newTx.title,
        newTx.notes || null,
        newTx.paymentMethod || null,
        newTx.source || 'manual',
        newTx.rawReference || null,
        newTx.createdAt,
        newTx.updatedAt
      );

      return newTx;
    } catch (error: any) {
      const errorMsg = String(error?.message || error || '');
      const isConstraintCollision =
        errorMsg.includes('UNIQUE constraint failed') ||
        errorMsg.includes('constraint failed') ||
        errorMsg.includes('SQLITE_CONSTRAINT');

      if (isConstraintCollision && newTx.rawReference) {
        const existingRow = await db.getFirstAsync<RawTransactionRow>(
          'SELECT * FROM transactions WHERE raw_reference = ? LIMIT 1',
          newTx.rawReference
        );
        if (existingRow) {
          return mapRowToTransaction(existingRow);
        }
      }

      throw error;
    }
  },

  async updateTransaction(id: string, updates: Partial<Transaction>): Promise<Transaction> {
    const existing = await this.getTransactionById(id);
    if (!existing) {
      throw new Error(`Transaction with id ${id} not found.`);
    }

    const updated: Transaction = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    const db = getDatabase();
    if (!db || Platform.OS === 'web') {
      const list = await getWebTransactions();
      const index = list.findIndex((t) => t.id === id);
      if (index !== -1) {
        list[index] = updated;
        await saveWebTransactions(list);
      }
      return updated;
    }

    await db.runAsync(
      `UPDATE transactions SET
         amount = ?,
         type = ?,
         category_id = ?,
         date = ?,
         title = ?,
         notes = ?,
         payment_method = ?,
         source = ?,
         raw_reference = ?,
         updated_at = ?
       WHERE id = ?`,
      updated.amount,
      updated.type,
      updated.categoryId,
      updated.date,
      updated.title,
      updated.notes || null,
      updated.paymentMethod || null,
      updated.source || 'manual',
      updated.rawReference || null,
      updated.updatedAt,
      id
    );

    return updated;
  },

  async deleteTransaction(id: string): Promise<boolean> {
    const db = getDatabase();
    if (!db || Platform.OS === 'web') {
      const list = await getWebTransactions();
      const filtered = list.filter((t) => t.id !== id);
      await saveWebTransactions(filtered);
      return true;
    }

    const res = await db.runAsync('DELETE FROM transactions WHERE id = ?', id);
    return res.changes > 0;
  },

  async getDailySpending(dateInput?: Date | string): Promise<number> {
    const start = getStartOfDay(dateInput);
    const end = getEndOfDay(dateInput);

    const db = getDatabase();
    if (!db || Platform.OS === 'web') {
      const list = await getWebTransactions();
      return list
        .filter((t) => t.type === 'expense' && t.date >= start && t.date <= end)
        .reduce((sum, t) => sum + t.amount, 0);
    }

    const result = await db.getFirstAsync<{ total: number | null }>(
      `SELECT SUM(amount) as total FROM transactions WHERE type = 'expense' AND date >= ? AND date <= ?`,
      start,
      end
    );
    return result?.total || 0;
  },

  async getMonthSpending(
    year: number,
    month: number
  ): Promise<{ totalExpense: number; totalIncome: number }> {
    const targetDate = new Date(year, month, 1);
    const start = getStartOfMonth(targetDate);
    const end = getEndOfMonth(targetDate);

    const db = getDatabase();
    if (!db || Platform.OS === 'web') {
      const list = await getWebTransactions();
      const inMonth = list.filter((t) => t.date >= start && t.date <= end);
      const totalExpense = inMonth
        .filter((t) => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);
      const totalIncome = inMonth
        .filter((t) => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0);
      return { totalExpense, totalIncome };
    }

    const expResult = await db.getFirstAsync<{ total: number | null }>(
      `SELECT SUM(amount) as total FROM transactions WHERE type = 'expense' AND date >= ? AND date <= ?`,
      start,
      end
    );
    const incResult = await db.getFirstAsync<{ total: number | null }>(
      `SELECT SUM(amount) as total FROM transactions WHERE type = 'income' AND date >= ? AND date <= ?`,
      start,
      end
    );

    return {
      totalExpense: expResult?.total || 0,
      totalIncome: incResult?.total || 0,
    };
  },

  async getDailyAggregatesForMonth(
    year: number,
    month: number
  ): Promise<Record<string, { expense: number; income: number }>> {
    const targetDate = new Date(year, month, 1);
    const start = getStartOfMonth(targetDate);
    const end = getEndOfMonth(targetDate);

    const txs = await this.getTransactions({ startDate: start, endDate: end });

    const aggregates: Record<string, { expense: number; income: number }> = {};

    for (const tx of txs) {
      const date = parseDate(tx.date);
      const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      if (!aggregates[dateKey]) {
        aggregates[dateKey] = { expense: 0, income: 0 };
      }
      if (tx.type === 'expense') {
        aggregates[dateKey].expense += tx.amount;
      } else if (tx.type === 'income') {
        aggregates[dateKey].income += tx.amount;
      }
    }

    return aggregates;
  },

  async clearAll(): Promise<void> {
    const db = getDatabase();
    if (Platform.OS === 'web' || !db) {
      if (Platform.OS !== 'web' || typeof window !== 'undefined') {
        await AsyncStorage.removeItem(WEB_STORAGE_KEY);
      }
      return;
    }

    try {
      await db.execAsync('DELETE FROM transactions;');
    } catch (e) {
      console.warn('Error clearing SQLite transactions:', e);
    }
    try {
      await AsyncStorage.removeItem(WEB_STORAGE_KEY);
    } catch {
      // ignore
    }
  },
};
