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

export type SmsPermissionResult = 'granted' | 'denied' | 'never_ask_again';

let nativeModule: {
  hasPermissionsAsync(): Promise<boolean>;
  readSmsAsync(options: { maxCount?: number; minDate?: number }): Promise<RawSmsMessage[]>;
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
