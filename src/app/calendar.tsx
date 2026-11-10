import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { TransactionItem } from '@/components/transactions/transaction-item';
import { FontFamily, getScrollViewBottomPadding, MaxContentWidth, Spacing } from '@/constants/theme';
import { useFinance } from '@/context/finance-context';
import { useTheme } from '@/hooks/use-theme';
import { TransactionRepository } from '@/services/transaction-repository';
import {
  formatMonthYear,
  getDaysInMonthGrid,
  isSameDay,
} from '@/utils/date';
import { formatINR } from '@/utils/money';

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function CalendarScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { transactions } = useFinance();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [dailyAggregates, setDailyAggregates] = useState<
    Record<string, { expense: number; income: number }>
  >({});

  useEffect(() => {
    let isMounted = true;
    async function loadAggregates() {
      try {
        const aggs = await TransactionRepository.getDailyAggregatesForMonth(
          currentDate.getFullYear(),
          currentDate.getMonth()
        );
        if (isMounted) {
          setDailyAggregates(aggs);
        }
      } catch (err) {
        console.error('Error loading daily aggregates:', err);
      }
    }

    loadAggregates();
    return () => {
      isMounted = false;
    };
  }, [currentDate, transactions]);

  const monthGrid = useMemo(() => {
    return getDaysInMonthGrid(currentDate.getFullYear(), currentDate.getMonth(), true);
  }, [currentDate]);

  const nextMonth = () => {
    const next = new Date(currentDate);
    next.setMonth(next.getMonth() + 1);
    setCurrentDate(next);
  };

  const prevMonth = () => {
    const prev = new Date(currentDate);
    prev.setMonth(prev.getMonth() - 1);
    setCurrentDate(prev);
  };

  const selectedDayTransactions = useMemo(() => {
    return transactions.filter((tx) => isSameDay(tx.date, selectedDate));
  }, [transactions, selectedDate]);

  const selectedDayTotal = useMemo(() => {
    return selectedDayTransactions.reduce((acc, tx) => {
      if (tx.type === 'expense') return acc + tx.amount;
      return acc;
    }, 0);
  }, [selectedDayTransactions]);

  const formatSelectedDateHeader = (date: Date) => {
    const day = date.getDate();
    const month = date.toLocaleDateString('en-IN', { month: 'short' });
    const year = date.getFullYear();
    return `${day} ${month} ${year}`;
  };

  const insets = useSafeAreaInsets();
  const bottomScrollPadding = getScrollViewBottomPadding(insets.bottom);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={styles.contentContainer}>
          {/* Header */}
          <View style={styles.header}>
            <ThemedText style={styles.headerTitle}>Calendar</ThemedText>
          </View>

          {/* Month Switcher */}
          <View style={[styles.monthNavigator, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Pressable hitSlop={12} onPress={prevMonth} style={styles.navArrow}>
              <Ionicons name="chevron-back" size={20} color={theme.text} />
            </Pressable>

            <ThemedText style={styles.monthLabel}>
              {formatMonthYear(currentDate)}
            </ThemedText>

            <Pressable hitSlop={12} onPress={nextMonth} style={styles.navArrow}>
              <Ionicons name="chevron-forward" size={20} color={theme.text} />
            </Pressable>
          </View>

          {/* Calendar Grid Card */}
          <View style={[styles.calendarCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            {/* Weekday Row */}
            <View style={styles.weekdayRow}>
              {DAYS_OF_WEEK.map((day) => (
                <ThemedText key={day} style={styles.weekdayText}>
                  {day}
                </ThemedText>
              ))}
            </View>

            {/* Days Grid */}
            <View style={styles.gridContainer}>
              {monthGrid.map((day, idx) => {
                if (!day) {
                  return <View key={`empty-${idx}`} style={styles.dayCell} />;
                }

                const isSelected = isSameDay(day, selectedDate);
                const isToday = isSameDay(day, new Date());
                const dateKey = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;
                const aggregate = dailyAggregates[dateKey];
                const hasExpense = aggregate && aggregate.expense > 0;
                const hasIncome = aggregate && aggregate.income > 0;

                return (
                  <Pressable
                    key={dateKey}
                    style={styles.dayCell}
                    onPress={() => setSelectedDate(day)}>
                    <View
                      style={[
                        styles.dayNumberCircle,
                        isSelected && { backgroundColor: theme.primary },
                        !isSelected && isToday && { borderWidth: 1, borderColor: theme.primary },
                      ]}>
                      <ThemedText
                        style={[
                          styles.dayNumberText,
                          isSelected && { color: '#ffffff', fontFamily: FontFamily.bold },
                        ]}>
                        {day.getDate()}
                      </ThemedText>
                    </View>

                    {/* Dot indicators */}
                    <View style={styles.dotsRow}>
                      {hasExpense ? (
                        <View style={[styles.dot, { backgroundColor: isSelected ? theme.primary : theme.expense }]} />
                      ) : null}
                      {hasIncome ? (
                        <View style={[styles.dot, { backgroundColor: theme.income }]} />
                      ) : null}
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Selected Date Summary & Transactions */}
          <View style={styles.summaryHeader}>
            <ThemedText style={styles.selectedDateText}>
              {formatSelectedDateHeader(selectedDate)}
            </ThemedText>
            {selectedDayTotal > 0 ? (
              <ThemedText style={[styles.dayTotalAmount, { color: theme.expense }]}>
                {formatINR(selectedDayTotal)}
              </ThemedText>
            ) : null}
          </View>

          <FlatList
            data={selectedDayTransactions}
            keyExtractor={(item) => item.id}
            contentContainerStyle={[styles.listContent, { paddingBottom: bottomScrollPadding }]}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => (
              <TransactionItem
                transaction={item}
                onPress={() =>
                  router.push({
                    pathname: '/modal/transaction' as any,
                    params: { id: item.id },
                  })
                }
              />
            )}
            ListEmptyComponent={
              <View style={[styles.emptyCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <Ionicons name="calendar-outline" size={32} color={theme.textSecondary} />
                <ThemedText style={styles.emptyTitle}>No transactions</ThemedText>
                <ThemedText style={styles.emptySubtitle} themeColor="textSecondary">
                  No spending recorded for this date.
                </ThemedText>
              </View>
            }
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
    marginBottom: Spacing.three,
  },
  headerTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 24,
  },
  monthNavigator: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderWidth: 1,
    marginBottom: 12,
  },
  navArrow: {
    padding: 6,
  },
  monthLabel: {
    fontFamily: FontFamily.bold,
    fontSize: 16,
  },
  calendarCard: {
    borderRadius: 20,
    padding: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  weekdayRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 8,
  },
  weekdayText: {
    fontFamily: FontFamily.semiBold,
    fontSize: 12,
    color: '#94A3B8',
    width: 40,
    textAlign: 'center',
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: `${100 / 7}%`,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayNumberCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayNumberText: {
    fontFamily: FontFamily.medium,
    fontSize: 14,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 3,
    height: 6,
    alignItems: 'center',
    marginTop: 2,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    paddingHorizontal: 2,
  },
  selectedDateText: {
    fontFamily: FontFamily.bold,
    fontSize: 16,
  },
  dayTotalAmount: {
    fontFamily: FontFamily.bold,
    fontSize: 16,
  },
  listContent: {
    paddingBottom: 120,
  },
  emptyCard: {
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    marginTop: 10,
  },
  emptyTitle: {
    fontFamily: FontFamily.semiBold,
    fontSize: 14,
    marginTop: 8,
    marginBottom: 2,
  },
  emptySubtitle: {
    fontFamily: FontFamily.regular,
    fontSize: 12,
  },
});
