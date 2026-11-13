import {
  readInboxSms,
  hasSmsPermission,
  requestSmsPermission,
  isSmsReaderAvailable,
  SmsPermissionResult,
} from 'expo-sms-reader';
import { parseSmsList } from './sms-parser';
import { filterDuplicateTransactions } from './sms-dedup';
import { ParsedSmsTransaction } from './types';
import { TransactionRepository } from '../transaction-repository';
import { Transaction } from '@/types/finance';

export interface SmsSyncScanResult {
  hasPermission: boolean;
  permissionStatus: SmsPermissionResult;
  isModuleAvailable: boolean;
  totalScanned: number;
  totalParsed: number;
  uniqueTransactions: ParsedSmsTransaction[];
  duplicateTransactions: ParsedSmsTransaction[];
}

export const smsSyncService = {
  isAvailable(): boolean {
    return isSmsReaderAvailable();
  },

  async checkPermission(): Promise<boolean> {
    return await hasSmsPermission();
  },

  async requestPermission(): Promise<SmsPermissionResult> {
    return await requestSmsPermission();
  },

  async scanInbox(options?: { daysBack?: number; maxCount?: number }): Promise<SmsSyncScanResult> {
    const days = options?.daysBack ?? 30;
    const maxCount = options?.maxCount ?? 500;
    const minDate = Date.now() - days * 24 * 60 * 60 * 1000;

    const moduleAvailable = isSmsReaderAvailable();
    if (!moduleAvailable) {
      return {
        hasPermission: false,
        permissionStatus: 'denied',
        isModuleAvailable: false,
        totalScanned: 0,
        totalParsed: 0,
        uniqueTransactions: [],
        duplicateTransactions: [],
      };
    }

    const alreadyGranted = await this.checkPermission();
    let permStatus: SmsPermissionResult = alreadyGranted ? 'granted' : 'denied';

    if (!alreadyGranted) {
      permStatus = await this.requestPermission();
      if (permStatus !== 'granted') {
        return {
          hasPermission: false,
          permissionStatus: permStatus,
          isModuleAvailable: true,
          totalScanned: 0,
          totalParsed: 0,
          uniqueTransactions: [],
          duplicateTransactions: [],
        };
      }
    }

    // 1. Read SMS messages from Android inbox
    const rawMessages = await readInboxSms({ maxCount, minDate });

    // 2. Parse candidate financial messages
    const parsedTransactions = parseSmsList(rawMessages);

    // 3. Fetch recent existing transactions for deduplication
    const existingTransactions = await TransactionRepository.getTransactions({
      startDate: new Date(minDate).toISOString(),
    });

    // 4. Separate duplicates
    const { unique, duplicates } = filterDuplicateTransactions(
      parsedTransactions,
      existingTransactions
    );

    return {
      hasPermission: true,
      permissionStatus: 'granted',
      isModuleAvailable: true,
      totalScanned: rawMessages.length,
      totalParsed: parsedTransactions.length,
      uniqueTransactions: unique,
      duplicateTransactions: duplicates,
    };
  },

  async parsePastedSms(rawText: string): Promise<SmsSyncScanResult> {
    const trimmed = rawText.trim();
    if (!trimmed) {
      return {
        hasPermission: true,
        permissionStatus: 'granted',
        isModuleAvailable: true,
        totalScanned: 0,
        totalParsed: 0,
        uniqueTransactions: [],
        duplicateTransactions: [],
      };
    }

    // Split multi-line pasted text if user pasted multiple messages separated by blank lines
    const lines = trimmed
      .split(/\n\s*\n|\r\n\s*\r\n/)
      .map((b) => b.trim())
      .filter((b) => b.length > 10);

    const rawMessages = (lines.length > 1 ? lines : [trimmed]).map((body, index) => ({
      id: `pasted_${Date.now()}_${index}`,
      address: 'PASTED-SMS',
      body,
      date: Date.now(),
    }));

    const parsedTransactions = parseSmsList(rawMessages);

    // Fetch recent transactions (last 60 days) for deduplication
    const minDate = Date.now() - 60 * 24 * 60 * 60 * 1000;
    const existingTransactions = await TransactionRepository.getTransactions({
      startDate: new Date(minDate).toISOString(),
    });

    const { unique, duplicates } = filterDuplicateTransactions(
      parsedTransactions,
      existingTransactions
    );

    return {
      hasPermission: true,
      permissionStatus: 'granted',
      isModuleAvailable: true,
      totalScanned: rawMessages.length,
      totalParsed: parsedTransactions.length,
      uniqueTransactions: unique,
      duplicateTransactions: duplicates,
    };
  },

  async importSelectedTransactions(
    items: ParsedSmsTransaction[],
    userId?: string
  ): Promise<Transaction[]> {
    const createdList: Transaction[] = [];

    for (const item of items) {
      const notesParts: string[] = [
        `Auto-imported from ${item.bankName}`,
      ];

      if (item.accountLast4) {
        notesParts.push(`A/C *${item.accountLast4}`);
      }
      if (item.referenceNo) {
        notesParts.push(`Ref: ${item.referenceNo}`);
      }

      const created = await TransactionRepository.createTransaction({
        userId,
        amount: item.amount,
        type: item.type,
        categoryId: item.categoryId,
        date: item.date,
        title: item.title,
        notes: notesParts.join(' | '),
        paymentMethod: 'UPI / Bank Transfer',
        source: 'sms',
        rawReference: item.referenceNo || item.smsId,
      });

      createdList.push(created);
    }

    return createdList;
  },
};
