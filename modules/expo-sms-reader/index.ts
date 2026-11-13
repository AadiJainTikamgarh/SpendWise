import { requireNativeModule } from 'expo-modules-core';
import { PermissionsAndroid, Platform } from 'react-native';

export interface ReadSmsOptions {
  maxCount?: number;
  minDate?: number; // Milliseconds timestamp
}

export interface RawSmsMessage {
  id: string;
  address: string;
  body: string;
  date: number;
}

export interface RawPaymentNotification {
  id: string;
  packageName: string;
  title: string;
  text: string;
  timestamp: number;
}

export type SmsPermissionResult = 'granted' | 'denied' | 'never_ask_again';

let nativeModule: {
  hasPermissionsAsync(): Promise<boolean>;
  readSmsAsync(options: { maxCount?: number; minDate?: number }): Promise<RawSmsMessage[]>;
  isNotificationListenerEnabledAsync(): Promise<boolean>;
  openNotificationListenerSettingsAsync(): Promise<boolean>;
  getActivePaymentNotificationsAsync(): Promise<RawPaymentNotification[]>;
  getRecentPaymentNotificationsAsync(): Promise<RawPaymentNotification[]>;
  clearPaymentNotificationsAsync(): Promise<boolean>;
  isNotificationListenerPausedAsync(): Promise<boolean>;
  setNotificationListenerPausedAsync(paused: boolean): Promise<boolean>;
} | null = null;

try {
  if (Platform.OS === 'android') {
    nativeModule = requireNativeModule('ExpoSmsReader');
  }
} catch {
  nativeModule = null;
}

export function isSmsReaderAvailable(): boolean {
  return Platform.OS === 'android' && nativeModule !== null;
}

export async function hasSmsPermission(): Promise<boolean> {
  if (Platform.OS !== 'android') return false;
  try {
    return await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.READ_SMS);
  } catch {
    return false;
  }
}

export async function requestSmsPermission(): Promise<SmsPermissionResult> {
  if (Platform.OS !== 'android') return 'denied';

  try {
    // Calling PermissionsAndroid.request directly without rationale forces the Android OS system popup to appear
    const result = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.READ_SMS);
    if (result === PermissionsAndroid.RESULTS.GRANTED) {
      return 'granted';
    }
    if (result === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) {
      return 'never_ask_again';
    }
    return 'denied';
  } catch (error) {
    console.warn('requestSmsPermission error:', error);
    return 'denied';
  }
}

export async function readInboxSms(options?: ReadSmsOptions): Promise<RawSmsMessage[]> {
  if (Platform.OS !== 'android' || !nativeModule) {
    return [];
  }

  const hasPerm = await hasSmsPermission();
  if (!hasPerm) {
    const permResult = await requestSmsPermission();
    if (permResult !== 'granted') {
      return [];
    }
  }

  try {
    const messages = await nativeModule.readSmsAsync({
      maxCount: options?.maxCount ?? 300,
      minDate: options?.minDate ?? 0,
    });
    return messages || [];
  } catch (error) {
    console.error('Failed to read SMS:', error);
    return [];
  }
}

export function isNotificationListenerAvailable(): boolean {
  return Platform.OS === 'android' && nativeModule !== null;
}

export async function isNotificationListenerEnabled(): Promise<boolean> {
  if (Platform.OS !== 'android' || !nativeModule) return false;
  try {
    return await nativeModule.isNotificationListenerEnabledAsync();
  } catch {
    return false;
  }
}

export async function openNotificationListenerSettings(): Promise<boolean> {
  if (Platform.OS !== 'android' || !nativeModule) return false;
  try {
    return await nativeModule.openNotificationListenerSettingsAsync();
  } catch {
    return false;
  }
}

export async function getActivePaymentNotifications(): Promise<RawPaymentNotification[]> {
  if (Platform.OS !== 'android' || !nativeModule) return [];
  try {
    return await nativeModule.getActivePaymentNotificationsAsync();
  } catch {
    return [];
  }
}

export async function getRecentPaymentNotifications(): Promise<RawPaymentNotification[]> {
  if (Platform.OS !== 'android' || !nativeModule) return [];
  try {
    return await nativeModule.getRecentPaymentNotificationsAsync();
  } catch {
    return [];
  }
}

export async function clearPaymentNotifications(): Promise<boolean> {
  if (Platform.OS !== 'android' || !nativeModule) return false;
  try {
    return await nativeModule.clearPaymentNotificationsAsync();
  } catch {
    return false;
  }
}

export async function isNotificationListenerPaused(): Promise<boolean> {
  if (Platform.OS !== 'android' || !nativeModule) return false;
  try {
    return await nativeModule.isNotificationListenerPausedAsync();
  } catch {
    return false;
  }
}

export async function setNotificationListenerPaused(paused: boolean): Promise<boolean> {
  if (Platform.OS !== 'android' || !nativeModule) return false;
  try {
    return await nativeModule.setNotificationListenerPausedAsync(paused);
  } catch {
    return false;
  }
}
