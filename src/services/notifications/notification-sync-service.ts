import {
  isNotificationListenerAvailable,
  isNotificationListenerEnabled,
  openNotificationListenerSettings,
  getActivePaymentNotifications,
  getRecentPaymentNotifications,
  isNotificationListenerPaused,
  setNotificationListenerPaused,
  RawPaymentNotification,
} from 'expo-sms-reader';
import { parseSmsList } from '../sms/sms-parser';
import { filterDuplicateTransactions } from '../sms/sms-dedup';
import { ParsedSmsTransaction } from '../sms/types';
import { TransactionRepository } from '../transaction-repository';
import { Transaction } from '@/types/finance';

export interface NotificationSyncResult {
  isAvailable: boolean;
  isEnabled: boolean;
  totalCaptured: number;
  totalParsed: number;
  uniqueTransactions: ParsedSmsTransaction[];
  duplicateTransactions: ParsedSmsTransaction[];
}

export const notificationSyncService = {
  isAvailable(): boolean {
    return isNotificationListenerAvailable();
  },

  async isEnabled(): Promise<boolean> {
    return await isNotificationListenerEnabled();
  },

  async openSettings(): Promise<boolean> {
    return await openNotificationListenerSettings();
  },

  async isPaused(): Promise<boolean> {
    return await isNotificationListenerPaused();
  },

  async setPaused(paused: boolean): Promise<boolean> {
    return await setNotificationListenerPaused(paused);
  },

  /**
   * Scans all captured and active payment notifications, parses them,
   * and deduplicates them against recent transactions.
   */
  async scanNotifications(): Promise<NotificationSyncResult> {
    const available = this.isAvailable();
    if (!available) {
      return {
        isAvailable: false,
        isEnabled: false,
        totalCaptured: 0,
        totalParsed: 0,
        uniqueTransactions: [],
        duplicateTransactions: [],
      };
    }

    const enabled = await this.isEnabled();
    if (!enabled) {
      return {
        isAvailable: true,
        isEnabled: false,
        totalCaptured: 0,
        totalParsed: 0,
        uniqueTransactions: [],
        duplicateTransactions: [],
      };
    }

    // 1. Fetch both active notifications in shade and recent notifications in memory ring-buffer
    const [activeNotifs, recentNotifs] = await Promise.all([
      getActivePaymentNotifications(),
      getRecentPaymentNotifications(),
    ]);

    // Merge and deduplicate by notification ID
    const mergedMap = new Map<string, RawPaymentNotification>();
    for (const notif of [...recentNotifs, ...activeNotifs]) {
      mergedMap.set(notif.id, notif);
    }
    const allNotifs = Array.from(mergedMap.values());

    // 2. Map notifications to raw message format for parser
    const rawMessages = allNotifs.map((n) => ({
      id: n.id,
      address: n.packageName,
      body: `${n.title}. ${n.text}`.trim(),
      date: n.timestamp || Date.now(),
    }));

    // 3. Parse valid financial transactions (promotions & ads are automatically dropped by Layer 2)
    const parsedTransactions = parseSmsList(rawMessages);

    // 4. Fetch recent transactions (last 30 days) to prevent duplicates with Bank SMS or manual entries
    const minDate = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const existingTransactions = await TransactionRepository.getTransactions({
      startDate: new Date(minDate).toISOString(),
    });

    // 5. Separate duplicates
    const { unique, duplicates } = filterDuplicateTransactions(
      parsedTransactions,
      existingTransactions
    );

    return {
      isAvailable: true,
      isEnabled: true,
      totalCaptured: allNotifs.length,
      totalParsed: parsedTransactions.length,
      uniqueTransactions: unique,
      duplicateTransactions: duplicates,
    };
  },

  /**
   * Imports parsed notification transactions into SpendWise SQLite database
   */
  async importTransactions(
    items: ParsedSmsTransaction[],
    userId?: string
  ): Promise<Transaction[]> {
    const createdList: Transaction[] = [];

    for (const item of items) {
      const notesParts: string[] = [
        `Auto-imported from ${item.bankName} notification`,
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
        paymentMethod: 'UPI App',
        source: 'sms', // Uses existing SMS/auto sync classification
        rawReference: item.referenceNo || item.smsId,
      });

      createdList.push(created);
    }

    return createdList;
  },
};
