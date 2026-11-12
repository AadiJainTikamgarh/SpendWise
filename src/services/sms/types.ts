import { Category, TransactionType } from '@/types/finance';

export interface RawSms {
  id: string;
  address: string; // e.g. "AD-HDFCBK", "VM-SBIN", "VK-ICICIB"
  body: string;
  date: number; // Unix timestamp in ms
}

export interface ParsedSmsTransaction {
  id: string; // Unique sync identifier / hash
  smsId: string;
  amount: number; // Integer in paise
  type: TransactionType;
  title: string; // Merchant or counterparty (e.g. "Swiggy", "Blinkit", "Atm Withdrawal")
  categoryId: string; // Matched category ID from EXPENSE_CATEGORIES
  suggestedCategory?: Category;
  date: string; // ISO 8601 string
  bankName: string; // e.g. "HDFC Bank", "State Bank of India"
  accountLast4?: string;
  referenceNo?: string;
  originalSms: string;
  isDuplicate?: boolean;
}

export interface SmsScanResult {
  totalScanned: number;
  totalParsed: number;
  transactions: ParsedSmsTransaction[];
}
