import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
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
import { getCategoryById } from '@/constants/categories';
import { FontFamily, Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { useFinance } from '@/context/finance-context';
import { useTheme } from '@/hooks/use-theme';
import { deduplicateAgainstExisting } from '@/services/hybrid/hybrid-dedup';
import {
  parseStatementOrReceipt,
  ParsedStatementTransaction,
} from '@/services/statement/statement-parser';
import { TransactionRepository } from '@/services/transaction-repository';
import { formatDateLabel } from '@/utils/date';
import { formatINR } from '@/utils/money';

interface StatementImportModalProps {
  visible: boolean;
  onClose: () => void;
}

const SAMPLE_TEMPLATES = [
  {
    name: 'Swiggy Email Receipt',
    text: `Swiggy Order Receipt
Order #18392019
Date: 10 Nov 2026
Restaurant: Burger King
Order Total: ₹340.00
Paid via Credit Card`,
  },
  {
    name: 'Uber Trip Receipt',
    text: `Your Uber Trip Receipt
Date: 09 Nov 2026
Trip Fare: ₹245.00
Payment Method: Amazon Pay UPI
Trip ID: ub-92847291`,
  },
  {
    name: 'Bank CSV Statement',
    text: `Date,Narration,Debit,Credit,Ref No
09/11/2026,UPI/4314241/SWIGGY/HDFC,450.00,,4314241241
08/11/2026,POS 9284 STARBUCKS,850.00,,928472194
01/11/2026,ACH/SALARY/TECHCORP,,85000.00,SAL928412`,
  },
];

export function StatementImportModal({ visible, onClose }: StatementImportModalProps) {
  const theme = useTheme();
  const { user } = useAuth();
  const { refreshData } = useFinance();

  const [rawText, setRawText] = useState('');
  const [candidates, setCandidates] = useState<ParsedStatementTransaction[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isProcessing, setIsProcessing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [hasParsed, setHasParsed] = useState(false);

  const handleParse = async () => {
    if (!rawText.trim()) {
      Alert.alert('Empty Input', 'Please paste statement rows, a CSV table, or an email receipt.');
      return;
    }

    setIsProcessing(true);
    try {
      const parsed = parseStatementOrReceipt(rawText);
      if (parsed.length === 0) {
        Alert.alert(
          'No Transactions Found',
          'Could not detect valid transactions. Ensure the text contains amounts, dates, or standard CSV columns.'
        );
        return;
      }

      // Fetch existing transactions for cross-source deduplication
      const existing = await TransactionRepository.getTransactions({ limit: 300 });
      const { unique, duplicates } = deduplicateAgainstExisting(parsed, existing, {
        timeWindowHours: 24,
      });

      const combined = [...unique, ...duplicates];
      setCandidates(combined);
      // Auto-select only unique ones by default
      setSelectedIds(new Set(unique.map((c) => c.id)));
      setHasParsed(true);
    } catch {
      Alert.alert('Parse Failed', 'Could not parse statement input. Please check the format.');
    } finally {
      setIsProcessing(false);
    }
  };

  const toggleSelect = (id: string) => {
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
    if (selectedIds.size === candidates.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(candidates.map((c) => c.id)));
    }
  };

  const handleImport = async () => {
    const toImport = candidates.filter((c) => selectedIds.has(c.id));
    if (toImport.length === 0) {
      Alert.alert('No Selection', 'Please select at least one transaction to import.');
      return;
    }

    setIsImporting(true);
    try {
      for (const item of toImport) {
        await TransactionRepository.createTransaction({
          userId: user?.id,
          amount: item.amount,
          type: item.type,
          categoryId: item.categoryId,
          date: item.date,
          title: item.title,
          notes: item.notes,
          source: item.source,
          rawReference: item.referenceNo,
        });
      }

      await refreshData();
      Alert.alert(
        'Import Successful',
        `Successfully imported ${toImport.length} transaction${toImport.length === 1 ? '' : 's'} into SpendWise.`,
        [
          {
            text: 'Done',
            onPress: () => {
              handleReset();
              onClose();
            },
          },
        ]
      );
    } catch {
      Alert.alert('Import Failed', 'Failed to import transactions. Please try again.');
    } finally {
      setIsImporting(false);
    }
  };

  const handleReset = () => {
    setRawText('');
    setCandidates([]);
    setSelectedIds(new Set());
    setHasParsed(false);
  };

  const handleLoadTemplate = (text: string) => {
    setRawText(text);
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: theme.border }]}>
          <View style={styles.headerTitleRow}>
            <View style={[styles.iconCircle, { backgroundColor: '#6366F120' }]}>
              <Ionicons name="receipt-outline" size={20} color="#6366F1" />
            </View>
            <View>
              <ThemedText style={styles.title}>Statement & Email Ingest</ThemedText>
              <ThemedText style={styles.subtitle} themeColor="textSecondary">
                Import CSV, bank e-statements & receipts
              </ThemedText>
            </View>
          </View>
          <Pressable onPress={onClose} style={[styles.closeButton, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Ionicons name="close" size={20} color={theme.text} />
          </Pressable>
        </View>

        {!hasParsed ? (
          /* Input / Paste View */
          <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
            <View style={[styles.infoCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <Ionicons name="sparkles" size={24} color="#6366F1" style={{ marginBottom: 8 }} />
              <ThemedText style={styles.infoTitle}>Universal Hybrid Ingestion</ThemedText>
              <ThemedText style={styles.infoText} themeColor="textSecondary">
                Paste any email receipt (Swiggy, Amazon, Uber) or bank statement CSV rows. SpendWise auto-detects dates, amounts, merchants, and prevents duplicate records!
              </ThemedText>
            </View>

            {/* Quick Sample Templates */}
            <ThemedText style={styles.sectionHeading}>Try Sample Templates</ThemedText>
            <View style={styles.templateRow}>
              {SAMPLE_TEMPLATES.map((tmpl) => (
                <Pressable
                  key={tmpl.name}
                  style={[styles.templateChip, { backgroundColor: theme.card, borderColor: theme.border }]}
                  onPress={() => handleLoadTemplate(tmpl.text)}>
                  <Ionicons name="document-text-outline" size={14} color="#6366F1" style={{ marginRight: 6 }} />
                  <ThemedText style={styles.templateChipText}>{tmpl.name}</ThemedText>
                </Pressable>
              ))}
            </View>

            {/* Web File Input for CSV */}
            {Platform.OS === 'web' && (
              <View style={[styles.webFileBox, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <ThemedText style={styles.webFileTitle}>Or upload a CSV file:</ThemedText>
                <input
                  type="file"
                  accept=".csv,.txt"
                  style={{ marginTop: 8 }}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = (ev) => {
                        const content = ev.target?.result as string;
                        if (content) setRawText(content);
                      };
                      reader.readAsText(file);
                    }
                  }}
                />
              </View>
            )}

            {/* Input Box */}
            <ThemedText style={styles.sectionHeading}>Paste Receipt or CSV Data</ThemedText>
            <TextInput
              style={[
                styles.textAreaInput,
                {
                  backgroundColor: theme.card,
                  borderColor: theme.border,
                  color: theme.text,
                },
              ]}
              placeholder="Paste email confirmation, invoice text, or CSV table rows here..."
              placeholderTextColor={theme.textSecondary}
              value={rawText}
              onChangeText={setRawText}
              multiline
              numberOfLines={8}
              textAlignVertical="top"
            />

            <Pressable
              style={[styles.primaryButton, { backgroundColor: '#6366F1' }]}
              onPress={handleParse}
              disabled={isProcessing}>
              {isProcessing ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="scan-outline" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
                  <ThemedText style={styles.primaryButtonText}>Extract Transactions</ThemedText>
                </>
              )}
            </Pressable>
          </ScrollView>
        ) : (
          /* Results Review View */
          <View style={styles.resultsContainer}>
            {/* Summary Bar */}
            <View style={[styles.summaryBar, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <View>
                <ThemedText style={styles.summaryCount}>
                  {candidates.length} Detected · {selectedIds.size} Selected
                </ThemedText>
                <ThemedText style={styles.summarySubtitle} themeColor="textSecondary">
                  Review & confirm before adding to database
                </ThemedText>
              </View>
              <Pressable onPress={toggleSelectAll} style={styles.selectAllBtn}>
                <ThemedText style={[styles.selectAllText, { color: '#6366F1' }]}>
                  {selectedIds.size === candidates.length ? 'Deselect All' : 'Select All'}
                </ThemedText>
              </Pressable>
            </View>

            <FlatList
              data={candidates}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.listContent}
              renderItem={({ item }) => {
                const isSelected = selectedIds.has(item.id);
                const category = getCategoryById(item.categoryId);
                const isExpense = item.type === 'expense';

                return (
                  <Pressable
                    style={[
                      styles.candidateCard,
                      {
                        backgroundColor: theme.card,
                        borderColor: isSelected ? '#6366F1' : theme.border,
                      },
                      item.isDuplicate && styles.duplicateCard,
                    ]}
                    onPress={() => toggleSelect(item.id)}>
                    <View style={styles.cardHeaderRow}>
                      <View style={styles.cardLeftCol}>
                        <View style={styles.titleRow}>
                          <ThemedText style={styles.cardTitle}>{item.title}</ThemedText>
                          <View
                            style={[
                              styles.sourceBadge,
                              { backgroundColor: item.source === 'email' ? '#6366F120' : '#0EA5E920' },
                            ]}>
                            <ThemedText
                              style={[
                                styles.sourceBadgeText,
                                { color: item.source === 'email' ? '#6366F1' : '#0EA5E9' },
                              ]}>
                              {item.source === 'email' ? '✉️ Email' : '📄 Statement'}
                            </ThemedText>
                          </View>
                        </View>
                        <ThemedText style={styles.cardDate} themeColor="textSecondary">
                          {formatDateLabel(item.date)} · {category.name}
                        </ThemedText>
                      </View>

                      <View style={styles.cardRightCol}>
                        <ThemedText
                          style={[
                            styles.cardAmount,
                            { color: isExpense ? theme.expense : theme.income },
                          ]}>
                          {isExpense ? '-' : '+'}
                          {formatINR(item.amount)}
                        </ThemedText>
                        <Ionicons
                          name={isSelected ? 'checkbox' : 'square-outline'}
                          size={22}
                          color={isSelected ? '#6366F1' : theme.textSecondary}
                        />
                      </View>
                    </View>

                    {item.isDuplicate && (
                      <View style={styles.duplicateNotice}>
                        <Ionicons name="information-circle-outline" size={14} color="#F59E0B" style={{ marginRight: 4 }} />
                        <ThemedText style={styles.duplicateNoticeText}>
                          Possible duplicate (already logged in SpendWise)
                        </ThemedText>
                      </View>
                    )}
                  </Pressable>
                );
              }}
            />

            {/* Bottom Actions Bar */}
            <View style={[styles.bottomBar, { backgroundColor: theme.card, borderTopColor: theme.border }]}>
              <Pressable style={styles.reparseBtn} onPress={handleReset}>
                <ThemedText style={styles.reparseBtnText} themeColor="textSecondary">
                  Re-paste
                </ThemedText>
              </Pressable>

              <Pressable
                style={[
                  styles.importBtn,
                  { backgroundColor: '#6366F1' },
                  (selectedIds.size === 0 || isImporting) && { opacity: 0.6 },
                ]}
                onPress={handleImport}
                disabled={selectedIds.size === 0 || isImporting}>
                {isImporting ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="checkmark-done" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                    <ThemedText style={styles.importBtnText}>
                      Import {selectedIds.size} Items
                    </ThemedText>
                  </>
                )}
              </Pressable>
            </View>
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
    paddingVertical: Spacing.two,
    borderBottomWidth: 1,
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
    fontSize: 16,
    fontFamily: FontFamily.bold,
  },
  subtitle: {
    fontSize: 12,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    padding: Spacing.four,
  },
  infoCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: Spacing.four,
  },
  infoTitle: {
    fontSize: 15,
    fontFamily: FontFamily.bold,
    marginBottom: 4,
  },
  infoText: {
    fontSize: 13,
    lineHeight: 18,
  },
  sectionHeading: {
    fontSize: 13,
    fontFamily: FontFamily.semiBold,
    marginBottom: Spacing.two,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  templateRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: Spacing.four,
  },
  templateChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 18,
    borderWidth: 1,
  },
  templateChipText: {
    fontSize: 12,
    fontFamily: FontFamily.medium,
  },
  webFileBox: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: Spacing.four,
  },
  webFileTitle: {
    fontSize: 13,
    fontFamily: FontFamily.semiBold,
  },
  textAreaInput: {
    minHeight: 140,
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    fontSize: 13,
    fontFamily: FontFamily.regular,
    marginBottom: Spacing.four,
    lineHeight: 18,
  },
  primaryButton: {
    height: 50,
    borderRadius: 25,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
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
    borderBottomWidth: 1,
  },
  summaryCount: {
    fontSize: 14,
    fontFamily: FontFamily.bold,
  },
  summarySubtitle: {
    fontSize: 11,
  },
  selectAllBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  selectAllText: {
    fontSize: 13,
    fontFamily: FontFamily.semiBold,
  },
  listContent: {
    padding: Spacing.four,
    gap: 10,
    paddingBottom: 100,
  },
  candidateCard: {
    padding: 14,
    borderRadius: 16,
    borderWidth: 1.5,
  },
  duplicateCard: {
    opacity: 0.75,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardLeftCol: {
    flex: 1,
    marginRight: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 14,
    fontFamily: FontFamily.semiBold,
  },
  sourceBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  sourceBadgeText: {
    fontSize: 10,
    fontFamily: FontFamily.bold,
  },
  cardDate: {
    fontSize: 12,
  },
  cardRightCol: {
    alignItems: 'flex-end',
    gap: 6,
  },
  cardAmount: {
    fontSize: 15,
    fontFamily: FontFamily.bold,
  },
  duplicateNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 0.5,
    borderTopColor: '#E2E8F030',
  },
  duplicateNoticeText: {
    fontSize: 11,
    color: '#F59E0B',
  },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    borderTopWidth: 1,
  },
  reparseBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  reparseBtnText: {
    fontSize: 14,
    fontFamily: FontFamily.medium,
  },
  importBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    height: 46,
    borderRadius: 23,
  },
  importBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: FontFamily.bold,
  },
});
