import {
  useFonts,
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
} from '@expo-google-fonts/plus-jakarta-sans';
import { DarkTheme, DefaultTheme, ThemeProvider, useRouter, useSegments, Slot } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import React, { useEffect } from 'react';
import { ActivityIndicator, BackHandler, Platform, StyleSheet, View } from 'react-native';
import { SafeAreaProvider, initialWindowMetrics } from 'react-native-safe-area-context';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { CustomTabBar } from '@/components/navigation/custom-tab-bar';
import { AuthProvider, useAuth } from '@/context/auth-context';
import { FinanceProvider } from '@/context/finance-context';
import { AppThemeProvider, useThemeContext } from '@/context/theme-context';
import { safeGoBack } from '@/utils/navigation';

SplashScreen.preventAutoHideAsync().catch(() => {});

function RootNavigator() {
  const { session, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  const [fontsLoaded] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
  });

  const inAuthGroup = segments[0] === '(auth)';
  const isAuthCallback =
    (segments as string[])[0] === 'auth' || (segments as string[])[0] === 'callback';
  const isTabRoute =
    !segments[0] ||
    ['index', 'transactions', 'calendar', 'profile'].includes((segments as string[])[0]);

  useEffect(() => {
    if (isLoading || !fontsLoaded) return;

    SplashScreen.hideAsync().catch(() => {});

    if (!session && !inAuthGroup && !isAuthCallback) {
      router.replace('/(auth)/login');
    } else if (session && inAuthGroup) {
      router.replace('/');
    }
  }, [session, isLoading, fontsLoaded, inAuthGroup, isAuthCallback, router]);

  // Global Android Hardware Back Press Handler to prevent unhandled GO_BACK actions
  useEffect(() => {
    if (Platform.OS !== 'android') return;

    const onBackPress = () => {
      const currentSegment = (segments[0] as string | undefined) || '';

      // If in modal, safely return to home tab
      if (currentSegment === 'modal') {
        safeGoBack('/');
        return true;
      }

      // If in forgot-password, safely return to login
      if (inAuthGroup && (segments as string[])[1] === 'forgot-password') {
        safeGoBack('/(auth)/login');
        return true;
      }

      // If on a secondary tab, return to initial home tab
      if (['transactions', 'calendar', 'profile'].includes(currentSegment)) {
        router.replace('/');
        return true;
      }

      // If there is actual navigation history to go back to, go back
      if (router.canGoBack()) {
        router.back();
        return true;
      }

      // Already at root (e.g. index or login), let Android minimize/exit cleanly
      return false;
    };

    const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => subscription.remove();
  }, [segments, inAuthGroup, router]);

  if (isLoading || !fontsLoaded) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#14B896" />
      </View>
    );
  }

  // If on the callback route, not authenticated, or on a modal/subroute, render Slot
  if (isAuthCallback || !session || !isTabRoute) {
    return <Slot />;
  }

  return (
    <View style={styles.tabLayoutContainer}>
      <AnimatedSplashOverlay />
      <Slot />
      <CustomTabBar />
    </View>
  );
}

function LayoutContent() {
  const { isDark, theme } = useThemeContext();
  const navTheme = isDark ? DarkTheme : DefaultTheme;
  const customTheme = {
    ...navTheme,
    colors: {
      ...navTheme.colors,
      primary: '#14B896',
      background: theme.background,
      card: theme.card,
      text: theme.text,
      border: theme.border,
    },
  };

  return (
    <ThemeProvider value={customTheme}>
      <AuthProvider>
        <FinanceProvider>
          <RootNavigator />
        </FinanceProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider initialMetrics={initialWindowMetrics}>
      <AppThemeProvider>
        <LayoutContent />
      </AppThemeProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabLayoutContainer: {
    flex: 1,
  },
});
