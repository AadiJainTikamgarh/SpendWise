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
  ScrollView,
  StyleSheet,
  TextInput,
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

type SyncTab = 'scan' | 'paste';

const SAMPLE_UNION_BANK_SMS =
  'Union Bank of India A/c*1650 Dr Rs5.00 on 12-11-26 11:00 by MB 631664057015 Fv.VER S, Bal Rs331.57 Not U?Call 18002333/SMS BLOCK 1650 to 8879635472';

const SAMPLE_HDFC_SMS =
  'Rs 1,299.00 was spent on your HDFC Bank Card 5678 at AMAZON on 10-NOV-26. Bal: Rs 34,000.';

export function SmsReviewModal({ visible, onClose }: SmsReviewModalProps) {
  const theme = useTheme();
  const { user } = useAuth();
  const { refreshData } = useFinance();

  const [activeTab, setActiveTab] = useState<SyncTab>('scan');
  const [isScanning, setIsScanning] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [hasScanned, setHasScanned] = useState(false);
  const [daysBack, setDaysBack] = useState<number>(30);
  const [pastedText, setPastedText] = useState('');

  const [candidates, setCandidates] = useState<ParsedSmsTransaction[]>([]);
  const [duplicates, setDuplicates] = useState<ParsedSmsTransaction[]>([]);
  const [showDuplicates, setShowDuplicates] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const handleStartScan = async () => {
    if (Platform.OS !== 'android') {
      Alert.alert(
        'Platform Not Supported for Direct Inbox Scan',
        'Direct background inbox scanning requires Android telephony permissions. On iOS, Web, or Expo Go, please use the "Paste Bank SMS" tab to parse your messages instantly!'
      );
      return;
    }

    setIsScanning(true);
    try {
      const result = await smsSyncService.scanInbox({
        daysBack,
        maxCount: daysBack >= 90 ? 5000 : daysBack >= 30 ? 2000 : 800,
      });

      if (!result.isModuleAvailable) {
        Alert.alert(
          'Native Module Unavailable (Expo Go)',
          'Direct SMS reading requires custom native Android code.\n\nIf you are using Expo Go, direct inbox access is blocked by Expo Go restrictions. You can switch to the "Paste Bank SMS" tab above to import your SMS transactions instantly!'
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
      setDuplicates(result.duplicateTransactions);
      setSelectedIds(new Set(result.uniqueTransactions.map((t) => t.id)));
      setHasScanned(true);
    } catch (err: any) {
      Alert.alert('Scan Failed', err?.message || 'Could not scan SMS inbox');
    } finally {
      setIsScanning(false);
    }
  };

  const handleParsePastedSms = async () => {
    if (!pastedText.trim()) {
      Alert.alert('Empty Input', 'Please paste one or more bank SMS messages into the text box.');
      return;
    }

    setIsScanning(true);
    try {
      const result = await smsSyncService.parsePastedSms(pastedText);

      if (result.uniqueTransactions.length === 0 && result.duplicateTransactions.length === 0) {
        Alert.alert(
          'No Transactions Recognized',
          'Could not find valid bank debit/credit patterns or transaction amounts in the text provided.\n\nPlease ensure the text contains a recognized bank, amount (e.g. "Dr Rs5.00" or "debited by Rs 500"), and account or reference number.'
        );
        return;
      }

      setCandidates(result.uniqueTransactions);
      setDuplicates(result.duplicateTransactions);
      setSelectedIds(new Set(result.uniqueTransactions.map((t) => t.id)));
      setHasScanned(true);
      HapticsService.success();
    } catch (err: any) {
      Alert.alert('Parse Failed', err?.message || 'Could not parse SMS text');
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

  const displayList = showDuplicates ? [...candidates, ...duplicates] : candidates;

  const toggleSelectAll = () => {
    HapticsService.selection();
    if (selectedIds.size === displayList.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(displayList.map((t) => t.id)));
    }
  };

  const handleImport = async () => {
    const toImport = displayList.filter((c) => selectedIds.has(c.id));
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
              setDuplicates([]);
              setPastedText('');
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

  const totalPaiseSelected = displayList
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
                Auto-detect Union Bank, SBI, HDFC & UPI debits
              </ThemedText>
            </View>
          </View>
          <Pressable onPress={onClose} style={[styles.closeButton, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Ionicons name="close" size={20} color={theme.text} />
          </Pressable>
        </View>

        {/* Tab Switcher (Inbox Scan vs Paste SMS) */}
        {!hasScanned && (
          <View style={[styles.tabBar, { borderBottomColor: theme.border, backgroundColor: theme.card }]}>
            <Pressable
              style={[
                styles.tabButton,
                activeTab === 'scan' && { borderBottomColor: theme.primary, borderBottomWidth: 2 },
              ]}
              onPress={() => setActiveTab('scan')}>
              <Ionicons
                name="phone-portrait-outline"
                size={16}
                color={activeTab === 'scan' ? theme.primary : theme.textSecondary}
              />
              <ThemedText
                style={[
                  styles.tabText,
                  { color: activeTab === 'scan' ? theme.primary : theme.textSecondary },
                ]}>
                Device Inbox Scan
              </ThemedText>
            </Pressable>
            <Pressable
              style={[
                styles.tabButton,
                activeTab === 'paste' && { borderBottomColor: theme.primary, borderBottomWidth: 2 },
              ]}
              onPress={() => setActiveTab('paste')}>
              <Ionicons
                name="clipboard-outline"
                size={16}
                color={activeTab === 'paste' ? theme.primary : theme.textSecondary}
              />
              <ThemedText
                style={[
                  styles.tabText,
                  { color: activeTab === 'paste' ? theme.primary : theme.textSecondary },
                ]}>
                Paste Bank SMS
              </ThemedText>
            </Pressable>
          </View>
        )}

        {!hasScanned ? (
          activeTab === 'scan' ? (
            /* Tab 1: Device Inbox Scan */
            <ScrollView contentContainerStyle={styles.preScanContainer}>
              <View style={[styles.infoCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <Ionicons name="shield-checkmark" size={32} color="#10B981" style={{ marginBottom: 12 }} />
                <ThemedText style={styles.infoTitle}>Private & Local</ThemedText>
                <ThemedText style={styles.infoText} themeColor="textSecondary">
                  SpendWise scans local bank transactional SMS (Union Bank, SBI, HDFC, ICICI, etc.). OTPs and personal messages are completely ignored and never leave your device.
                </ThemedText>
              </View>

              <ThemedText style={styles.sectionHeading}>Scan Duration</ThemedText>
              <View style={styles.daysSelectorRow}>
                {[7, 30, 60, 90, 180].map((days) => (
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
                      {days}d
                    </ThemedText>
                  </ScalePressable>
                ))}
              </View>

              <View style={{ height: 24 }} />

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
                    <ThemedText style={styles.primaryButtonText}>Scan SMS Inbox ({daysBack} Days)</ThemedText>
                  </>
                )}
              </ScalePressable>
            </ScrollView>
          ) : (
            /* Tab 2: Paste Bank SMS */
            <ScrollView contentContainerStyle={styles.preScanContainer} keyboardShouldPersistTaps="handled">
              <View style={[styles.infoCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <Ionicons name="clipboard" size={28} color="#6366F1" style={{ marginBottom: 8 }} />
                <ThemedText style={styles.infoTitle}>Paste Any Bank SMS</ThemedText>
                <ThemedText style={styles.infoText} themeColor="textSecondary">
                  Copy any transactional SMS from Union Bank, SBI, HDFC, etc., and paste it here. Works everywhere (including Expo Go and iOS).
                </ThemedText>
              </View>

              <View style={styles.templateHeaderRow}>
                <ThemedText style={styles.sectionHeading}>Try Sample SMS</ThemedText>
              </View>
              <View style={styles.sampleChipRow}>
                <Pressable
                  style={[styles.sampleChip, { backgroundColor: theme.card, borderColor: theme.border }]}
                  onPress={() => setPastedText(SAMPLE_UNION_BANK_SMS)}>
                  <Ionicons name="document-text-outline" size={14} color={theme.primary} style={{ marginRight: 6 }} />
                  <ThemedText style={styles.sampleChipText}>Union Bank SMS</ThemedText>
                </Pressable>
                <Pressable
                  style={[styles.sampleChip, { backgroundColor: theme.card, borderColor: theme.border }]}
                  onPress={() => setPastedText(SAMPLE_HDFC_SMS)}>
                  <Ionicons name="document-text-outline" size={14} color={theme.primary} style={{ marginRight: 6 }} />
                  <ThemedText style={styles.sampleChipText}>HDFC Card SMS</ThemedText>
                </Pressable>
              </View>

              <ThemedText style={[styles.sectionHeading, { marginTop: 16 }]}>Paste Message Text</ThemedText>
              <TextInput
                style={[
                  styles.textAreaInput,
                  {
                    backgroundColor: theme.card,
                    borderColor: theme.border,
                    color: theme.text,
                  },
                ]}
                placeholder="Paste transaction SMS message here (e.g. Union Bank of India A/c*1650 Dr Rs5.00...)..."
                placeholderTextColor={theme.textSecondary}
                value={pastedText}
                onChangeText={setPastedText}
                multiline
                numberOfLines={6}
                textAlignVertical="top"
              />

              <View style={{ height: 16 }} />

              <ScalePressable
                scaleTo={0.97}
                haptic="medium"
                style={[styles.primaryButton, { backgroundColor: theme.primary }]}
                onPress={handleParsePastedSms}
                disabled={isScanning}>
                {isScanning ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="flash-outline" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
                    <ThemedText style={styles.primaryButtonText}>Parse & Preview SMS</ThemedText>
                  </>
                )}
              </ScalePressable>
            </ScrollView>
          )
        ) : (
          /* Results Review Screen */
          <View style={styles.resultsContainer}>
            {/* Summary Bar */}
            <View style={[styles.summaryBar, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <View style={styles.summaryInfo}>
                <ThemedText style={styles.summaryCount}>
                  {candidates.length} New
                </ThemedText>
                {duplicates.length > 0 && (
                  <Pressable
                    style={[
                      styles.duplicateBadgeButton,
                      { backgroundColor: showDuplicates ? '#F59E0B20' : theme.background },
                    ]}
                    onPress={() => setShowDuplicates((prev) => !prev)}>
                    <ThemedText
                      style={[
                        styles.duplicateBadgeText,
                        { color: showDuplicates ? '#D97706' : theme.textSecondary },
                      ]}>
                      {showDuplicates ? 'Hide Filtered' : `+${duplicates.length} Filtered`}
                    </ThemedText>
                  </Pressable>
                )}
              </View>
              {displayList.length > 0 && (
                <Pressable onPress={toggleSelectAll} style={styles.selectAllButton}>
                  <ThemedText style={[styles.selectAllText, { color: theme.primary }]}>
                    {selectedIds.size === displayList.length ? 'Deselect All' : 'Select All'}
                  </ThemedText>
                </Pressable>
              )}
            </View>

            {displayList.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="checkmark-circle-outline" size={48} color={theme.textSecondary} />
                <ThemedText style={styles.emptyTitle}>All Caught Up!</ThemedText>
                <ThemedText style={styles.emptySubtitle} themeColor="textSecondary">
                  {duplicates.length > 0
                    ? `Found ${duplicates.length} transactions, but they are already recorded in SpendWise.`
                    : 'No unrecorded bank transactions found.'}
                </ThemedText>
                {duplicates.length > 0 && (
                  <Pressable
                    style={[styles.secondaryButton, { borderColor: theme.primary, marginTop: 14 }]}
                    onPress={() => setShowDuplicates(true)}>
                    <ThemedText style={[styles.secondaryButtonText, { color: theme.primary }]}>
                      View Filtered Items ({duplicates.length})
                    </ThemedText>
                  </Pressable>
                )}
                <Pressable
                  style={[styles.secondaryButton, { borderColor: theme.border, marginTop: 10 }]}
                  onPress={() => setHasScanned(false)}>
                  <ThemedText style={styles.secondaryButtonText}>Scan or Paste Again</ThemedText>
                </Pressable>
              </View>
            ) : (
              <FlatList
                data={displayList}
                keyExtractor={(item) => item.id}
                contentContainerStyle={{ paddingBottom: 120 }}
                renderItem={({ item }) => {
                  const isSelected = selectedIds.has(item.id);
                  const isExpense = item.type === 'expense';
                  const isDupe = item.isDuplicate;

                  return (
                    <ScalePressable
                      scaleTo={0.98}
                      haptic="selection"
                      style={[
                        styles.transactionRow,
                        {
                          backgroundColor: theme.card,
                          borderColor: isSelected ? theme.primary : isDupe ? '#F59E0B60' : theme.border,
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
                          {isDupe && (
                            <View style={[styles.bankBadge, { backgroundColor: '#F59E0B20' }]}>
                              <ThemedText style={[styles.badgeText, { color: '#D97706' }]}>
                                Existing
                              </ThemedText>
                            </View>
                          )}
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
            {displayList.length > 0 && (
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
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 13,
  },
  tabText: {
    fontSize: 13,
    fontFamily: FontFamily.semiBold,
  },
  preScanContainer: {
    padding: Spacing.four,
    paddingBottom: 40,
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
    gap: 8,
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
  templateHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  sampleChipRow: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
  },
  sampleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  sampleChipText: {
    fontSize: 12,
    fontFamily: FontFamily.medium,
  },
  textAreaInput: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    fontSize: 13,
    fontFamily: FontFamily.regular,
    minHeight: 110,
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
  duplicateBadgeButton: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  duplicateBadgeText: {
    fontSize: 12,
    fontFamily: FontFamily.medium,
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
