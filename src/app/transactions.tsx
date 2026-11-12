import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { SmsReviewModal } from '@/components/sms/sms-review-modal';
import { StatementImportModal } from '@/components/statement/statement-import-modal';
import { TransactionItem } from '@/components/transactions/transaction-item';
import { ScalePressable } from '@/components/ui/scale-pressable';
import { FontFamily, getScrollViewBottomPadding, MaxContentWidth, Spacing } from '@/constants/theme';
import { useFinance } from '@/context/finance-context';
import { useTheme } from '@/hooks/use-theme';
import { Transaction } from '@/types/finance';
import { formatDateLabel, formatMonthYear } from '@/utils/date';
import { formatINR } from '@/utils/money';

type TypeFilter = 'all' | 'income' | 'expense' | 'transfer';

interface GroupedTransactions {
  dateKey: string;
  displayDate: string;
  count: number;
  data: Transaction[];
}

export default function TransactionsScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { transactions, monthIncome, monthSpent } = useFinance();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<TypeFilter>('all');
  const [isSmsModalOpen, setIsSmsModalOpen] = useState(false);
  const [isStatementModalOpen, setIsStatementModalOpen] = useState(false);

  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      if (selectedType !== 'all' && tx.type !== selectedType) {
        return false;
      }
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesTitle = tx.title.toLowerCase().includes(query);
        const matchesNotes = tx.notes ? tx.notes.toLowerCase().includes(query) : false;
        if (!matchesTitle && !matchesNotes) return false;
      }
      return true;
    });
  }, [transactions, selectedType, searchQuery]);

  // Group transactions by date
  const groupedData: GroupedTransactions[] = useMemo(() => {
    const groups: Record<string, Transaction[]> = {};

    filteredTransactions.forEach((tx) => {
      const datePart = tx.date.split('T')[0];
      if (!groups[datePart]) {
        groups[datePart] = [];
      }
      groups[datePart].push(tx);
    });

    return Object.keys(groups)
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())
      .map((dateKey) => {
        const items = groups[dateKey];
        return {
          dateKey,
          displayDate: formatDateLabel(dateKey),
          count: items.length,
          data: items,
        };
      });
  }, [filteredTransactions]);

  const netFlow = monthIncome - monthSpent;
  const currentMonthLabel = formatMonthYear(new Date());

  const insets = useSafeAreaInsets();
  const bottomScrollPadding = getScrollViewBottomPadding(insets.bottom);

  const handleOpenTransaction = useCallback(
    (tx: Transaction) => {
      router.push({
        pathname: '/modal/transaction' as any,
        params: { id: tx.id },
      });
    },
    [router]
  );

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={styles.contentContainer}>
          {/* Top Header */}
          <View style={styles.header}>
            <ThemedText style={styles.headerTitle}>Transactions</ThemedText>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <ScalePressable
                scaleTo={0.92}
                haptic="light"
                style={[styles.filterButton, { backgroundColor: theme.card, borderColor: theme.border }]}
                onPress={() => setIsStatementModalOpen(true)}>
                <Ionicons name="receipt-outline" size={18} color={theme.primary} />
              </ScalePressable>
              <ScalePressable
                scaleTo={0.92}
                haptic="light"
                style={[styles.filterButton, { backgroundColor: theme.card, borderColor: theme.border }]}
                onPress={() => setIsSmsModalOpen(true)}>
                <Ionicons name="chatbox-ellipses-outline" size={18} color={theme.primary} />
              </ScalePressable>
              <ScalePressable
                scaleTo={0.92}
                haptic="light"
                style={[styles.filterButton, { backgroundColor: theme.card, borderColor: theme.border }]}
                onPress={() => setSelectedType(selectedType === 'all' ? 'expense' : 'all')}>
                <Ionicons name="options-outline" size={20} color={theme.text} />
              </ScalePressable>
            </View>
          </View>

          {/* Search Input Bar */}
          <View style={[styles.searchBar, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Ionicons name="search-outline" size={18} color={theme.textSecondary} style={{ marginRight: 8 }} />
            <TextInput
              style={[styles.searchInput, { color: theme.text }]}
              placeholder="Search transactions..."
              placeholderTextColor={theme.textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
              clearButtonMode="while-editing"
            />
            {searchQuery ? (
              <Pressable onPress={() => setSearchQuery('')} hitSlop={8}>
                <Ionicons name="close-circle" size={18} color={theme.textSecondary} />
              </Pressable>
            ) : null}
          </View>

          {/* Filter Pills */}
          <View style={styles.filterPillsRow}>
            {(['all', 'income', 'expense', 'transfer'] as TypeFilter[]).map((type) => {
              const isSelected = selectedType === type;
              return (
                <ScalePressable
                  key={type}
                  scaleTo={0.93}
                  haptic="selection"
                  style={[
                    styles.filterPill,
                    isSelected
                      ? { backgroundColor: theme.primary, borderColor: theme.primary }
                      : { backgroundColor: theme.card, borderColor: theme.border },
                  ]}
                  onPress={() => setSelectedType(type)}>
                  <ThemedText
                    style={[
                      styles.filterPillText,
                      { color: isSelected ? '#ffffff' : theme.textSecondary },
                    ]}>
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </ThemedText>
                </ScalePressable>
              );
            })}
          </View>

          {/* Monthly Summary Card */}
          <View style={[styles.summaryCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={styles.summaryTopRow}>
              <View style={styles.monthSelector}>
                <ThemedText style={styles.monthSelectorText}>{currentMonthLabel}</ThemedText>
                <Ionicons name="chevron-down" size={14} color={theme.textSecondary} style={{ marginLeft: 4 }} />
              </View>

              <View style={[styles.netTag, { backgroundColor: `${theme.primary}15` }]}>
                <ThemedText style={[styles.netTagText, { color: theme.primary }]}>
                  {netFlow >= 0 ? `+${formatINR(netFlow)}` : `-${formatINR(Math.abs(netFlow))}`}
                </ThemedText>
              </View>
            </View>

            <View style={styles.summaryBottomRow}>
              <ThemedText style={styles.summaryBreakdown} themeColor="textSecondary">
                Income <ThemedText style={{ color: theme.income, fontFamily: FontFamily.semiBold }}>{formatINR(monthIncome)}</ThemedText>
                {'    '}
                Expenses <ThemedText style={{ color: theme.expense, fontFamily: FontFamily.semiBold }}>{formatINR(monthSpent)}</ThemedText>
              </ThemedText>
            </View>
          </View>

          {/* Grouped Transaction History List */}
          <FlatList
            data={groupedData}
            keyExtractor={(item) => item.dateKey}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[styles.listContent, { paddingBottom: bottomScrollPadding }]}
            renderItem={({ item }) => (
              <View style={styles.groupContainer}>
                {/* Date Section Header */}
                <View style={styles.groupHeader}>
                  <ThemedText style={styles.groupDate}>{item.displayDate}</ThemedText>
                  <ThemedText style={styles.groupCount} themeColor="textSecondary">
                    {item.count} {item.count === 1 ? 'transaction' : 'transactions'}
                  </ThemedText>
                </View>

                {/* Transaction Rows */}
                {item.data.map((tx) => (
                  <TransactionItem
                    key={tx.id}
                    transaction={tx}
                    onPress={handleOpenTransaction}
                  />
                ))}
              </View>
            )}
            ListEmptyComponent={
              <View style={[styles.emptyCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <Ionicons name="search-outline" size={44} color={theme.textSecondary} />
                <ThemedText style={styles.emptyTitle}>No matching transactions</ThemedText>
                <ThemedText style={styles.emptySubtitle} themeColor="textSecondary">
                  Try adjusting your search query or filter selection.
                </ThemedText>
              </View>
            }
          />
          <SmsReviewModal visible={isSmsModalOpen} onClose={() => setIsSmsModalOpen(false)} />
          <StatementImportModal
            visible={isStatementModalOpen}
            onClose={() => setIsStatementModalOpen(false)}
          />
        </View>
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
  contentContainer: {
    flex: 1,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.two,
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
  filterButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    paddingHorizontal: 12,
    height: 46,
    borderWidth: 1,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    fontFamily: FontFamily.medium,
    fontSize: 14,
    height: '100%',
  },
  filterPillsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  filterPill: {
    paddingVertical: 7,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterPillText: {
    fontFamily: FontFamily.semiBold,
    fontSize: 13,
  },
  summaryCard: {
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    marginBottom: 14,
  },
  summaryTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  monthSelector: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  monthSelectorText: {
    fontFamily: FontFamily.bold,
    fontSize: 15,
  },
  netTag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  netTagText: {
    fontFamily: FontFamily.bold,
    fontSize: 13,
  },
  summaryBottomRow: {
    flexDirection: 'row',
  },
  summaryBreakdown: {
    fontFamily: FontFamily.regular,
    fontSize: 12,
  },
  listContent: {
    paddingBottom: 120,
  },
  groupContainer: {
    marginBottom: 16,
  },
  groupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    paddingHorizontal: 2,
  },
  groupDate: {
    fontFamily: FontFamily.bold,
    fontSize: 14,
  },
  groupCount: {
    fontFamily: FontFamily.regular,
    fontSize: 12,
  },
  emptyCard: {
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    marginTop: 20,
  },
  emptyTitle: {
    fontFamily: FontFamily.semiBold,
    fontSize: 16,
    marginTop: 12,
    marginBottom: 4,
  },
  emptySubtitle: {
    fontFamily: FontFamily.regular,
    fontSize: 13,
    textAlign: 'center',
  },
});
