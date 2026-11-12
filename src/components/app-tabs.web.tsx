import { Ionicons } from '@expo/vector-icons';
import {
  Tabs,
  TabList,
  TabTrigger,
  TabSlot,
  TabTriggerSlotProps,
  TabListProps,
} from 'expo-router/ui';
import React from 'react';
import { Pressable, View, StyleSheet, useColorScheme } from 'react-native';

import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';
import { Colors, MaxContentWidth, Spacing } from '@/constants/theme';

export default function AppTabs() {
  return (
    <Tabs>
      <TabSlot style={{ height: '100%' }} />
      <TabList asChild>
        <CustomTabList>
          <TabTrigger name="home" href="/" asChild>
            <TabButton icon="home-outline" activeIcon="home">
              Home
            </TabButton>
          </TabTrigger>
          <TabTrigger name="transactions" href={'/transactions' as any} asChild>
            <TabButton icon="receipt-outline" activeIcon="receipt">
              Transactions
            </TabButton>
          </TabTrigger>
          <TabTrigger name="calendar" href={'/calendar' as any} asChild>
            <TabButton icon="calendar-outline" activeIcon="calendar">
              Calendar
            </TabButton>
          </TabTrigger>
          <TabTrigger name="profile" href={'/profile' as any} asChild>
            <TabButton icon="person-outline" activeIcon="person">
              Profile
            </TabButton>
          </TabTrigger>
        </CustomTabList>
      </TabList>
    </Tabs>
  );
}

interface TabButtonProps extends TabTriggerSlotProps {
  icon?: keyof typeof Ionicons.glyphMap;
  activeIcon?: keyof typeof Ionicons.glyphMap;
}

export function TabButton({
  children,
  icon,
  activeIcon,
  isFocused,
  ...props
}: TabButtonProps) {
  const scheme = useColorScheme();
  const theme = Colors[scheme === 'dark' ? 'dark' : 'light'];
  const iconName = isFocused ? activeIcon || icon : icon;
  const iconColor = isFocused ? '#14B896' : theme.textSecondary;

  return (
    <Pressable {...(props as any)} style={({ pressed }) => pressed && styles.pressed}>
      <ThemedView
        type={isFocused ? 'backgroundSelected' : 'backgroundElement'}
        style={[styles.tabButtonView, isFocused && styles.tabButtonActive]}>
        {iconName ? (
          <Ionicons
            name={iconName}
            size={16}
            color={iconColor}
            style={styles.tabIcon}
          />
        ) : null}
        <ThemedText
          type="small"
          style={[
            styles.tabText,
            {
              color: isFocused ? '#14B896' : theme.textSecondary,
              fontWeight: isFocused ? '600' : '400',
            },
          ]}>
          {children}
        </ThemedText>
      </ThemedView>
    </Pressable>
  );
}

export function CustomTabList(props: TabListProps) {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';

  return (
    <View {...props} style={styles.tabListContainer}>
      <ThemedView
        type="backgroundElement"
        style={[
          styles.innerContainer,
          isDark ? styles.innerContainerDark : styles.innerContainerLight,
        ]}>
        <View style={styles.brandRow}>
          <Ionicons name="wallet" size={18} color="#14B896" />
          <ThemedText type="smallBold" style={styles.brandText}>
            SpendWise
          </ThemedText>
        </View>

        <View style={styles.buttonsRow}>{props.children}</View>
      </ThemedView>
    </View>
  );
}

const styles = StyleSheet.create({
  tabListContainer: {
    position: 'absolute',
    width: '100%',
    padding: Spacing.three,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    bottom: 0,
    zIndex: 100,
  },
  innerContainer: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.four,
    borderRadius: Spacing.five,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexGrow: 1,
    maxWidth: MaxContentWidth,
    borderWidth: 1,
  },
  innerContainerLight: {
    borderColor: 'rgba(0, 0, 0, 0.08)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
  },
  innerContainerDark: {
    borderColor: 'rgba(255, 255, 255, 0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  brandText: {
    color: '#14B896',
    letterSpacing: -0.3,
  },
  buttonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  pressed: {
    opacity: 0.7,
  },
  tabButtonView: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.one + 2,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.four,
    gap: 6,
  },
  tabButtonActive: {
    backgroundColor: 'rgba(32, 138, 239, 0.12)',
  },
  tabIcon: {
    marginTop: -1,
  },
  tabText: {
    fontSize: 13,
    letterSpacing: -0.1,
  },
});
