import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  hasSmsPermission,
  isSmsReaderAvailable,
  readInboxSms,
} from 'expo-sms-reader';
import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus, Platform } from 'react-native';

import { HapticsService } from '../haptics';
import { TransactionRepository } from '../transaction-repository';
import { filterDuplicateTransactions } from './sms-dedup';
import { parseSmsList } from './sms-parser';
import { smsSyncService } from './sms-sync-service';
import { ParsedSmsTransaction } from './types';

export const STORAGE_KEY_AUTO_SYNC_ENABLED = '@spendwise_sms_auto_sync_enabled';
export const STORAGE_KEY_LAST_SYNC_TIMESTAMP = '@spendwise_sms_last_sync_timestamp';

// Minimum interval between automatic background sweeps (20 seconds)
const SYNC_COOLDOWN_MS = 20 * 1000;

/**
 * Returns whether background SMS auto-sync is enabled by the user.
 * Defaults to true on Android.
 */
export async function getSmsAutoSyncEnabled(): Promise<boolean> {
  try {
    const val = await AsyncStorage.getItem(STORAGE_KEY_AUTO_SYNC_ENABLED);
    return val === null ? true : val === 'true';
  } catch {
    return true;
  }
}

/**
 * Persists the user preference for background SMS auto-sync.
 */
export async function setSmsAutoSyncEnabled(enabled: boolean): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY_AUTO_SYNC_ENABLED, enabled ? 'true' : 'false');
  } catch (e) {
    console.error('Failed to set SMS auto-sync preference:', e);
  }
}

/**
 * Returns the timestamp (in ms) of the most recent auto-sync.
 */
export async function getLastAutoSyncTimestamp(): Promise<number | null> {
  try {
    const val = await AsyncStorage.getItem(STORAGE_KEY_LAST_SYNC_TIMESTAMP);
    return val ? parseInt(val, 10) : null;
  } catch {
    return null;
  }
}

export interface AutoSyncResult {
  status: 'skipped' | 'no_permission' | 'unavailable' | 'synced';
  importedCount: number;
  importedItems: ParsedSmsTransaction[];
}

let isSyncRunning = false;

/**
 * Executes a silent background sync of recent bank SMS:
 * 1. Checks module availability and user preference.
 * 2. Checks permission without prompting dialogs.
 * 3. Enforces cooldown window to prevent rapid redundant sweeps.
 * 4. Reads inbox, applies 5-layer spam filter, and runs hybrid deduplication.
 * 5. Automatically creates transactions in SQLite for verified new debits/credits.
 */
export async function runSilentSmsAutoSync(options?: {
  userId?: string;
  force?: boolean;
}): Promise<AutoSyncResult> {
  if (Platform.OS !== 'android') {
    return { status: 'unavailable', importedCount: 0, importedItems: [] };
  }

  if (isSyncRunning) {
    return { status: 'skipped', importedCount: 0, importedItems: [] };
  }

  try {
    if (!isSmsReaderAvailable()) {
      return { status: 'unavailable', importedCount: 0, importedItems: [] };
    }

    const enabled = await getSmsAutoSyncEnabled();
    if (!enabled && !options?.force) {
      return { status: 'skipped', importedCount: 0, importedItems: [] };
    }

    // Silent permission check - never trigger a modal dialog during background auto-sync
    const hasPerm = await hasSmsPermission();
    if (!hasPerm) {
      return { status: 'no_permission', importedCount: 0, importedItems: [] };
    }

    // Cooldown check
    const now = Date.now();
    const lastSync = await getLastAutoSyncTimestamp();
    if (!options?.force && lastSync && now - lastSync < SYNC_COOLDOWN_MS) {
      return { status: 'skipped', importedCount: 0, importedItems: [] };
    }

    isSyncRunning = true;

    // Scan recent messages (last 7 days, max 60 messages to remain lightweight)
    const daysBack = 7;
    const minDate = now - daysBack * 24 * 60 * 60 * 1000;
    const rawMessages = await readInboxSms({ maxCount: 60, minDate });

    if (!rawMessages || rawMessages.length === 0) {
      await AsyncStorage.setItem(STORAGE_KEY_LAST_SYNC_TIMESTAMP, String(now));
      return { status: 'synced', importedCount: 0, importedItems: [] };
    }

    // Parse financial messages with defensive spam/advertisement filter
    const parsedTransactions = parseSmsList(rawMessages);
    if (parsedTransactions.length === 0) {
      await AsyncStorage.setItem(STORAGE_KEY_LAST_SYNC_TIMESTAMP, String(now));
      return { status: 'synced', importedCount: 0, importedItems: [] };
    }

    // Fetch existing transactions for deduplication
    const existingTransactions = await TransactionRepository.getTransactions({
      startDate: new Date(minDate).toISOString(),
    });

    // Deduplicate against existing SQLite records
    const { unique } = filterDuplicateTransactions(
      parsedTransactions,
      existingTransactions
    );

    if (unique.length === 0) {
      await AsyncStorage.setItem(STORAGE_KEY_LAST_SYNC_TIMESTAMP, String(now));
      return { status: 'synced', importedCount: 0, importedItems: [] };
    }

    // Auto-import verified debits and credits
    await smsSyncService.importSelectedTransactions(unique, options?.userId);
    await AsyncStorage.setItem(STORAGE_KEY_LAST_SYNC_TIMESTAMP, String(now));

    try {
      HapticsService.light();
    } catch {}

    return {
      status: 'synced',
      importedCount: unique.length,
      importedItems: unique,
    };
  } catch (error) {
    console.error('Silent SMS Auto-Sync error:', error);
    return { status: 'skipped', importedCount: 0, importedItems: [] };
  } finally {
    isSyncRunning = false;
  }
}

/**
 * Hook to automatically trigger background SMS sync:
 * - When the app mounts
 * - Whenever the app transitions from background to active foreground
 */
export function useSmsAutoSync(options?: {
  userId?: string;
  onNewTransactions?: (count: number) => void;
}) {
  const userId = options?.userId;
  const onNewTransactions = options?.onNewTransactions;
  const appStateRef = useRef(AppState.currentState);

  useEffect(() => {
    let isMounted = true;

    const performSync = async (force = false) => {
      const result = await runSilentSmsAutoSync({ userId, force });
      if (isMounted && result.importedCount > 0) {
        onNewTransactions?.(result.importedCount);
      }
    };

    // Initial sync upon hook mount
    performSync(false);

    // Sync when returning to active app state
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      const prevAppState = appStateRef.current;
      if (
        prevAppState &&
        /inactive|background/.test(prevAppState) &&
        nextAppState === 'active'
      ) {
        performSync(false);
      }
      appStateRef.current = nextAppState;
    });

    return () => {
      isMounted = false;
      subscription.remove();
    };
  }, [userId, onNewTransactions]);
}
