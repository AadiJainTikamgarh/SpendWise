import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Switch,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { SmsReviewModal } from '@/components/sms/sms-review-modal';
import { StatementImportModal } from '@/components/statement/statement-import-modal';
import { ScalePressable } from '@/components/ui/scale-pressable';
import { FontFamily, getScrollViewBottomPadding, MaxContentWidth, Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { useFinance } from '@/context/finance-context';
import { useAppTheme } from '@/hooks/use-theme';
import { generateCSV, generateJSONBackup, shareExport } from '@/services/export-service';
import { HapticsService } from '@/services/haptics';
import {
  getLastAutoSyncTimestamp,
  getSmsAutoSyncEnabled,
  setSmsAutoSyncEnabled,
  smsSyncService,
} from '@/services/sms';
import { BudgetPeriod } from '@/types/finance';
import { formatINR, paiseToRupees, parseCurrencyInput } from '@/utils/money';

export default function ProfileScreen() {
  const router = useRouter();
  const { theme, isDark, toggleTheme } = useAppTheme();
  const { user, signOut, deleteAccount } = useAuth();
  const { dailyBudget, monthlyBudget, saveBudget, resetAllData, transactions } = useFinance();

  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [isResettingApp, setIsResettingApp] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [editingPeriod, setEditingPeriod] = useState<BudgetPeriod | null>(null);
  const [budgetInput, setBudgetInput] = useState('');
  const [isSavingBudget, setIsSavingBudget] = useState(false);
  const [isSmsModalVisible, setIsSmsModalVisible] = useState(false);
  const [isStatementModalVisible, setIsStatementModalVisible] = useState(false);
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(true);
  const [lastSyncText, setLastSyncText] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    getSmsAutoSyncEnabled().then((enabled) => {
      if (isMounted) setAutoSyncEnabled(enabled);
    });
    getLastAutoSyncTimestamp().then((ts) => {
      if (isMounted && ts) {
        const minutesAgo = Math.round((Date.now() - ts) / 60000);
        if (minutesAgo < 1) setLastSyncText('Just now');
        else if (minutesAgo < 60) setLastSyncText(`${minutesAgo}m ago`);
        else setLastSyncText(`${Math.round(minutesAgo / 60)}h ago`);
      }
    });
    return () => {
      isMounted = false;
    };
  }, [autoSyncEnabled]);

  const handleToggleAutoSync = async (val: boolean) => {
    HapticsService.light();
    if (val) {
      const hasPerm = await smsSyncService.checkPermission();
      if (!hasPerm) {
        const res = await smsSyncService.requestPermission();
        if (res !== 'granted') {
          Alert.alert(
            'SMS Permission Required',
            'SpendWise needs SMS read permission to automatically detect bank and UPI debits in the background.',
            [{ text: 'OK' }]
          );
          return;
        }
      }
    }
    setAutoSyncEnabled(val);
    await setSmsAutoSyncEnabled(val);
  };

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
      HapticsService.success();
      setEditingPeriod(null);
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to save budget');
    } finally {
      setIsSavingBudget(false);
    }
  };

  const handleResetApp = () => {
    HapticsService.heavy();
    Alert.alert(
      'Reset App Data',
      'Are you sure you want to permanently delete all transactions, budgets, and financial records? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset Everything',
          style: 'destructive',
          onPress: async () => {
            setIsResettingApp(true);
            try {
              await resetAllData();
              HapticsService.success();
              Alert.alert('App Reset Complete', 'All transaction data and budgets have been wiped.');
            } catch (err: any) {
              Alert.alert('Error', err?.message || 'Failed to reset application data');
            } finally {
              setIsResettingApp(false);
            }
          },
        },
      ]
    );
  };

  const handleExportData = () => {
    HapticsService.light();
    if (!transactions || transactions.length === 0) {
      Alert.alert('No Data to Export', 'You have not recorded any transactions yet.');
      return;
    }

    Alert.alert(
      'Export Financial Data',
      `You have ${transactions.length} recorded transaction(s). Choose your preferred export format:`,
      [
        {
          text: 'Export as CSV (Excel/Sheets)',
          onPress: async () => {
            setIsExporting(true);
            try {
              const csv = generateCSV(transactions);
              const dateStr = new Date().toISOString().split('T')[0];
              await shareExport(csv, `SpendWise_Transactions_${dateStr}.csv`);
              HapticsService.success();
            } catch (err: any) {
              Alert.alert('Export Error', err?.message || 'Could not export CSV');
            } finally {
              setIsExporting(false);
            }
          },
        },
        {
          text: 'Export as JSON (Full Backup)',
          onPress: async () => {
            setIsExporting(true);
            try {
              const json = generateJSONBackup(transactions, {
                daily: dailyBudget,
                monthly: monthlyBudget,
              });
              const dateStr = new Date().toISOString().split('T')[0];
              await shareExport(json, `SpendWise_Backup_${dateStr}.json`);
              HapticsService.success();
            } catch (err: any) {
              Alert.alert('Export Error', err?.message || 'Could not export JSON');
            } finally {
              setIsExporting(false);
            }
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const handleLogout = () => {
    HapticsService.light();
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
    HapticsService.heavy();
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
            <ScalePressable
              style={[styles.settingsButton, { backgroundColor: theme.card, borderColor: theme.border }]}
              haptic="light"
              scaleTo={0.92}
              onPress={() => Alert.alert('Settings', 'SpendWise Version 1.0.0')}>
              <Ionicons name="settings-outline" size={20} color={theme.text} />
            </ScalePressable>
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
                onValueChange={() => {
                  HapticsService.medium();
                  toggleTheme();
                }}
                trackColor={{ false: theme.border, true: theme.primary }}
                thumbColor="#FFFFFF"
              />
            </View>

            {/* Spending Limits / Budgets */}
            <ScalePressable
              style={[styles.menuRow, { borderBottomColor: theme.border }]}
              haptic="selection"
              scaleTo={0.98}
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
            </ScalePressable>

            {/* Background SMS Auto-Sync Switch */}
            <View style={[styles.menuRow, { borderBottomColor: theme.border }]}>
              <View style={[styles.menuIconBox, { backgroundColor: '#10B98115' }]}>
                <Ionicons name="flash-outline" size={18} color="#10B981" />
              </View>
              <View style={styles.menuTextContainer}>
                <ThemedText style={styles.menuTitle}>Background SMS Auto-Sync</ThemedText>
                <ThemedText style={styles.menuSubtitle} themeColor="textSecondary">
                  Auto-detect bank debits when opening app
                  {lastSyncText ? ` • Synced ${lastSyncText}` : ''}
                </ThemedText>
              </View>
              <Switch
                value={autoSyncEnabled}
                onValueChange={handleToggleAutoSync}
                trackColor={{ false: theme.border, true: '#10B981' }}
                thumbColor="#FFFFFF"
              />
            </View>

            {/* Bank SMS Review & Manual Scan */}
            <ScalePressable
              style={[styles.menuRow, { borderBottomColor: theme.border }]}
              haptic="selection"
              scaleTo={0.98}
              onPress={() => setIsSmsModalVisible(true)}>
              <View style={[styles.menuIconBox, { backgroundColor: '#05966915' }]}>
                <Ionicons name="chatbox-ellipses-outline" size={18} color="#059669" />
              </View>
              <View style={styles.menuTextContainer}>
                <ThemedText style={styles.menuTitle}>Review & Deep Scan SMS</ThemedText>
                <ThemedText style={styles.menuSubtitle} themeColor="textSecondary">
                  Inspect inbox & select transactions
                </ThemedText>
              </View>
              <Ionicons name="chevron-forward" size={18} color={theme.textSecondary} />
            </ScalePressable>

            {/* Statement & Email Receipt Ingestion */}
            <ScalePressable
              style={[styles.menuRow, { borderBottomColor: theme.border }]}
              haptic="selection"
              scaleTo={0.98}
              onPress={() => setIsStatementModalVisible(true)}>
              <View style={[styles.menuIconBox, { backgroundColor: '#6366F115' }]}>
                <Ionicons name="receipt-outline" size={18} color="#6366F1" />
              </View>
              <View style={styles.menuTextContainer}>
                <ThemedText style={styles.menuTitle}>Statement & Email Ingest</ThemedText>
                <ThemedText style={styles.menuSubtitle} themeColor="textSecondary">
                  Import CSV, bank e-statements & receipts
                </ThemedText>
              </View>
              <Ionicons name="chevron-forward" size={18} color={theme.textSecondary} />
            </ScalePressable>

            {/* Privacy & Security */}
            <ScalePressable
              style={[styles.menuRow, { borderBottomColor: theme.border }]}
              haptic="light"
              scaleTo={0.98}
              onPress={() => Alert.alert('Privacy & Security', 'All financial data is stored locally with secure offline encryption.')}>
              <View style={[styles.menuIconBox, { backgroundColor: '#6366F115' }]}>
                <Ionicons name="shield-checkmark-outline" size={18} color="#6366F1" />
              </View>
              <View style={styles.menuTextContainer}>
                <ThemedText style={styles.menuTitle}>Privacy & Security</ThemedText>
              </View>
              <Ionicons name="chevron-forward" size={18} color={theme.textSecondary} />
            </ScalePressable>

            {/* Data & Export */}
            <ScalePressable
              style={[styles.menuRow, { borderBottomColor: theme.border }]}
              haptic="light"
              scaleTo={0.98}
              disabled={isExporting}
              onPress={handleExportData}>
              <View style={[styles.menuIconBox, { backgroundColor: '#0EA5E915' }]}>
                {isExporting ? (
                  <ActivityIndicator size="small" color="#0EA5E9" />
                ) : (
                  <Ionicons name="download-outline" size={18} color="#0EA5E9" />
                )}
              </View>
              <View style={styles.menuTextContainer}>
                <ThemedText style={styles.menuTitle}>Data & Export</ThemedText>
                <ThemedText style={styles.menuSubtitle} themeColor="textSecondary">
                  {transactions?.length ? `${transactions.length} transactions (CSV / JSON)` : 'Export transactions'}
                </ThemedText>
              </View>
              <Ionicons name="chevron-forward" size={18} color={theme.textSecondary} />
            </ScalePressable>

            {/* Feedback & Feature Request */}
            <ScalePressable
              style={[styles.menuRow, { borderBottomColor: theme.border }]}
              haptic="light"
              scaleTo={0.98}
              onPress={() => router.push('/feedback' as any)}>
              <View style={[styles.menuIconBox, { backgroundColor: '#F59E0B15' }]}>
                <Ionicons name="chatbubbles-outline" size={18} color="#F59E0B" />
              </View>
              <View style={styles.menuTextContainer}>
                <ThemedText style={styles.menuTitle}>Feedback & Feature Request</ThemedText>
                <ThemedText style={styles.menuSubtitle} themeColor="textSecondary">
                  Share ideas, request features & report bugs
                </ThemedText>
              </View>
              <Ionicons name="chevron-forward" size={18} color={theme.textSecondary} />
            </ScalePressable>

            {/* About SpendWise */}
            <ScalePressable
              style={styles.menuRow}
              haptic="light"
              scaleTo={0.98}
              onPress={() => Alert.alert('About SpendWise', 'SpendWise: Know where your money goes — and take control of where it goes next.')}>
              <View style={[styles.menuIconBox, { backgroundColor: '#8B5CF615' }]}>
                <Ionicons name="information-circle-outline" size={18} color="#8B5CF6" />
              </View>
              <View style={styles.menuTextContainer}>
                <ThemedText style={styles.menuTitle}>About SpendWise</ThemedText>
              </View>
              <Ionicons name="chevron-forward" size={18} color={theme.textSecondary} />
            </ScalePressable>
          </View>

          {/* Reset App Data Card */}
          <ScalePressable
            style={[
              styles.resetAppCard,
              {
                backgroundColor: theme.card,
                borderColor: `${theme.expense}30`,
              },
            ]}
            haptic="heavy"
            scaleTo={0.97}
            onPress={handleResetApp}
            disabled={isResettingApp || isLoggingOut || isDeletingAccount}>
            {isResettingApp ? (
              <ActivityIndicator color={theme.expense} />
            ) : (
              <>
                <Ionicons name="refresh-circle-outline" size={20} color={theme.expense} style={{ marginRight: 10 }} />
                <ThemedText style={[styles.resetAppText, { color: theme.expense }]}>
                  Reset App Data
                </ThemedText>
              </>
            )}
          </ScalePressable>

          {/* Sign Out Card */}
          <ScalePressable
            style={[styles.signOutCard, { backgroundColor: theme.card, borderColor: theme.border }]}
            haptic="medium"
            scaleTo={0.97}
            onPress={handleLogout}
            disabled={isLoggingOut || isDeletingAccount || isResettingApp}>
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
          </ScalePressable>

          {/* Delete Account Card (Below Sign Out) */}
          <ScalePressable
            style={[
              styles.deleteAccountCard,
              {
                borderColor: `${theme.expense}40`,
                backgroundColor: isDark ? '#2D1414' : '#FEF2F2',
              },
            ]}
            haptic="heavy"
            scaleTo={0.97}
            onPress={handleDeleteAccount}
            disabled={isDeletingAccount || isLoggingOut || isResettingApp}>
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
          </ScalePressable>
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
                <ScalePressable
                  style={[styles.modalBtn, { borderColor: theme.border, borderWidth: 1 }]}
                  haptic="light"
                  scaleTo={0.96}
                  onPress={() => setEditingPeriod(null)}>
                  <ThemedText style={styles.modalBtnText}>Cancel</ThemedText>
                </ScalePressable>

                <ScalePressable
                  style={[styles.modalBtn, { backgroundColor: theme.primary }]}
                  haptic="medium"
                  scaleTo={0.96}
                  onPress={handleSaveBudget}
                  disabled={isSavingBudget}>
                  {isSavingBudget ? (
                    <ActivityIndicator color="#ffffff" size="small" />
                  ) : (
                    <ThemedText style={[styles.modalBtnText, { color: '#ffffff' }]}>Save</ThemedText>
                  )}
                </ScalePressable>
              </View>
            </View>
          </View>
        </Modal>

        <SmsReviewModal visible={isSmsModalVisible} onClose={() => setIsSmsModalVisible(false)} />
        <StatementImportModal
          visible={isStatementModalVisible}
          onClose={() => setIsStatementModalVisible(false)}
        />
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
  resetAppCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
  },
  resetAppText: {
    fontFamily: FontFamily.bold,
    fontSize: 15,
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
