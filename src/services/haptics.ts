import * as Haptics from 'expo-haptics';
import { Platform, Vibration } from 'react-native';

const safeVibrate = (pattern: number | number[]) => {
  try {
    Vibration.vibrate(pattern);
  } catch {
    // Ignore fallback vibration errors
  }
};

export const HapticsService = {
  /**
   * Light tactile tap for list items, tabs, and standard buttons.
   */
  light() {
    if (Platform.OS === 'web') return;
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {
        safeVibrate(10);
      });
    } catch {
      safeVibrate(10);
    }
  },

  /**
   * Medium impact for FAB press, segmented pill switches, toggle switches.
   */
  medium() {
    if (Platform.OS === 'web') return;
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {
        safeVibrate(20);
      });
    } catch {
      safeVibrate(20);
    }
  },

  /**
   * Selection tick for dial changes, keypad strokes, category picker selections.
   */
  selection() {
    if (Platform.OS === 'web') return;
    try {
      Haptics.selectionAsync().catch(() => {
        safeVibrate(8);
      });
    } catch {
      safeVibrate(8);
    }
  },

  /**
   * Success notification vibration for saved transaction, imported SMS batch.
   */
  success() {
    if (Platform.OS === 'web') return;
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {
        safeVibrate([0, 25, 60, 30]);
      });
    } catch {
      safeVibrate([0, 25, 60, 30]);
    }
  },

  /**
   * Warning notification vibration when nearing/exceeding budget limits.
   */
  warning() {
    if (Platform.OS === 'web') return;
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {
        safeVibrate([0, 30, 60, 30]);
      });
    } catch {
      safeVibrate([0, 30, 60, 30]);
    }
  },

  /**
   * Heavy / Error impact for destructive actions (Reset App Data, Delete Account).
   */
  heavy() {
    if (Platform.OS === 'web') return;
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {
        safeVibrate(40);
      });
    } catch {
      safeVibrate(40);
    }
  },
};
