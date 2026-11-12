import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Linking,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ScalePressable } from '@/components/ui/scale-pressable';
import { FontFamily, Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { useFinance } from '@/context/finance-context';
import { useTheme } from '@/hooks/use-theme';
import { HapticsService } from '@/services/haptics';
import { ParsedSmsTransaction, smsSyncService } from '@/services/sms';
import { formatDateLabel } from '@/utils/date';
import { formatINR } from '@/utils/money';

interface SmsReviewModalProps {
  visible: boolean;
  onClose: () => void;
}

export function SmsReviewModal({ visible, onClose }: SmsReviewModalProps) {
  const theme = useTheme();
  const { user } = useAuth();
  const { refreshData } = useFinance();

  const [isScanning, setIsScanning] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [hasScanned, setHasScanned] = useState(false);
  const [daysBack, setDaysBack] = useState<number>(30);
  const [candidates, setCandidates] = useState<ParsedSmsTransaction[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [duplicateCount, setDuplicateCount] = useState(0);

  const handleStartScan = async () => {
    if (Platform.OS !== 'android') {
      Alert.alert(
        'Platform Not Supported',
        'Direct SMS scanning is only available on Android devices. On iOS or Web, please use manual transaction entry or statement import.'
      );
      return;
    }

    setIsScanning(true);
    try {
      const result = await smsSyncService.scanInbox({ daysBack });

      if (!result.isModuleAvailable) {
        Alert.alert(
          'Rebuild Required',
          'Native SMS reader requires a local development build.\n\nIf you are running in Expo Go or haven\'t rebuilt the APK since adding SMS features, please run:\n\nnpm run android\n\n(Custom native modules and SMS permissions cannot run inside standard Expo Go).'
        );
        return;
      }

      if (!result.hasPermission) {
        if (result.permissionStatus === 'never_ask_again') {
          Alert.alert(
            'SMS Permission Required',
            'SpendWise needs SMS access to automatically detect bank transactions. Permission is currently blocked in your system settings. Would you like to open Settings to enable it?',
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Open Settings', onPress: () => Linking.openSettings() },
            ]
          );
        } else {
          Alert.alert(
            'Permission Denied',
            'SMS read permission was not granted. Please tap "Scan SMS Inbox" again and tap "Allow" when the Android system dialog appears.'
          );
        }
        return;
      }

      setCandidates(result.uniqueTransactions);
      setDuplicateCount(result.duplicateTransactions.length);
      setSelectedIds(new Set(result.uniqueTransactions.map((t) => t.id)));
      setHasScanned(true);
    } catch (err: any) {
      Alert.alert('Scan Failed', err?.message || 'Could not scan SMS inbox');
    } finally {
      setIsScanning(false);
    }
  };

  const toggleSelect = (id: string) => {
    HapticsService.selection();
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    HapticsService.selection();
    if (selectedIds.size === candidates.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(candidates.map((t) => t.id)));
    }
  };

  const handleImport = async () => {
    const toImport = candidates.filter((c) => selectedIds.has(c.id));
    if (toImport.length === 0) {
      Alert.alert('No Transactions Selected', 'Please select at least one transaction to import.');
      return;
    }

    setIsImporting(true);
    try {
      await smsSyncService.importSelectedTransactions(toImport, user?.id);
      await refreshData();
      HapticsService.success();
      Alert.alert(
        'Import Complete',
        `Successfully imported ${toImport.length} transaction${toImport.length > 1 ? 's' : ''} into SpendWise!`,
        [
          {
            text: 'OK',
            onPress: () => {
              setHasScanned(false);
              setCandidates([]);
              onClose();
            },
          },
        ]
      );
    } catch (err: any) {
      Alert.alert('Import Error', err?.message || 'Failed to import transactions');
    } finally {
      setIsImporting(false);
    }
  };

  const totalPaiseSelected = candidates
    .filter((c) => selectedIds.has(c.id) && c.type === 'expense')
    .reduce((acc, c) => acc + c.amount, 0);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: theme.border }]}>
          <View style={styles.headerTitleRow}>
            <View style={[styles.iconCircle, { backgroundColor: `${theme.primary}20` }]}>
              <Ionicons name="chatbox-ellipses-outline" size={20} color={theme.primary} />
            </View>
            <View>
              <ThemedText style={styles.title}>Bank SMS Sync</ThemedText>
              <ThemedText style={styles.subtitle} themeColor="textSecondary">
                Auto-detect UPI & card transactions
              </ThemedText>
            </View>
          </View>
          <Pressable onPress={onClose} style={[styles.closeButton, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Ionicons name="close" size={20} color={theme.text} />
          </Pressable>
        </View>

        {!hasScanned ? (
          /* Pre-scan / Configuration Screen */
          <View style={styles.preScanContainer}>
            <View style={[styles.infoCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <Ionicons name="shield-checkmark" size={32} color="#10B981" style={{ marginBottom: 12 }} />
              <ThemedText style={styles.infoTitle}>Private & Local</ThemedText>
              <ThemedText style={styles.infoText} themeColor="textSecondary">
                SpendWise only scans bank transactional SMS (HDFC, SBI, ICICI, UPI, etc.). OTPs and personal messages are completely ignored and never stored.
              </ThemedText>
            </View>

            <ThemedText style={styles.sectionHeading}>Scan Duration</ThemedText>
            <View style={styles.daysSelectorRow}>
              {[7, 30, 90].map((days) => (
                <ScalePressable
                  key={days}
                  scaleTo={0.94}
                  haptic="selection"
                  style={[
                    styles.dayPill,
                    {
                      backgroundColor: daysBack === days ? theme.primary : theme.card,
                      borderColor: daysBack === days ? theme.primary : theme.border,
                    },
                  ]}
                  onPress={() => setDaysBack(days)}>
                  <ThemedText
                    style={[
                      styles.dayPillText,
                      { color: daysBack === days ? '#FFFFFF' : theme.text },
                    ]}>
                    Last {days} Days
                  </ThemedText>
                </ScalePressable>
              ))}
            </View>

            <View style={{ flex: 1 }} />

            <ScalePressable
              scaleTo={0.97}
              haptic="medium"
              style={[styles.primaryButton, { backgroundColor: theme.primary }]}
              onPress={handleStartScan}
              disabled={isScanning}>
              {isScanning ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="scan-outline" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
                  <ThemedText style={styles.primaryButtonText}>Scan SMS Inbox</ThemedText>
                </>
              )}
            </ScalePressable>
          </View>
        ) : (
          /* Results Review Screen */
          <View style={styles.resultsContainer}>
            {/* Summary Bar */}
            <View style={[styles.summaryBar, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <View style={styles.summaryInfo}>
                <ThemedText style={styles.summaryCount}>
                  {candidates.length} New Transactions
                </ThemedText>
                {duplicateCount > 0 && (
                  <ThemedText style={styles.duplicateLabel} themeColor="textSecondary">
                    ({duplicateCount} existing ignored)
                  </ThemedText>
                )}
              </View>
              {candidates.length > 0 && (
                <Pressable onPress={toggleSelectAll} style={styles.selectAllButton}>
                  <ThemedText style={[styles.selectAllText, { color: theme.primary }]}>
                    {selectedIds.size === candidates.length ? 'Deselect All' : 'Select All'}
                  </ThemedText>
                </Pressable>
              )}
            </View>

            {candidates.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="checkmark-circle-outline" size={48} color={theme.textSecondary} />
                <ThemedText style={styles.emptyTitle}>All Caught Up!</ThemedText>
                <ThemedText style={styles.emptySubtitle} themeColor="textSecondary">
                  No unrecorded bank transactions found in the last {daysBack} days.
                </ThemedText>
                <Pressable
                  style={[styles.secondaryButton, { borderColor: theme.border, marginTop: 16 }]}
                  onPress={() => setHasScanned(false)}>
                  <ThemedText style={styles.secondaryButtonText}>Scan Again</ThemedText>
                </Pressable>
              </View>
            ) : (
              <FlatList
                data={candidates}
                keyExtractor={(item) => item.id}
                contentContainerStyle={{ paddingBottom: 100 }}
                renderItem={({ item }) => {
                  const isSelected = selectedIds.has(item.id);
                  const isExpense = item.type === 'expense';
                  return (
                    <ScalePressable
                      scaleTo={0.98}
                      haptic="selection"
                      style={[
                        styles.transactionRow,
                        {
                          backgroundColor: theme.card,
                          borderColor: isSelected ? theme.primary : theme.border,
                        },
                      ]}
                      onPress={() => toggleSelect(item.id)}>
                      {/* Checkbox */}
                      <View
                        style={[
                          styles.checkbox,
                          {
                            borderColor: isSelected ? theme.primary : theme.border,
                            backgroundColor: isSelected ? theme.primary : 'transparent',
                          },
                        ]}>
                        {isSelected && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
                      </View>

                      {/* Details */}
                      <View style={styles.itemDetails}>
                        <ThemedText style={styles.itemTitle} numberOfLines={1}>
                          {item.title}
                        </ThemedText>
                        <View style={styles.badgeRow}>
                          <View style={[styles.bankBadge, { backgroundColor: `${theme.primary}15` }]}>
                            <ThemedText style={[styles.badgeText, { color: theme.primary }]}>
                              {item.bankName} {item.accountLast4 ? `*${item.accountLast4}` : ''}
                            </ThemedText>
                          </View>
                          {item.suggestedCategory && (
                            <View
                              style={[
                                styles.bankBadge,
                                { backgroundColor: `${item.suggestedCategory.color}20` },
                              ]}>
                              <ThemedText
                                style={[styles.badgeText, { color: item.suggestedCategory.color }]}>
                                {item.suggestedCategory.name}
                              </ThemedText>
                            </View>
                          )}
                        </View>
                        <ThemedText style={styles.itemDate} themeColor="textSecondary">
                          {formatDateLabel(item.date)}
                        </ThemedText>
                      </View>

                      {/* Amount */}
                      <View style={styles.amountCol}>
                        <ThemedText
                          style={[
                            styles.itemAmount,
                            { color: isExpense ? theme.expense : theme.income },
                          ]}>
                          {isExpense ? '-' : '+'} {formatINR(item.amount)}
                        </ThemedText>
                      </View>
                    </ScalePressable>
                  );
                }}
              />
            )}

            {/* Bottom Actions */}
            {candidates.length > 0 && (
              <View style={[styles.footer, { backgroundColor: theme.card, borderTopColor: theme.border }]}>
                <View style={styles.footerInfo}>
                  <ThemedText style={styles.footerLabel} themeColor="textSecondary">
                    Selected: {selectedIds.size}
                  </ThemedText>
                  <ThemedText style={styles.footerTotal}>
                    {formatINR(totalPaiseSelected)}
                  </ThemedText>
                </View>
                <ScalePressable
                  scaleTo={0.97}
                  haptic="medium"
                  style={[
                    styles.primaryButton,
                    styles.importButton,
                    { backgroundColor: theme.primary, opacity: selectedIds.size === 0 ? 0.5 : 1 },
                  ]}
                  onPress={handleImport}
                  disabled={isImporting || selectedIds.size === 0}>
                  {isImporting ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <ThemedText style={styles.primaryButtonText}>
                      Import Selected ({selectedIds.size})
                    </ThemedText>
                  )}
                </ScalePressable>
              </View>
            )}
          </View>
        )}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 18,
    fontFamily: FontFamily.bold,
  },
  subtitle: {
    fontSize: 12,
    fontFamily: FontFamily.regular,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  preScanContainer: {
    flex: 1,
    padding: Spacing.four,
  },
  infoCard: {
    padding: Spacing.four,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: Spacing.four,
    alignItems: 'center',
  },
  infoTitle: {
    fontSize: 16,
    fontFamily: FontFamily.bold,
    marginBottom: 6,
  },
  infoText: {
    fontSize: 13,
    fontFamily: FontFamily.regular,
    textAlign: 'center',
    lineHeight: 20,
  },
  sectionHeading: {
    fontSize: 14,
    fontFamily: FontFamily.semiBold,
    marginBottom: 10,
  },
  daysSelectorRow: {
    flexDirection: 'row',
    gap: 12,
  },
  dayPill: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  dayPillText: {
    fontSize: 13,
    fontFamily: FontFamily.medium,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    borderRadius: 14,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontFamily: FontFamily.bold,
  },
  resultsContainer: {
    flex: 1,
  },
  summaryBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  summaryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  summaryCount: {
    fontSize: 14,
    fontFamily: FontFamily.bold,
  },
  duplicateLabel: {
    fontSize: 12,
    fontFamily: FontFamily.regular,
  },
  selectAllButton: {
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  selectAllText: {
    fontSize: 13,
    fontFamily: FontFamily.semiBold,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.five,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: FontFamily.bold,
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 13,
    fontFamily: FontFamily.regular,
    textAlign: 'center',
    marginTop: 6,
  },
  secondaryButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
    borderWidth: 1,
  },
  secondaryButtonText: {
    fontSize: 14,
    fontFamily: FontFamily.medium,
  },
  transactionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.three,
    marginHorizontal: Spacing.three,
    marginTop: Spacing.two,
    borderRadius: 14,
    borderWidth: 1,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  itemDetails: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 15,
    fontFamily: FontFamily.bold,
    marginBottom: 4,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 4,
  },
  bankBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 11,
    fontFamily: FontFamily.medium,
  },
  itemDate: {
    fontSize: 12,
    fontFamily: FontFamily.regular,
  },
  amountCol: {
    alignItems: 'flex-end',
    marginLeft: 8,
  },
  itemAmount: {
    fontSize: 15,
    fontFamily: FontFamily.bold,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  footerInfo: {
    flex: 1,
  },
  footerLabel: {
    fontSize: 11,
    fontFamily: FontFamily.medium,
  },
  footerTotal: {
    fontSize: 18,
    fontFamily: FontFamily.bold,
  },
  importButton: {
    paddingHorizontal: 20,
  },
});
