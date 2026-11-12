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
      source TEXT DEFAULT 'manual',
      raw_reference TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
    CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
    CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category_id);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_transactions_raw_ref ON transactions(raw_reference) WHERE raw_reference IS NOT NULL;

    CREATE TABLE IF NOT EXISTS budgets (
      id TEXT PRIMARY KEY NOT NULL,
      period TEXT UNIQUE NOT NULL,
      amount INTEGER NOT NULL,
      thresholds TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS feedback (
      id TEXT PRIMARY KEY NOT NULL,
      user_id TEXT,
      user_email TEXT,
      category TEXT NOT NULL,
      rating INTEGER NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_feedback_created_at ON feedback(created_at);
  `);

  // Non-destructive migration for existing installations
  try {
    const columns = db.getAllSync<{ name: string }>('PRAGMA table_info(transactions);');
    const columnNames = new Set(columns.map((c) => c.name));
    if (!columnNames.has('source')) {
      db.execSync("ALTER TABLE transactions ADD COLUMN source TEXT DEFAULT 'manual';");
    }
    if (!columnNames.has('raw_reference')) {
      db.execSync('ALTER TABLE transactions ADD COLUMN raw_reference TEXT;');
    }

    // Clean up any historical duplicate non-null raw_references before enforcing unique index
    db.execSync(`
      DELETE FROM transactions
      WHERE raw_reference IS NOT NULL
        AND rowid NOT IN (
          SELECT MIN(rowid)
          FROM transactions
          WHERE raw_reference IS NOT NULL
          GROUP BY raw_reference
        );
      CREATE UNIQUE INDEX IF NOT EXISTS idx_transactions_raw_ref ON transactions(raw_reference) WHERE raw_reference IS NOT NULL;
    `);
  } catch (e) {
    console.warn('Non-destructive migration warning (raw_reference unique index):', e);
  }
}
