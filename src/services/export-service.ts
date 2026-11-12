import { Alert, Share } from 'react-native';

import { getCategoryById } from '@/constants/categories';
import { Budget, Transaction } from '@/types/finance';
import { paiseToRupees } from '@/utils/money';

function escapeCSV(val: string | number | undefined | null): string {
  if (val === undefined || val === null) return '';
  const str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function generateCSV(transactions: Transaction[]): string {
  const headers = [
    'Date',
    'Time',
    'Title',
    'Type',
    'Category',
    'Amount (INR)',
    'Payment Method',
    'Source',
    'Notes',
    'Reference ID',
  ];

  const rows = transactions.map((tx) => {
    const d = new Date(tx.date);
    const dateStr = !isNaN(d.getTime()) ? d.toISOString().split('T')[0] : tx.date;
    const timeStr = !isNaN(d.getTime()) ? d.toTimeString().split(' ')[0] : '';
    const cat = getCategoryById(tx.categoryId);
    const amountRupees = paiseToRupees(tx.amount).toFixed(2);

    return [
      escapeCSV(dateStr),
      escapeCSV(timeStr),
      escapeCSV(tx.title),
      escapeCSV(tx.type),
      escapeCSV(cat?.name || tx.categoryId),
      escapeCSV(amountRupees),
      escapeCSV(tx.paymentMethod || 'Unspecified'),
      escapeCSV(tx.source || 'manual'),
      escapeCSV(tx.notes || ''),
      escapeCSV(tx.rawReference || ''),
    ].join(',');
  });

  return [headers.join(','), ...rows].join('\n');
}

export function generateJSONBackup(
  transactions: Transaction[],
  budgets?: { daily: Budget | null; monthly: Budget | null }
): string {
  const backup = {
    appName: 'SpendWise',
    version: '1.0.0',
    exportedAt: new Date().toISOString(),
    transactionCount: transactions.length,
    budgets: budgets || null,
    transactions,
  };

  return JSON.stringify(backup, null, 2);
}

export async function shareExport(
  content: string,
  filename: string
): Promise<boolean> {
  try {
    const result = await Share.share({
      title: filename,
      message: content,
    });

    return result.action === Share.sharedAction;
  } catch (error: any) {
    console.error('Error sharing export file:', error);
    Alert.alert('Export Failed', error?.message || 'Could not share the exported data.');
    return false;
  }
}
