import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react';
import { useColorScheme as useDeviceColorScheme } from 'react-native';

import { Colors } from '@/constants/theme';

export type ThemeMode = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';
export type ColorTheme = (typeof Colors)[ResolvedTheme];

interface ThemeContextType {
  themeMode: ThemeMode;
  resolvedTheme: ResolvedTheme;
  isDark: boolean;
  theme: ColorTheme;
  setThemeMode: (mode: ThemeMode) => Promise<void>;
  toggleTheme: () => Promise<void>;
}

const THEME_STORAGE_KEY = '@spendwise_theme_mode';

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function AppThemeProvider({ children }: { children: React.ReactNode }) {
  const deviceScheme = useDeviceColorScheme();
  const [themeMode, setThemeModeState] = useState<ThemeMode>('system');

  useEffect(() => {
    async function loadTheme() {
      try {
        const stored = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        if (stored === 'light' || stored === 'dark' || stored === 'system') {
          setThemeModeState(stored);
        }
      } catch (err) {
        console.warn('Failed to load theme preference:', err);
      }
    }
    loadTheme();
  }, []);

  const setThemeMode = useCallback(async (mode: ThemeMode) => {
    setThemeModeState(mode);
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, mode);
    } catch (err) {
      console.warn('Failed to save theme preference:', err);
    }
  }, []);

  const resolvedTheme: ResolvedTheme = useMemo(() => {
    if (themeMode === 'dark') return 'dark';
    if (themeMode === 'light') return 'light';
    return deviceScheme === 'dark' ? 'dark' : 'light';
  }, [themeMode, deviceScheme]);

  const isDark = resolvedTheme === 'dark';

  const toggleTheme = useCallback(async () => {
    const nextMode: ThemeMode = resolvedTheme === 'dark' ? 'light' : 'dark';
    await setThemeMode(nextMode);
  }, [resolvedTheme, setThemeMode]);

  const theme = Colors[resolvedTheme];

  const value = useMemo(
    () => ({
      themeMode,
      resolvedTheme,
      isDark,
      theme,
      setThemeMode,
      toggleTheme,
    }),
    [themeMode, resolvedTheme, isDark, theme, setThemeMode, toggleTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useThemeContext() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useThemeContext must be used within an AppThemeProvider');
  }
  return context;
}
