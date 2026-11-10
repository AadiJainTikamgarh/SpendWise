import type { SQLiteDatabase } from 'expo-sqlite';
import { Platform } from 'react-native';

let dbInstance: SQLiteDatabase | null = null;
let isNativeModuleAvailable: boolean | null = null;

/**
 * Checks if the ExpoSQLite native module is registered in the running native binary.
 * This prevents calling `require('expo-sqlite')` when running in standard Expo Go
 * or an outdated development build APK, avoiding the uncaught NativeModule error.
 */
function checkNativeSQLiteAvailable(): boolean {
  if (Platform.OS === 'web') {
    return false;
  }

  const expoModules = (globalThis as Record<string, unknown>).expo as
    | { modules?: Record<string, unknown> }
    | undefined;
  if (!expoModules?.modules || !expoModules.modules.ExpoSQLite) {
    return false;
  }
  return true;
}

export function getDatabase(): SQLiteDatabase | null {
  if (Platform.OS === 'web') {
    return null;
  }

  if (isNativeModuleAvailable === false) {
    return null;
  }

  if (!dbInstance) {
    if (!checkNativeSQLiteAvailable()) {
      isNativeModuleAvailable = false;
      return null;
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const SQLite = require('expo-sqlite') as typeof import('expo-sqlite');
      dbInstance = SQLite.openDatabaseSync('spendwise.db');
      initDatabase(dbInstance);
      isNativeModuleAvailable = true;
    } catch {
      isNativeModuleAvailable = false;
      return null;
    }
  }
  return dbInstance;
}

function initDatabase(db: SQLiteDatabase) {
  db.execSync(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY NOT NULL,
      user_id TEXT,
      amount INTEGER NOT NULL,
      type TEXT NOT NULL,
      category_id TEXT NOT NULL,
      date TEXT NOT NULL,
      title TEXT NOT NULL,
      notes TEXT,
      payment_method TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
    CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
    CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category_id);

    CREATE TABLE IF NOT EXISTS budgets (
      id TEXT PRIMARY KEY NOT NULL,
      period TEXT UNIQUE NOT NULL,
      amount INTEGER NOT NULL,
      thresholds TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);
}
