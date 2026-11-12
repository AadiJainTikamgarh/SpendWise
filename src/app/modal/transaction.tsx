import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  BackHandler,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { AnimatedSegmentedControl } from '@/components/ui/animated-segmented-control';
import { ScalePressable } from '@/components/ui/scale-pressable';
import { EXPENSE_CATEGORIES, getCategoryById, INCOME_CATEGORIES } from '@/constants/categories';
import { FontFamily, Spacing } from '@/constants/theme';
import { useFinance } from '@/context/finance-context';
import { useTheme } from '@/hooks/use-theme';
import { HapticsService } from '@/services/haptics';
import { TransactionType } from '@/types/finance';
import { formatDateLabel, formatTime } from '@/utils/date';
import { paiseToRupees, parseCurrencyInput } from '@/utils/money';
import { safeGoBack } from '@/utils/navigation';

const PAYMENT_ACCOUNTS = [
  'Cash',
  'UPI / Online',
  'Debit Card',
  'Credit Card',
  'Bank Transfer',
];

export default function TransactionModal() {
  const theme = useTheme();
  const { transactions, addTransaction, editTransaction, removeTransaction } = useFinance();

  const params = useLocalSearchParams<{
    id?: string;
    date?: string;
    type?: string;
  }>();

  const isEditing = Boolean(params.id);
  const existingTx = isEditing ? transactions.find((t) => t.id === params.id) : null;

  const [type, setType] = useState<TransactionType>(
    (params.type as TransactionType) || existingTx?.type || 'expense'
  );
  const [amountInput, setAmountInput] = useState(
    existingTx ? paiseToRupees(existingTx.amount).toString() : ''
  );
  const [title, setTitle] = useState(existingTx?.title || '');
  const [categoryId, setCategoryId] = useState(
    existingTx?.categoryId || (type === 'expense' ? EXPENSE_CATEGORIES[0].id : INCOME_CATEGORIES[0].id)
  );
  const [account, setAccount] = useState(existingTx?.paymentMethod || 'UPI / Online');
  const [notes, setNotes] = useState(existingTx?.notes || '');
  const [date] = useState(existingTx?.date || params.date || new Date().toISOString());

  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [showAccountPicker, setShowAccountPicker] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const amountScale = useSharedValue(1);
  const amountAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: amountScale.value }],
  }));

  const handleAmountChange = (text: string) => {
    setAmountInput(text);
    if (text.length > 0) {
      HapticsService.selection();
      amountScale.value = withSequence(
        withTiming(1.05, { duration: 60 }),
        withSpring(1, { damping: 12, stiffness: 350 })
      );
    }
  };

  useEffect(() => {
    const onBackPress = () => {
      safeGoBack('/');
      return true;
    };
    const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => sub.remove();
  }, []);

  const handleTypeChange = (newType: TransactionType) => {
    setType(newType);
    const currentList = newType === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;
    if (!currentList.some((c) => c.id === categoryId)) {
      setCategoryId(currentList[0].id);
    }
  };

  const handleSave = async () => {
    setErrorMessage(null);

    const amountInPaise = parseCurrencyInput(amountInput);
    if (amountInPaise <= 0) {
      setErrorMessage('Please enter an amount greater than ₹0');
      return;
    }

    if (!title.trim()) {
      setErrorMessage('Please enter a description / merchant title');
      return;
    }

    setIsSaving(true);
    try {
      if (isEditing && existingTx) {
        await editTransaction(existingTx.id, {
          amount: amountInPaise,
          type,
          categoryId,
          title: title.trim(),
          paymentMethod: account,
          notes: notes.trim() || undefined,
        });
      } else {
        await addTransaction({
          amount: amountInPaise,
          type,
          categoryId,
          title: title.trim(),
          paymentMethod: account,
          notes: notes.trim() || undefined,
          date,
          source: 'manual',
        });
      }
      HapticsService.success();
      safeGoBack('/');
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to save transaction');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = () => {
    if (!existingTx) return;

    Alert.alert(
      'Delete Transaction',
      'Are you sure you want to permanently delete this transaction?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setIsSaving(true);
            try {
              HapticsService.heavy();
              await removeTransaction(existingTx.id);
              safeGoBack('/');
            } catch (err: any) {
              setErrorMessage(err?.message || 'Failed to delete transaction');
              setIsSaving(false);
            }
          },
        },
      ]
    );
  };

  const selectedCategory = getCategoryById(categoryId);
  const categoriesList = type === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          
          {/* Header */}
          <View style={styles.header}>
            <Pressable hitSlop={12} onPress={() => safeGoBack('/')} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color={theme.text} />
            </Pressable>

            <ThemedText style={styles.headerTitle}>
              {isEditing ? 'Edit Transaction' : 'Add Transaction'}
            </ThemedText>

            <View style={{ width: 32 }} />
          </View>

          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>

            {/* Segmented Type Switcher */}
            <AnimatedSegmentedControl<TransactionType>
              options={[
                { key: 'expense', label: 'Expense', icon: 'arrow-down', activeColor: theme.expense },
                { key: 'income', label: 'Income', icon: 'arrow-up', activeColor: theme.income },
                { key: 'transfer', label: 'Transfer', icon: 'swap-horizontal', activeColor: '#3B82F6' },
              ]}
              selectedKey={type}
              onSelect={handleTypeChange}
              backgroundColor={theme.card}
              borderColor={theme.border}
            />

            {/* Giant Hero Amount Input */}
            <Animated.View style={[styles.heroAmountContainer, amountAnimatedStyle]}>
              <ThemedText style={[styles.currencyPrefix, { color: theme.text }]}>₹</ThemedText>
              <TextInput
                style={[styles.heroAmountInput, { color: theme.text }]}
                keyboardType="decimal-pad"
                placeholder="0"
                placeholderTextColor={theme.textSecondary}
                value={amountInput}
                onChangeText={handleAmountChange}
                autoFocus={!isEditing}
              />
            </Animated.View>

            {/* Error Message */}
            {errorMessage ? (
              <View style={[styles.errorBox, { backgroundColor: `${theme.expense}15` }]}>
                <Ionicons name="alert-circle-outline" size={18} color={theme.expense} style={{ marginRight: 6 }} />
                <ThemedText style={[styles.errorText, { color: theme.expense }]}>
                  {errorMessage}
                </ThemedText>
              </View>
            ) : null}

            {/* Structured Form Rows */}
            <View style={[styles.formCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
              {/* Category Row */}
              <Pressable
                style={[styles.formRow, { borderBottomColor: theme.border }]}
                onPress={() => setShowCategoryPicker(true)}>
                <View style={[styles.rowIconBox, { backgroundColor: `${selectedCategory.color}18` }]}>
                  <Ionicons name={selectedCategory.icon as any} size={20} color={selectedCategory.color} />
                </View>

                <View style={styles.rowContent}>
                  <ThemedText style={styles.rowLabel}>Category</ThemedText>
                  <ThemedText style={styles.rowValue}>{selectedCategory.name}</ThemedText>
                </View>

                <Ionicons name="chevron-forward" size={18} color={theme.textSecondary} />
              </Pressable>

              {/* Description / Merchant Row */}
              <View style={[styles.formRow, { borderBottomColor: theme.border }]}>
                <View style={[styles.rowIconBox, { backgroundColor: `${theme.primary}12` }]}>
                  <Ionicons name="document-text-outline" size={20} color={theme.primary} />
                </View>

                <View style={styles.rowContent}>
                  <ThemedText style={styles.rowLabel}>Description</ThemedText>
                  <TextInput
                    style={[styles.rowInput, { color: theme.text }]}
                    placeholder="e.g. Groceries, Coffee, Salary"
                    placeholderTextColor={theme.textSecondary}
                    value={title}
                    onChangeText={setTitle}
                  />
                </View>
              </View>

              {/* Date & Time Row */}
              <View style={[styles.formRow, { borderBottomColor: theme.border }]}>
                <View style={[styles.rowIconBox, { backgroundColor: `${theme.accent}15` }]}>
                  <Ionicons name="calendar-outline" size={20} color={theme.accent} />
                </View>

                <View style={styles.rowContent}>
                  <ThemedText style={styles.rowLabel}>Date & Time</ThemedText>
                  <ThemedText style={styles.rowValue}>
                    {formatDateLabel(date)}, {formatTime(date)}
                  </ThemedText>
                </View>
              </View>

              {/* Account / Payment Method Row */}
              <Pressable
                style={styles.formRow}
                onPress={() => setShowAccountPicker(true)}>
                <View style={[styles.rowIconBox, { backgroundColor: '#6366F115' }]}>
                  <Ionicons name="card-outline" size={20} color="#6366F1" />
                </View>

                <View style={styles.rowContent}>
                  <ThemedText style={styles.rowLabel}>Account</ThemedText>
                  <ThemedText style={styles.rowValue}>{account}</ThemedText>
                </View>

                <Ionicons name="chevron-forward" size={18} color={theme.textSecondary} />
              </Pressable>
            </View>

            {/* Optional Notes Card */}
            <View style={[styles.notesCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <TextInput
                style={[styles.notesInput, { color: theme.text }]}
                placeholder="Optional notes or remarks..."
                placeholderTextColor={theme.textSecondary}
                value={notes}
                onChangeText={setNotes}
                multiline
                numberOfLines={2}
              />
            </View>

            {/* Submit Action Button */}
            <ScalePressable
              scaleTo={0.97}
              haptic="medium"
              style={[
                styles.submitBtn,
                { backgroundColor: theme.primary },
                isSaving && { opacity: 0.7 },
              ]}
              onPress={handleSave}
              disabled={isSaving}>
              {isSaving ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <ThemedText style={styles.submitBtnText}>
                  {isEditing ? 'Save Changes' : 'Add Transaction'}
                </ThemedText>
              )}
            </ScalePressable>

            {/* Delete Option if editing */}
            {isEditing ? (
              <ScalePressable
                scaleTo={0.97}
                haptic="heavy"
                style={[styles.deleteBtn, { borderColor: theme.expense }]}
                onPress={handleDelete}
                disabled={isSaving}>
                <Ionicons name="trash-outline" size={18} color={theme.expense} style={{ marginRight: 6 }} />
                <ThemedText style={[styles.deleteBtnText, { color: theme.expense }]}>
                  Delete Transaction
                </ThemedText>
              </ScalePressable>
            ) : null}
          </ScrollView>

          {/* Category Picker Modal */}
          <Modal
            visible={showCategoryPicker}
            transparent
            animationType="slide"
            onRequestClose={() => setShowCategoryPicker(false)}>
            <View style={styles.pickerOverlay}>
              <View style={[styles.pickerCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <View style={styles.pickerHeader}>
                  <ThemedText style={styles.pickerTitle}>Select Category</ThemedText>
                  <Pressable onPress={() => setShowCategoryPicker(false)} hitSlop={10}>
                    <Ionicons name="close" size={22} color={theme.text} />
                  </Pressable>
                </View>

                <ScrollView contentContainerStyle={styles.pickerGrid}>
                  {categoriesList.map((cat) => (
                    <ScalePressable
                      key={cat.id}
                      scaleTo={0.92}
                      haptic="selection"
                      style={[
                        styles.pickerItem,
                        cat.id === categoryId && { backgroundColor: `${theme.primary}18`, borderColor: theme.primary },
                      ]}
                      onPress={() => {
                        setCategoryId(cat.id);
                        setShowCategoryPicker(false);
                      }}>
                      <View style={[styles.pickerIconBox, { backgroundColor: `${cat.color}20` }]}>
                        <Ionicons name={cat.icon as any} size={22} color={cat.color} />
                      </View>
                      <ThemedText style={styles.pickerItemName} numberOfLines={1}>
                        {cat.name}
                      </ThemedText>
                    </ScalePressable>
                  ))}
                </ScrollView>
              </View>
            </View>
          </Modal>

          {/* Account Picker Modal */}
          <Modal
            visible={showAccountPicker}
            transparent
            animationType="slide"
            onRequestClose={() => setShowAccountPicker(false)}>
            <View style={styles.pickerOverlay}>
              <View style={[styles.pickerCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <View style={styles.pickerHeader}>
                  <ThemedText style={styles.pickerTitle}>Select Account</ThemedText>
                  <Pressable onPress={() => setShowAccountPicker(false)} hitSlop={10}>
                    <Ionicons name="close" size={22} color={theme.text} />
                  </Pressable>
                </View>

                <View style={{ paddingVertical: 10 }}>
                  {PAYMENT_ACCOUNTS.map((acc) => (
                    <Pressable
                      key={acc}
                      style={[
                        styles.accountRow,
                        acc === account && { backgroundColor: `${theme.primary}15` },
                      ]}
                      onPress={() => {
                        setAccount(acc);
                        setShowAccountPicker(false);
                      }}>
                      <Ionicons
                        name="card-outline"
                        size={20}
                        color={acc === account ? theme.primary : theme.textSecondary}
                        style={{ marginRight: 12 }}
                      />
                      <ThemedText
                        style={[
                          styles.accountRowText,
                          acc === account && { color: theme.primary, fontFamily: FontFamily.bold },
                        ]}>
                        {acc}
                      </ThemedText>
                    </Pressable>
                  ))}
                </View>
              </View>
            </View>
          </Modal>

        </KeyboardAvoidingView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
  },
  closeBtn: {
    padding: 6,
  },
  headerTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 18,
  },
  scrollContent: {
    paddingHorizontal: Spacing.four,
    paddingBottom: 40,
  },
  typeSwitcher: {
    flexDirection: 'row',
    borderRadius: 24,
    borderWidth: 1,
    padding: 4,
    marginVertical: Spacing.three,
  },
  typeTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 20,
  },
  typeTabText: {
    fontFamily: FontFamily.semiBold,
    fontSize: 14,
  },
  heroAmountContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
  },
  currencyPrefix: {
    fontFamily: FontFamily.extraBold,
    fontSize: 42,
    marginRight: 4,
  },
  heroAmountInput: {
    fontFamily: FontFamily.extraBold,
    fontSize: 48,
    minWidth: 100,
    textAlign: 'left',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  errorText: {
    fontFamily: FontFamily.medium,
    fontSize: 13,
  },
  formCard: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: Spacing.three,
  },
  formRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  rowIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  rowContent: {
    flex: 1,
  },
  rowLabel: {
    fontFamily: FontFamily.regular,
    fontSize: 12,
    color: '#94A3B8',
    marginBottom: 2,
  },
  rowValue: {
    fontFamily: FontFamily.semiBold,
    fontSize: 15,
  },
  rowInput: {
    fontFamily: FontFamily.semiBold,
    fontSize: 15,
    padding: 0,
  },
  notesCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    marginBottom: Spacing.four,
  },
  notesInput: {
    fontFamily: FontFamily.regular,
    fontSize: 14,
    textAlignVertical: 'top',
  },
  submitBtn: {
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    shadowColor: '#14B896',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  submitBtnText: {
    fontFamily: FontFamily.bold,
    fontSize: 16,
    color: '#ffffff',
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  deleteBtnText: {
    fontFamily: FontFamily.bold,
    fontSize: 14,
  },
  pickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  pickerCard: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    maxHeight: '75%',
    padding: 20,
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  pickerTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 18,
  },
  pickerGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    paddingBottom: 30,
  },
  pickerItem: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  pickerIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  pickerItemName: {
    fontFamily: FontFamily.medium,
    fontSize: 13,
    flex: 1,
  },
  accountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  accountRowText: {
    fontFamily: FontFamily.medium,
    fontSize: 15,
  },
});
