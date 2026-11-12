import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import * as Linking from 'expo-linking';

import { getDatabase } from '@/services/db';
import { supabase } from '@/utils/supabase';

export type FeedbackCategory =
  | 'feature_request'
  | 'bug_report'
  | 'app_experience'
  | 'general';

export interface FeedbackPayload {
  category: FeedbackCategory;
  rating: number; // 1-5
  title: string;
  description: string;
  userEmail?: string;
  userId?: string;
}

export interface FeedbackRecord extends FeedbackPayload {
  id: string;
  created_at: string;
}

const STORAGE_KEY = '@spendwise_local_feedback';
const DEVELOPER_EMAIL = 'support@spendwise.app';

export const CATEGORY_LABELS: Record<FeedbackCategory, string> = {
  feature_request: 'Feature Request',
  bug_report: 'Bug Report',
  app_experience: 'App Experience',
  general: 'General Feedback',
};

export const QUICK_FEATURE_SUGGESTIONS = [
  'Custom Monthly Budget Widgets',
  'Split Expenses with Friends',
  'Receipt Image OCR Scanner',
  'Recurring Subscription Alerts',
  'Export Reports to PDF',
  'Multi-Currency Conversion',
];

export class FeedbackService {
  /**
   * Persists user feedback offline-first into SQLite/AsyncStorage and syncs to Supabase.
   */
  static async submitFeedback(payload: FeedbackPayload): Promise<{ success: boolean; id: string }> {
    const id = Crypto.randomUUID();
    const createdAt = new Date().toISOString();

    const record: FeedbackRecord = {
      ...payload,
      id,
      created_at: createdAt,
    };

    // 1. Local SQLite storage (offline first)
    try {
      const db = getDatabase();
      if (db) {
        db.runSync(
          `INSERT INTO feedback (id, user_id, user_email, category, rating, title, description, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            record.id,
            record.userId || null,
            record.userEmail || null,
            record.category,
            record.rating,
            record.title.trim(),
            record.description.trim(),
            record.created_at,
          ]
        );
      }
    } catch {
      // Continue to AsyncStorage fallback
    }

    // 2. AsyncStorage persistence fallback
    try {
      const existing = await AsyncStorage.getItem(STORAGE_KEY);
      const list: FeedbackRecord[] = existing ? JSON.parse(existing) : [];
      list.unshift(record);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(list.slice(0, 50)));
    } catch {
      // Non-fatal
    }

    // 3. Cloud Supabase Sync (if online and configured)
    try {
      await supabase.from('app_feedback').insert({
        id: record.id,
        user_id: record.userId || null,
        user_email: record.userEmail || null,
        category: record.category,
        rating: record.rating,
        title: record.title.trim(),
        description: record.description.trim(),
        created_at: record.created_at,
      });
    } catch {
      // Gracefully silent if table is missing or device is offline
    }

    return { success: true, id };
  }

  /**
   * Opens the device default email client with a pre-filled feedback draft.
   */
  static async sendViaEmail(payload: FeedbackPayload): Promise<boolean> {
    const categoryName = CATEGORY_LABELS[payload.category] || 'General';
    const subject = `[SpendWise] ${categoryName}: ${payload.title || 'User Feedback'}`;
    const stars = '★'.repeat(Math.max(1, Math.min(5, payload.rating))) +
      '☆'.repeat(5 - Math.max(1, Math.min(5, payload.rating)));

    const body = `Category: ${categoryName}
Rating: ${payload.rating}/5 (${stars})
User: ${payload.userEmail || 'Anonymous'}

Details:
${payload.description.trim()}

---
Sent from SpendWise App`;

    const url = `mailto:${DEVELOPER_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    try {
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }
}
