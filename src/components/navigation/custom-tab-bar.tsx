import { Ionicons } from '@expo/vector-icons';
import { useRouter, useSegments } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { FontFamily, getTabBarBottomInset } from '@/constants/theme';
import { useAppTheme } from '@/hooks/use-theme';

export function CustomTabBar() {
  const router = useRouter();
  const segments = useSegments();
  const { theme, isDark } = useAppTheme();
  const insets = useSafeAreaInsets();

  const bottomPadding = getTabBarBottomInset(insets.bottom);

  const firstSegment = (segments as string[])[0];

  const isTabActive = (tabName: string) => {
    if (tabName === 'index') {
      return !firstSegment || firstSegment === 'index';
    }
    return firstSegment === tabName;
  };

  const navigateTo = (route: string) => {
    if (route === 'index') {
      router.replace('/');
    } else {
      router.replace(`/${route}` as any);
    }
  };

  const handleOpenModal = () => {
    router.push('/modal/transaction' as any);
  };

  return (
    <View style={[styles.dockWrapper, { paddingBottom: bottomPadding }]} pointerEvents="box-none">
      <View
        style={[
          styles.container,
          {
            backgroundColor: isDark ? '#0F1A17' : '#FFFFFF',
            borderColor: isDark ? '#1E332C' : '#E2E8F0',
            shadowColor: isDark ? '#000000' : '#0F172A',
          },
        ]}>
        
        {/* Tab 1: Home */}
        <Pressable
          style={styles.tabButton}
          onPress={() => navigateTo('index')}
          hitSlop={8}>
          <Ionicons
            name={isTabActive('index') ? 'home' : 'home-outline'}
            size={22}
            color={isTabActive('index') ? theme.primary : theme.textSecondary}
          />
          <ThemedText
            style={[
              styles.tabLabel,
              {
                color: isTabActive('index') ? theme.primary : theme.textSecondary,
                fontFamily: isTabActive('index') ? FontFamily.bold : FontFamily.medium,
              },
            ]}>
            Home
          </ThemedText>
        </Pressable>

        {/* Tab 2: Transactions */}
        <Pressable
          style={styles.tabButton}
          onPress={() => navigateTo('transactions')}
          hitSlop={8}>
          <Ionicons
            name={isTabActive('transactions') ? 'receipt' : 'receipt-outline'}
            size={22}
            color={isTabActive('transactions') ? theme.primary : theme.textSecondary}
          />
          <ThemedText
            style={[
              styles.tabLabel,
              {
                color: isTabActive('transactions') ? theme.primary : theme.textSecondary,
                fontFamily: isTabActive('transactions') ? FontFamily.bold : FontFamily.medium,
              },
            ]}>
            Transactions
          </ThemedText>
        </Pressable>

        {/* Center Elevated Dual-Ring FAB (+) */}
        <View style={styles.centerFabSlot} pointerEvents="box-none">
          <View
            style={[
              styles.outerRing,
              {
                backgroundColor: isDark ? '#082820' : '#E6FAF5',
                borderColor: isDark ? '#144638' : '#A7F3D0',
              },
            ]}>
            <Pressable
              style={({ pressed }) => [
                styles.innerButton,
                { backgroundColor: theme.primary },
                pressed && styles.buttonPressed,
              ]}
              onPress={handleOpenModal}
              hitSlop={10}>
              <Ionicons name="add" size={28} color="#FFFFFF" />
            </Pressable>
          </View>
        </View>

        {/* Tab 3: Calendar */}
        <Pressable
          style={styles.tabButton}
          onPress={() => navigateTo('calendar')}
          hitSlop={8}>
          <Ionicons
            name={isTabActive('calendar') ? 'calendar' : 'calendar-outline'}
            size={22}
            color={isTabActive('calendar') ? theme.primary : theme.textSecondary}
          />
          <ThemedText
            style={[
              styles.tabLabel,
              {
                color: isTabActive('calendar') ? theme.primary : theme.textSecondary,
                fontFamily: isTabActive('calendar') ? FontFamily.bold : FontFamily.medium,
              },
            ]}>
            Calendar
          </ThemedText>
        </Pressable>

        {/* Tab 4: Profile */}
        <Pressable
          style={styles.tabButton}
          onPress={() => navigateTo('profile')}
          hitSlop={8}>
          <Ionicons
            name={isTabActive('profile') ? 'person' : 'person-outline'}
            size={22}
            color={isTabActive('profile') ? theme.primary : theme.textSecondary}
          />
          <ThemedText
            style={[
              styles.tabLabel,
              {
                color: isTabActive('profile') ? theme.primary : theme.textSecondary,
                fontFamily: isTabActive('profile') ? FontFamily.bold : FontFamily.medium,
              },
            ]}>
            Profile
          </ThemedText>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  dockWrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    maxWidth: 500,
    height: 64,
    borderRadius: 32,
    borderWidth: 1,
    paddingHorizontal: 8,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 8,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    gap: 3,
  },
  tabLabel: {
    fontSize: 11,
  },
  centerFabSlot: {
    width: 66,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
  },
  outerRing: {
    position: 'absolute',
    top: -18,
    width: 62,
    height: 62,
    borderRadius: 31,
    borderWidth: 2.5,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#14B896',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
  },
  innerButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.94 }],
  },
});
