import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { FontFamily, getScrollViewBottomPadding, MaxContentWidth, Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { useFinance } from '@/context/finance-context';
import { useAppTheme } from '@/hooks/use-theme';
import { BudgetPeriod } from '@/types/finance';
import { formatINR, paiseToRupees, parseCurrencyInput } from '@/utils/money';

export default function ProfileScreen() {
  const { theme, isDark, toggleTheme } = useAppTheme();
  const { user, signOut, deleteAccount } = useAuth();
  const { dailyBudget, monthlyBudget, saveBudget } = useFinance();

  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [editingPeriod, setEditingPeriod] = useState<BudgetPeriod | null>(null);
  const [budgetInput, setBudgetInput] = useState('');
  const [isSavingBudget, setIsSavingBudget] = useState(false);

  const displayName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User';
  const email = user?.email || 'Not signed in';
  const userInitials = displayName
    .split(' ')
    .filter(Boolean)
    .map((w: string) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'U';

  const handleOpenBudgetModal = (period: BudgetPeriod) => {
    setEditingPeriod(period);
    const existing = period === 'daily' ? dailyBudget : monthlyBudget;
    setBudgetInput(existing ? paiseToRupees(existing.amount).toString() : '');
  };

  const handleSaveBudget = async () => {
    if (!editingPeriod) return;
    const paise = parseCurrencyInput(budgetInput);

    setIsSavingBudget(true);
    try {
      await saveBudget(editingPeriod, paise);
      setEditingPeriod(null);
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to save budget');
    } finally {
      setIsSavingBudget(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out of SpendWise?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          setIsLoggingOut(true);
          try {
            await signOut();
          } catch (err: any) {
            Alert.alert('Error', err?.message || 'Failed to log out');
            setIsLoggingOut(false);
          }
        },
      },
    ]);
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'Are you sure you want to permanently delete your account and all data? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setIsDeletingAccount(true);
            try {
              await deleteAccount();
            } catch (err: any) {
              Alert.alert('Error', err?.message || 'Failed to delete account');
              setIsDeletingAccount(false);
            }
          },
        },
      ]
    );
  };

  const insets = useSafeAreaInsets();
  const bottomScrollPadding = getScrollViewBottomPadding(insets.bottom);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomScrollPadding }]}
          showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.header}>
            <ThemedText style={styles.headerTitle}>Profile</ThemedText>
            <Pressable
              style={[styles.settingsButton, { backgroundColor: theme.card, borderColor: theme.border }]}
              onPress={() => Alert.alert('Settings', 'SpendWise Version 1.0.0')}>
              <Ionicons name="settings-outline" size={20} color={theme.text} />
            </Pressable>
          </View>

          {/* User Profile Card */}
          <View style={[styles.profileCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={[styles.avatarCircle, { backgroundColor: theme.primary }]}>
              <ThemedText style={styles.avatarInitials}>{userInitials}</ThemedText>
            </View>

            <View style={styles.userInfo}>
              <ThemedText style={styles.userName}>{displayName}</ThemedText>
              <ThemedText style={styles.userEmail} themeColor="textSecondary">
                {email}
              </ThemedText>
            </View>

            <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
          </View>

          {/* Settings Menu Items Group */}
          <View style={[styles.menuGroup, { backgroundColor: theme.card, borderColor: theme.border }]}>
            {/* Dark Mode Switch Row */}
            <View style={[styles.menuRow, { borderBottomColor: theme.border }]}>
              <View style={[styles.menuIconBox, { backgroundColor: isDark ? '#6366F120' : '#F59E0B20' }]}>
                <Ionicons
                  name={isDark ? 'moon' : 'sunny'}
                  size={18}
                  color={isDark ? '#818CF8' : '#F59E0B'}
                />
              </View>
              <View style={styles.menuTextContainer}>
                <ThemedText style={styles.menuTitle}>Dark Mode</ThemedText>
                <ThemedText style={styles.menuSubtitle} themeColor="textSecondary">
                  {isDark ? 'Dark theme enabled' : 'Light theme enabled'}
                </ThemedText>
              </View>
              <Switch
                value={isDark}
                onValueChange={toggleTheme}
                trackColor={{ false: theme.border, true: theme.primary }}
                thumbColor="#FFFFFF"
              />
            </View>

            {/* Spending Limits / Budgets */}
            <Pressable
              style={[styles.menuRow, { borderBottomColor: theme.border }]}
              onPress={() => handleOpenBudgetModal('daily')}>
              <View style={[styles.menuIconBox, { backgroundColor: `${theme.primaryDark}15` }]}>
                <Ionicons name="wallet-outline" size={18} color={theme.primary} />
              </View>
              <View style={styles.menuTextContainer}>
                <ThemedText style={styles.menuTitle}>Budget & Limits</ThemedText>
                <ThemedText style={styles.menuSubtitle} themeColor="textSecondary">
                  {dailyBudget ? `Daily limit: ${formatINR(dailyBudget.amount)}` : 'Set daily/monthly limits'}
                </ThemedText>
              </View>
              <Ionicons name="chevron-forward" size={18} color={theme.textSecondary} />
            </Pressable>

            {/* Privacy & Security */}
            <Pressable
              style={[styles.menuRow, { borderBottomColor: theme.border }]}
              onPress={() => Alert.alert('Privacy & Security', 'All financial data is stored locally with secure offline encryption.')}>
              <View style={[styles.menuIconBox, { backgroundColor: '#6366F115' }]}>
                <Ionicons name="shield-checkmark-outline" size={18} color="#6366F1" />
              </View>
              <View style={styles.menuTextContainer}>
                <ThemedText style={styles.menuTitle}>Privacy & Security</ThemedText>
              </View>
              <Ionicons name="chevron-forward" size={18} color={theme.textSecondary} />
            </Pressable>

            {/* Data & Export */}
            <Pressable
              style={[styles.menuRow, { borderBottomColor: theme.border }]}
              onPress={() => Alert.alert('Data & Export', 'CSV and JSON data export')}>
              <View style={[styles.menuIconBox, { backgroundColor: '#0EA5E915' }]}>
                <Ionicons name="download-outline" size={18} color="#0EA5E9" />
              </View>
              <View style={styles.menuTextContainer}>
                <ThemedText style={styles.menuTitle}>Data & Export</ThemedText>
              </View>
              <Ionicons name="chevron-forward" size={18} color={theme.textSecondary} />
            </Pressable>

            {/* About SpendWise */}
            <Pressable
              style={styles.menuRow}
              onPress={() => Alert.alert('About SpendWise', 'SpendWise: Know where your money goes — and take control of where it goes next.')}>
              <View style={[styles.menuIconBox, { backgroundColor: '#8B5CF615' }]}>
                <Ionicons name="information-circle-outline" size={18} color="#8B5CF6" />
              </View>
              <View style={styles.menuTextContainer}>
                <ThemedText style={styles.menuTitle}>About SpendWise</ThemedText>
              </View>
              <Ionicons name="chevron-forward" size={18} color={theme.textSecondary} />
            </Pressable>
          </View>

          {/* Sign Out Card */}
          <Pressable
            style={[styles.signOutCard, { backgroundColor: theme.card, borderColor: theme.border }]}
            onPress={handleLogout}
            disabled={isLoggingOut || isDeletingAccount}>
            {isLoggingOut ? (
              <ActivityIndicator color={theme.expense} />
            ) : (
              <>
                <Ionicons name="log-out-outline" size={20} color={theme.expense} style={{ marginRight: 10 }} />
                <ThemedText style={[styles.signOutText, { color: theme.expense }]}>
                  Sign Out
                </ThemedText>
              </>
            )}
          </Pressable>

          {/* Delete Account Card (Below Sign Out) */}
          <Pressable
            style={[
              styles.deleteAccountCard,
              {
                borderColor: `${theme.expense}40`,
                backgroundColor: isDark ? '#2D1414' : '#FEF2F2',
              },
            ]}
            onPress={handleDeleteAccount}
            disabled={isDeletingAccount || isLoggingOut}>
            {isDeletingAccount ? (
              <ActivityIndicator color={theme.expense} />
            ) : (
              <>
                <Ionicons name="trash-outline" size={18} color={theme.expense} style={{ marginRight: 8 }} />
                <ThemedText style={[styles.deleteAccountText, { color: theme.expense }]}>
                  Delete Account
                </ThemedText>
              </>
            )}
          </Pressable>
        </ScrollView>

        {/* Budget Setting Modal Sheet */}
        <Modal
          visible={editingPeriod !== null}
          transparent
          animationType="fade"
          onRequestClose={() => setEditingPeriod(null)}>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <ThemedText style={styles.modalTitle}>
                {editingPeriod === 'daily' ? 'Set Daily Budget' : 'Set Monthly Budget'}
              </ThemedText>
              <ThemedText style={styles.modalSubtitle} themeColor="textSecondary">
                Enter spending limit in INR (₹)
              </ThemedText>

              <TextInput
                style={[styles.budgetModalInput, { color: theme.text, borderColor: theme.border }]}
                keyboardType="numeric"
                placeholder="₹ e.g. 1500"
                placeholderTextColor={theme.textSecondary}
                value={budgetInput}
                onChangeText={setBudgetInput}
                autoFocus
              />

              <View style={styles.modalActionsRow}>
                <Pressable
                  style={[styles.modalBtn, { borderColor: theme.border, borderWidth: 1 }]}
                  onPress={() => setEditingPeriod(null)}>
                  <ThemedText style={styles.modalBtnText}>Cancel</ThemedText>
                </Pressable>

                <Pressable
                  style={[styles.modalBtn, { backgroundColor: theme.primary }]}
                  onPress={handleSaveBudget}
                  disabled={isSavingBudget}>
                  {isSavingBudget ? (
                    <ActivityIndicator color="#ffffff" size="small" />
                  ) : (
                    <ThemedText style={[styles.modalBtnText, { color: '#ffffff' }]}>Save</ThemedText>
                  )}
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    flexDirection: 'row',
  },
  safeArea: {
    flex: 1,
    maxWidth: MaxContentWidth,
    width: '100%',
  },
  scrollContent: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.two,
    paddingBottom: 120,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.three,
  },
  headerTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 24,
  },
  settingsButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: Spacing.four,
  },
  avatarCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  avatarInitials: {
    fontFamily: FontFamily.bold,
    fontSize: 18,
    color: '#ffffff',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontFamily: FontFamily.bold,
    fontSize: 17,
    marginBottom: 2,
  },
  userEmail: {
    fontFamily: FontFamily.regular,
    fontSize: 13,
  },
  menuGroup: {
    borderRadius: 20,
    borderWidth: 1,
    paddingVertical: 4,
    marginBottom: Spacing.four,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  menuIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  menuTextContainer: {
    flex: 1,
  },
  menuTitle: {
    fontFamily: FontFamily.semiBold,
    fontSize: 15,
  },
  menuSubtitle: {
    fontFamily: FontFamily.regular,
    fontSize: 12,
    marginTop: 2,
  },
  signOutCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
  },
  signOutText: {
    fontFamily: FontFamily.bold,
    fontSize: 15,
  },
  deleteAccountCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: Spacing.four,
  },
  deleteAccountText: {
    fontFamily: FontFamily.bold,
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
  },
  modalTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 18,
    marginBottom: 4,
  },
  modalSubtitle: {
    fontFamily: FontFamily.regular,
    fontSize: 13,
    marginBottom: 16,
  },
  budgetModalInput: {
    fontFamily: FontFamily.bold,
    fontSize: 20,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 20,
  },
  modalActionsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBtnText: {
    fontFamily: FontFamily.bold,
    fontSize: 14,
  },
});
