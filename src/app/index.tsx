import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { TransactionItem } from '@/components/transactions/transaction-item';
import { AnimatedProgressBar } from '@/components/ui/animated-progress-bar';
import { ScalePressable } from '@/components/ui/scale-pressable';
import { getCategoryById } from '@/constants/categories';
import { FontFamily, getScrollViewBottomPadding, MaxContentWidth, Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { useFinance } from '@/context/finance-context';
import { useTheme } from '@/hooks/use-theme';
import { formatINR } from '@/utils/money';

export default function HomeScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { user } = useAuth();
  const {
    transactions,
    isLoading,
    monthSpent,
    monthIncome,
    refreshData,
  } = useFinance();

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showBalance, setShowBalance] = useState(true);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshData();
    setIsRefreshing(false);
  };

  const displayName = user?.user_metadata?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || 'Friend';
  const userInitials = (user?.user_metadata?.full_name || user?.email || 'SW')
    .split(' ')
    .filter(Boolean)
    .map((w: string) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'SW';

  const insets = useSafeAreaInsets();
  const bottomScrollPadding = getScrollViewBottomPadding(insets.bottom);

  // Time-of-day greeting
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  }, []);

  // Compute Total Balance (All Income - All Expenses)
  const totalBalance = useMemo(() => {
    return transactions.reduce((acc, tx) => {
      if (tx.type === 'income') return acc + tx.amount;
      if (tx.type === 'expense') return acc - tx.amount;
      return acc;
    }, 0);
  }, [transactions]);

  const netFlow = monthIncome - monthSpent;

  // Compute Weekly Spending for current month (W1: 1-7, W2: 8-14, W3: 15-21, W4: 22+)
  const weeklySpending = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    const weeks = [0, 0, 0, 0]; // W1, W2, W3, W4+

    transactions.forEach((tx) => {
      if (tx.type !== 'expense') return;
      const d = new Date(tx.date);
      if (d.getFullYear() === currentYear && d.getMonth() === currentMonth) {
        const day = d.getDate();
        if (day <= 7) weeks[0] += tx.amount;
        else if (day <= 14) weeks[1] += tx.amount;
        else if (day <= 21) weeks[2] += tx.amount;
        else weeks[3] += tx.amount;
      }
    });

    const maxWeek = Math.max(...weeks, 1);
    return {
      weeks,
      maxWeek,
    };
  }, [transactions]);

  // Compute Top 3 Expense Categories
  const topCategories = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    const catTotals: Record<string, number> = {};
    let totalExp = 0;

    transactions.forEach((tx) => {
      if (tx.type !== 'expense') return;
      const d = new Date(tx.date);
      if (d.getFullYear() === currentYear && d.getMonth() === currentMonth) {
        catTotals[tx.categoryId] = (catTotals[tx.categoryId] || 0) + tx.amount;
        totalExp += tx.amount;
      }
    });

    if (totalExp === 0) {
      return [];
    }

    return Object.entries(catTotals)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([catId, amount]) => ({
        category: getCategoryById(catId),
        amount,
        percentage: Math.round((amount / totalExp) * 100),
      }));
  }, [transactions]);

  const recentTransactions = transactions.slice(0, 3);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomScrollPadding }]}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />}>
          
          {/* Header Bar */}
          <View style={styles.header}>
            <View style={styles.brandRow}>
              <View style={styles.brandLogo}>
                <View style={[styles.logoBar, { height: 10, backgroundColor: theme.primary }]} />
                <View style={[styles.logoBar, { height: 16, backgroundColor: theme.accent }]} />
                <View style={[styles.logoBar, { height: 22, backgroundColor: theme.primaryDark }]} />
              </View>
              <ThemedText style={styles.brandText}>SpendWise</ThemedText>
            </View>

            <View style={styles.headerActions}>
              <Pressable
                style={[styles.avatarButton, { backgroundColor: theme.primary }]}
                onPress={() => router.push('/profile' as any)}>
                <ThemedText style={styles.avatarText}>{userInitials}</ThemedText>
              </Pressable>
            </View>
          </View>

          {/* User Greeting */}
          <View style={styles.greetingSection}>
            <ThemedText style={styles.greetingTitle}>
              {greeting}, {displayName} 👋
            </ThemedText>
            <ThemedText style={styles.greetingSubtitle} themeColor="textSecondary">
              {"Here's your financial overview"}
            </ThemedText>
          </View>

          {/* Frosted Balance Hero Card */}
          <View style={[styles.heroCard, { backgroundColor: '#07795F' }]}>
            <View style={styles.balanceHeader}>
              <ThemedText style={styles.balanceLabel}>Total Balance</ThemedText>
              <Pressable
                hitSlop={10}
                onPress={() => setShowBalance(!showBalance)}
                style={styles.eyeButton}>
                <Ionicons
                  name={showBalance ? 'eye-outline' : 'eye-off-outline'}
                  size={19}
                  color="rgba(255,255,255,0.85)"
                />
              </Pressable>
            </View>

            <ThemedText style={styles.balanceAmount}>
              {showBalance ? formatINR(Math.max(0, totalBalance)) : '••••••••'}
            </ThemedText>

            {/* 3 Summary Pills */}
            <View style={styles.summaryPillsRow}>
              <View style={styles.summaryPill}>
                <Ionicons name="arrow-up" size={13} color="#16A34A" />
                <ThemedText style={[styles.pillText, { color: '#16A34A' }]}>
                  Income {formatINR(monthIncome)}
                </ThemedText>
              </View>

              <View style={styles.summaryPill}>
                <Ionicons name="arrow-down" size={13} color="#EF4444" />
                <ThemedText style={[styles.pillText, { color: '#EF4444' }]}>
                  Expenses {formatINR(monthSpent)}
                </ThemedText>
              </View>

              <View style={styles.summaryPill}>
                <Ionicons name="swap-horizontal" size={13} color="#0AA886" />
                <ThemedText style={[styles.pillText, { color: '#07795F' }]}>
                  Net Flow {formatINR(Math.abs(netFlow))}
                </ThemedText>
              </View>
            </View>
          </View>

          {/* Monthly Spending Bar Chart */}
          <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={styles.cardHeader}>
              <ThemedText style={styles.cardTitle}>Monthly Spending</ThemedText>
              <View style={[styles.dropdownPill, { backgroundColor: theme.background }]}>
                <ThemedText style={styles.dropdownText}>This Month</ThemedText>
                <Ionicons name="chevron-down" size={13} color={theme.textSecondary} />
              </View>
            </View>

            {/* Chart Area */}
            <View style={styles.chartContainer}>
              {/* Y Axis Guide */}
              <View style={styles.yAxisLabels}>
                <ThemedText style={styles.axisLabel}>20K</ThemedText>
                <ThemedText style={styles.axisLabel}>15K</ThemedText>
                <ThemedText style={styles.axisLabel}>10K</ThemedText>
                <ThemedText style={styles.axisLabel}>5K</ThemedText>
                <ThemedText style={styles.axisLabel}>0</ThemedText>
              </View>

              {/* Bars */}
              <View style={styles.barsContainer}>
                {['W1', 'W2', 'W3', 'W4'].map((weekLabel, idx) => {
                  const amt = weeklySpending.weeks[idx];
                  const heightPercent = weeklySpending.maxWeek > 0 && amt > 0
                    ? Math.max(8, Math.min(100, Math.round((amt / weeklySpending.maxWeek) * 100)))
                    : 0;

                  return (
                    <View key={weekLabel} style={styles.barColumn}>
                      <View style={styles.barTrack}>
                        <View
                          style={[
                            styles.barFill,
                            {
                              height: `${heightPercent}%`,
                              backgroundColor: theme.primary,
                            },
                          ]}
                        />
                      </View>
                      <ThemedText style={styles.barLabel}>{weekLabel}</ThemedText>
                    </View>
                  );
                })}
              </View>
            </View>
          </View>

          {/* Top Categories */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <ThemedText style={styles.sectionTitle}>Top Categories</ThemedText>
              {topCategories.length > 0 ? (
                <Pressable onPress={() => router.push('/transactions' as any)}>
                  <ThemedText style={styles.viewAllText}>View All →</ThemedText>
                </Pressable>
              ) : null}
            </View>

            {topCategories.length > 0 ? (
              <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border, paddingVertical: 10 }]}>
                {topCategories.map((item, idx) => (
                  <View
                    key={item.category.id}
                    style={[
                      styles.categoryRow,
                      idx < topCategories.length - 1 && { borderBottomColor: theme.border, borderBottomWidth: 1 },
                    ]}>
                    <View style={[styles.catIconBox, { backgroundColor: `${item.category.color}15` }]}>
                      <Ionicons name={item.category.icon as any} size={18} color={item.category.color} />
                    </View>

                    <View style={styles.catInfo}>
                      <ThemedText style={styles.catName}>{item.category.name}</ThemedText>
                      <AnimatedProgressBar
                        percentage={item.percentage}
                        color={item.category.color || theme.primary}
                        backgroundColor={theme.background}
                        height={6}
                      />
                    </View>

                    <ThemedText style={styles.catPercent}>{item.percentage}%</ThemedText>
                  </View>
                ))}
              </View>
            ) : (
              <View style={[styles.emptyCard, { backgroundColor: theme.card, borderColor: theme.border, paddingVertical: 20 }]}>
                <Ionicons name="pie-chart-outline" size={32} color={theme.textSecondary} />
                <ThemedText style={styles.emptySubtitle} themeColor="textSecondary">
                  No expense categories recorded this month.
                </ThemedText>
              </View>
            )}
          </View>

          {/* Recent Transactions */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <ThemedText style={styles.sectionTitle}>Recent Transactions</ThemedText>
              <ScalePressable haptic="light" onPress={() => router.push('/transactions' as any)}>
                <ThemedText style={styles.viewAllText}>View All →</ThemedText>
              </ScalePressable>
            </View>

            {isLoading ? (
              <ActivityIndicator style={{ marginVertical: Spacing.four }} color={theme.primary} />
            ) : recentTransactions.length > 0 ? (
              recentTransactions.map((tx) => (
                <TransactionItem
                  key={tx.id}
                  transaction={tx}
                  onPress={() =>
                    router.push({
                      pathname: '/modal/transaction' as any,
                      params: { id: tx.id },
                    })
                  }
                />
              ))
            ) : (
              <View style={[styles.emptyCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <Ionicons name="receipt-outline" size={40} color={theme.textSecondary} />
                <ThemedText style={styles.emptyTitle}>No transactions yet</ThemedText>
                <ThemedText style={styles.emptySubtitle} themeColor="textSecondary">
                  Tap the + button below to log your first expense!
                </ThemedText>
              </View>
            )}
          </View>
        </ScrollView>
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
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  brandLogo: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 22,
    marginRight: 8,
    gap: 3,
  },
  logoBar: {
    width: 4,
    borderRadius: 2,
  },
  brandText: {
    fontFamily: FontFamily.bold,
    fontSize: 20,
    letterSpacing: -0.3,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  notificationDot: {
    position: 'absolute',
    top: 9,
    right: 10,
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  avatarButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontFamily: FontFamily.bold,
    fontSize: 14,
    color: '#ffffff',
  },
  greetingSection: {
    marginBottom: Spacing.three,
  },
  greetingTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 22,
    marginBottom: 2,
  },
  greetingSubtitle: {
    fontFamily: FontFamily.regular,
    fontSize: 14,
  },
  heroCard: {
    borderRadius: 24,
    padding: 20,
    marginBottom: Spacing.four,
    borderWidth: 1,
    borderColor: '#0AA88640',
    shadowColor: '#07795F',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },
  balanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  balanceLabel: {
    fontFamily: FontFamily.medium,
    fontSize: 14,
    color: 'rgba(255,255,255,0.85)',
  },
  eyeButton: {
    padding: 4,
  },
  balanceAmount: {
    fontFamily: FontFamily.extraBold,
    fontSize: 34,
    color: '#ffffff',
    marginBottom: 18,
    letterSpacing: -0.5,
  },
  summaryPillsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  summaryPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 20,
    paddingVertical: 7,
    paddingHorizontal: 8,
    gap: 4,
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  pillText: {
    fontFamily: FontFamily.semiBold,
    fontSize: 11,
  },
  card: {
    borderRadius: 20,
    padding: 16,
    marginBottom: Spacing.four,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 16,
  },
  dropdownPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 14,
    gap: 4,
  },
  dropdownText: {
    fontFamily: FontFamily.medium,
    fontSize: 12,
  },
  chartContainer: {
    flexDirection: 'row',
    height: 140,
    alignItems: 'flex-end',
  },
  yAxisLabels: {
    height: '100%',
    justifyContent: 'space-between',
    paddingRight: 10,
    paddingBottom: 22,
  },
  axisLabel: {
    fontFamily: FontFamily.regular,
    fontSize: 10,
    color: '#94A3B8',
  },
  barsContainer: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    height: '100%',
  },
  barColumn: {
    alignItems: 'center',
    flex: 1,
    height: '100%',
    justifyContent: 'flex-end',
  },
  barTrack: {
    width: 28,
    height: 100,
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginBottom: 8,
  },
  barFill: {
    width: '100%',
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
  },
  barLabel: {
    fontFamily: FontFamily.medium,
    fontSize: 12,
    color: '#64748B',
  },
  section: {
    marginBottom: Spacing.four,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 18,
  },
  viewAllText: {
    fontFamily: FontFamily.semiBold,
    fontSize: 13,
    color: '#14B896',
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 6,
  },
  catIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  catInfo: {
    flex: 1,
    marginRight: 12,
  },
  catName: {
    fontFamily: FontFamily.semiBold,
    fontSize: 14,
    marginBottom: 6,
  },
  catProgressBarTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  catProgressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  catPercent: {
    fontFamily: FontFamily.bold,
    fontSize: 13,
    color: '#64748B',
  },
  emptyCard: {
    borderRadius: 16,
    padding: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  emptyTitle: {
    fontFamily: FontFamily.semiBold,
    fontSize: 16,
    marginTop: 10,
    marginBottom: 4,
  },
  emptySubtitle: {
    fontFamily: FontFamily.regular,
    fontSize: 13,
    textAlign: 'center',
  },
});
