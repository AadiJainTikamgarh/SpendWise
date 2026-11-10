import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    primary: '#14B896',
    primaryDark: '#07795F',
    accent: '#0AA886',
    income: '#16A34A',
    expense: '#EF4444',
    notification: '#FFD166',
    text: '#0F172A',
    textSecondary: '#64748B',
    background: '#EEF0EF',
    card: '#FFFFFF',
    backgroundElement: '#FFFFFF',
    backgroundSelected: '#E2E8F0',
    border: '#E2E8F0',
    tint: '#14B896',
  },
  dark: {
    primary: '#14B896',
    primaryDark: '#07795F',
    accent: '#0AA886',
    income: '#22C55E',
    expense: '#F87171',
    notification: '#FBBF24',
    text: '#F8FAFC',
    textSecondary: '#94A3B8',
    background: '#0D1513',
    card: '#162320',
    backgroundElement: '#162320',
    backgroundSelected: '#20332E',
    border: '#20332E',
    tint: '#14B896',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const FontFamily = {
  regular: 'PlusJakartaSans_400Regular',
  medium: 'PlusJakartaSans_500Medium',
  semiBold: 'PlusJakartaSans_600SemiBold',
  bold: 'PlusJakartaSans_700Bold',
  extraBold: 'PlusJakartaSans_800ExtraBold',
};

export const Fonts = Platform.select({
  ios: {
    sans: FontFamily.regular,
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: FontFamily.regular,
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display), sans-serif',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const NAV_BAR_HEIGHT = 64;
export const NAV_FAB_PROTRUSION = 18;
export const NAV_BAR_FLOATING_GAP = 10;

export function getTabBarBottomInset(bottomInset: number): number {
  return Math.max(bottomInset, 12) + NAV_BAR_FLOATING_GAP;
}

export function getScrollViewBottomPadding(bottomInset: number, extraMargin = 20): number {
  return NAV_BAR_HEIGHT + NAV_FAB_PROTRUSION + getTabBarBottomInset(bottomInset) + extraMargin;
}

export const BottomTabInset = 80;
export const MaxContentWidth = 800;
