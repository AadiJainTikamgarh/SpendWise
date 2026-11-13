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

export interface AutoSyncOptions {
  userId?: string;
  force?: boolean;
  waitForInFlight?: boolean;
}

// Synchronous Mutex Lock & In-Memory State
let isSyncRunning = false;
let inFlightSyncPromise: Promise<AutoSyncResult> | null = null;
let inMemoryLastSyncTimestamp = 0;

/**
 * Returns whether an SMS auto-sync operation is currently executing.
 */
export function isSmsAutoSyncRunning(): boolean {
  return isSyncRunning;
}

/**
 * Returns the active in-flight sync promise, if any.
 */
export function getInFlightSyncPromise(): Promise<AutoSyncResult> | null {
  return inFlightSyncPromise;
}

/**
 * Resets in-memory mutex and cooldown state for test isolation.
 * Internal use only (e.g., test runners).
 */
export function _resetSmsAutoSyncLockForTesting(): void {
  isSyncRunning = false;
  inFlightSyncPromise = null;
  inMemoryLastSyncTimestamp = 0;
}

/**
 * Executes a silent background sync of recent bank SMS:
 * 1. Synchronously evaluates mutex and Tier 1 fast-path cooldown.
 * 2. Checks module availability and user preference.
 * 3. Checks permission without prompting dialogs.
 * 4. Enforces Tier 2 cold-start persistent cooldown window.
 * 5. Reads inbox, applies 5-layer spam filter, and runs hybrid deduplication.
 * 6. Automatically creates transactions in SQLite for verified new debits/credits.
 */
export function runSilentSmsAutoSync(options?: AutoSyncOptions): Promise<AutoSyncResult> {
  if (Platform.OS !== 'android') {
    return Promise.resolve({ status: 'unavailable', importedCount: 0, importedItems: [] });
  }

  const now = Date.now();

  // 1. Tier 1 Cooldown Check (Fast-path synchronous in-memory rejection in 0 ms)
  if (
    !options?.force &&
    inMemoryLastSyncTimestamp > 0 &&
    now - inMemoryLastSyncTimestamp < SYNC_COOLDOWN_MS
  ) {
    return Promise.resolve({ status: 'skipped', importedCount: 0, importedItems: [] });
  }

  // 2. Synchronous Mutex Lock Check & Acquire (MUST execute synchronously before ANY await)
  if (isSyncRunning) {
    if (options?.waitForInFlight && inFlightSyncPromise) {
      return inFlightSyncPromise;
    }
    return Promise.resolve({ status: 'skipped', importedCount: 0, importedItems: [] });
  }
  isSyncRunning = true;

  // 3. Wrap async execution and assign in-flight promise synchronously
  const executionPromise = (async (): Promise<AutoSyncResult> => {
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

      // Tier 2 Cooldown Check (Cold start persistent storage)
      if (!options?.force) {
        const lastSync = await getLastAutoSyncTimestamp();
        if (lastSync) {
          inMemoryLastSyncTimestamp = Math.max(inMemoryLastSyncTimestamp, lastSync);
          if (now - lastSync < SYNC_COOLDOWN_MS) {
            return { status: 'skipped', importedCount: 0, importedItems: [] };
          }
        }
      }

      // Set in-memory cooldown timestamp immediately to protect subsequent checks
      inMemoryLastSyncTimestamp = now;

      // Scan recent messages (last 14 days, max 150 messages to remain lightweight but comprehensive)
      const daysBack = 14;
      const minDate = now - daysBack * 24 * 60 * 60 * 1000;
      const rawMessages = await readInboxSms({ maxCount: 150, minDate });

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
      inFlightSyncPromise = null;
    }
  })();

  inFlightSyncPromise = executionPromise;
  return executionPromise;
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
  const onNewTransactionsRef = useRef(onNewTransactions);
  const appStateRef = useRef(AppState.currentState);

  useEffect(() => {
    onNewTransactionsRef.current = onNewTransactions;
  }, [onNewTransactions]);

  useEffect(() => {
    let isMounted = true;

    const performSync = async (force = false) => {
      const result = await runSilentSmsAutoSync({ userId, force });
      if (isMounted && result.importedCount > 0) {
        onNewTransactionsRef.current?.(result.importedCount);
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
  }, [userId]);
}
