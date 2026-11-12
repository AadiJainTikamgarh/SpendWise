import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ScalePressable } from '@/components/ui/scale-pressable';
import { getCategoryById } from '@/constants/categories';
import { FontFamily, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { Transaction } from '@/types/finance';
import { formatTime } from '@/utils/date';
import { formatINR } from '@/utils/money';

interface TransactionItemProps {
  transaction: Transaction;
  onPress?: () => void;
  showDate?: boolean;
}

export function TransactionItem({ transaction, onPress, showDate = false }: TransactionItemProps) {
  const theme = useTheme();
  const category = getCategoryById(transaction.categoryId);
  const isIncome = transaction.type === 'income';

  return (
    <ScalePressable
      scaleTo={0.98}
      haptic="light"
      style={[
        styles.container,
        {
          backgroundColor: theme.card,
          borderColor: theme.border,
        },
      ]}
      onPress={onPress}>
      <View style={[styles.iconContainer, { backgroundColor: `${category.color}18` }]}>
        <Ionicons name={category.icon as any} size={22} color={category.color} />
      </View>

      <View style={styles.detailsContainer}>
        <ThemedText style={styles.title} numberOfLines={1}>
          {transaction.title}
        </ThemedText>
        <View style={styles.subtitleRow}>
          <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
            {category.name}
          </ThemedText>
          {transaction.source && (
            <ThemedText style={styles.sourceBadgeText} themeColor="textSecondary">
              · {transaction.source === 'sms' ? '📱 SMS' : transaction.source === 'email' ? '✉️ Email' : transaction.source === 'statement' ? '📄 Statement' : '✍️ Manual'}
            </ThemedText>
          )}
        </View>
      </View>

      <View style={styles.amountContainer}>
        <ThemedText
          style={[
            styles.amount,
            { color: isIncome ? theme.income : theme.expense },
          ]}>
          {isIncome ? `+ ${formatINR(transaction.amount)}` : `- ${formatINR(transaction.amount)}`}
        </ThemedText>
        <ThemedText type="caption" themeColor="textSecondary">
          {formatTime(transaction.date)}
        </ThemedText>
      </View>
    </ScalePressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 16,
    marginBottom: 8,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  pressed: {
    opacity: 0.8,
    transform: [{ scale: 0.99 }],
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.three,
  },
  detailsContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    fontFamily: FontFamily.semiBold,
    fontSize: 15,
    marginBottom: 2,
  },
  subtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  sourceBadgeText: {
    fontSize: 11,
    fontFamily: FontFamily.medium,
  },
  amountContainer: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  amount: {
    fontFamily: FontFamily.bold,
    fontSize: 15,
    marginBottom: 2,
  },
});
