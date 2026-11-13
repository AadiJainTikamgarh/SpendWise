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
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
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
import { parseSms } from '@/services/sms';
import { TransactionType } from '@/types/finance';
import { formatDateLabel, formatTime, isSameDay } from '@/utils/date';
import { paiseToRupees, parseCurrencyInput } from '@/utils/money';
import { safeGoBack } from '@/utils/navigation';

const PAYMENT_ACCOUNTS = [
  'Cash',
  'UPI / Online',
  'Debit Card',
  'Credit Card',
  'Bank Transfer',
];

const getAccountIcon = (acc: string) => {
  switch (acc) {
    case 'Cash':
      return 'cash-outline';
    case 'UPI / Online':
      return 'phone-portrait-outline';
    case 'Debit Card':
      return 'card-outline';
    case 'Credit Card':
      return 'card';
    case 'Bank Transfer':
      return 'business-outline';
    default:
      return 'wallet-outline';
  }
};

export default function TransactionModal() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
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
  const [account, setAccount] = useState(existingTx?.paymentMethod || 'Cash');
  const [notes, setNotes] = useState(existingTx?.notes || '');
  const [date, setDate] = useState(existingTx?.date || params.date || new Date().toISOString());

  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [showAccountPicker, setShowAccountPicker] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showPasteSmsModal, setShowPasteSmsModal] = useState(false);
  const [smsTextToParse, setSmsTextToParse] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleFillFromSms = (text: string) => {
    if (!text.trim()) {
      Alert.alert('Empty Input', 'Please paste a bank SMS message.');
      return;
    }
    const parsed = parseSms({
      id: `paste_${Date.now()}`,
      address: 'PASTED-SMS',
      body: text.trim(),
      date: Date.now(),
    });
    if (!parsed) {
      Alert.alert('Could Not Parse SMS', 'No recognized bank debit or credit was found in the text.');
      return;
    }
    setAmountInput(paiseToRupees(parsed.amount).toString());
    setType(parsed.type);
    setCategoryId(parsed.categoryId);
    setTitle(parsed.title);
    setAccount('UPI / Online');
    setNotes(
      `Auto-filled from ${parsed.bankName}${parsed.accountLast4 ? ` | A/C *${parsed.accountLast4}` : ''}${parsed.referenceNo ? ` | Ref: ${parsed.referenceNo}` : ''}`
    );
    setShowPasteSmsModal(false);
    setSmsTextToParse('');
    HapticsService.success();
  };

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

    const currentCat = getCategoryById(categoryId);
    const effectiveTitle =
      title.trim() ||
      currentCat?.name ||
      (account === 'Cash' ? 'Cash Spend' : type === 'expense' ? 'General Expense' : 'Income');

    setIsSaving(true);
    try {
      if (isEditing && existingTx) {
        await editTransaction(existingTx.id, {
          amount: amountInPaise,
          type,
          categoryId,
          title: effectiveTitle,
          paymentMethod: account,
          notes: notes.trim() || undefined,
        });
      } else {
        await addTransaction({
          amount: amountInPaise,
          type,
          categoryId,
          title: effectiveTitle,
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

            {!isEditing ? (
              <ScalePressable
                scaleTo={0.92}
                haptic="selection"
                onPress={() => setShowPasteSmsModal(true)}
                style={[
                  styles.smsQuickBtn,
                  { backgroundColor: `${theme.primary}18`, borderColor: `${theme.primary}40` },
                ]}>
                <Ionicons
                  name="chatbox-ellipses-outline"
                  size={14}
                  color={theme.primary}
                  style={{ marginRight: 4 }}
                />
                <ThemedText style={[styles.smsQuickBtnText, { color: theme.primary }]}>
                  Paste SMS
                </ThemedText>
              </ScalePressable>
            ) : (
              <View style={{ width: 32 }} />
            )}
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
                    placeholder={`e.g. ${selectedCategory.name} (optional)`}
                    placeholderTextColor={theme.textSecondary}
                    value={title}
                    onChangeText={setTitle}
                  />
                </View>
              </View>

              {/* Date & Time Row */}
              <Pressable
                style={[styles.formRow, { borderBottomColor: theme.border }]}
                onPress={() => setShowDatePicker(true)}>
                <View style={[styles.rowIconBox, { backgroundColor: `${theme.accent}15` }]}>
                  <Ionicons name="calendar-outline" size={20} color={theme.accent} />
                </View>

                <View style={styles.rowContent}>
                  <ThemedText style={styles.rowLabel}>Date & Time</ThemedText>
                  <ThemedText style={styles.rowValue}>
                    {formatDateLabel(date)}, {formatTime(date)}
                  </ThemedText>
                </View>

                <Ionicons name="chevron-forward" size={18} color={theme.textSecondary} />
              </Pressable>

              {/* Account / Payment Method Row */}
              <Pressable
                style={styles.formRow}
                onPress={() => setShowAccountPicker(true)}>
                <View
                  style={[
                    styles.rowIconBox,
                    {
                      backgroundColor:
                        account === 'Cash' ? '#10B98115' : '#6366F115',
                    },
                  ]}>
                  <Ionicons
                    name={getAccountIcon(account) as any}
                    size={20}
                    color={account === 'Cash' ? '#10B981' : '#6366F1'}
                  />
                </View>

                <View style={styles.rowContent}>
                  <ThemedText style={styles.rowLabel}>Account / Method</ThemedText>
                  <ThemedText style={styles.rowValue}>
                    {account === 'Cash' ? 'Cash 💵' : account}
                  </ThemedText>
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
              <View style={[styles.pickerCard, { backgroundColor: theme.card, borderColor: theme.border, paddingBottom: Math.max(20, insets.bottom + 16) }]}>
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
              <View style={[styles.pickerCard, { backgroundColor: theme.card, borderColor: theme.border, paddingBottom: Math.max(20, insets.bottom + 16) }]}>
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
                        name={getAccountIcon(acc) as any}
                        size={20}
                        color={acc === account ? theme.primary : theme.textSecondary}
                        style={{ marginRight: 12 }}
                      />
                      <ThemedText
                        style={[
                          styles.accountRowText,
                          acc === account && { color: theme.primary, fontFamily: FontFamily.bold },
                        ]}>
                        {acc === 'Cash' ? 'Cash 💵' : acc}
                      </ThemedText>
                    </Pressable>
                  ))}
                </View>
              </View>
            </View>
          </Modal>

          {/* Date Picker Modal */}
          <Modal
            visible={showDatePicker}
            transparent
            animationType="slide"
            onRequestClose={() => setShowDatePicker(false)}>
            <View style={styles.pickerOverlay}>
              <View style={[styles.pickerCard, { backgroundColor: theme.card, borderColor: theme.border, paddingBottom: Math.max(20, insets.bottom + 16) }]}>
                <View style={styles.pickerHeader}>
                  <ThemedText style={styles.pickerTitle}>Select Date</ThemedText>
                  <Pressable onPress={() => setShowDatePicker(false)} hitSlop={10}>
                    <Ionicons name="close" size={22} color={theme.text} />
                  </Pressable>
                </View>

                {/* Quick Presets */}
                <View style={styles.datePresetsRow}>
                  {[
                    { label: 'Today', offset: 0 },
                    { label: 'Yesterday', offset: 1 },
                    { label: '2 Days Ago', offset: 2 },
                  ].map((p) => {
                    const target = new Date();
                    target.setDate(target.getDate() - p.offset);
                    const isSelected = isSameDay(date, target);

                    return (
                      <ScalePressable
                        key={p.label}
                        scaleTo={0.93}
                        haptic="selection"
                        style={[
                          styles.datePresetChip,
                          { backgroundColor: theme.background, borderColor: theme.border },
                          isSelected && { backgroundColor: `${theme.primary}18`, borderColor: theme.primary },
                        ]}
                        onPress={() => {
                          const newD = new Date();
                          newD.setDate(newD.getDate() - p.offset);
                          setDate(newD.toISOString());
                          HapticsService.selection();
                          setShowDatePicker(false);
                        }}>
                        <ThemedText
                          style={[
                            styles.datePresetText,
                            { color: isSelected ? theme.primary : theme.text },
                          ]}>
                          {p.label}
                        </ThemedText>
                      </ScalePressable>
                    );
                  })}
                </View>

                {/* Past 14 Days List */}
                <ThemedText style={styles.recentDatesLabel} themeColor="textSecondary">
                  Past 14 Days:
                </ThemedText>
                <ScrollView style={{ maxHeight: 220 }} showsVerticalScrollIndicator={false}>
                  {Array.from({ length: 14 }).map((_, idx) => {
                    const d = new Date();
                    d.setDate(d.getDate() - idx);
                    const isSelected = isSameDay(date, d);
                    const dayName = d.toLocaleDateString('en-IN', { weekday: 'short' });
                    const dateFormatted = d.toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    });

                    return (
                      <Pressable
                        key={idx}
                        style={[
                          styles.dateRowItem,
                          isSelected && { backgroundColor: `${theme.primary}12` },
                        ]}
                        onPress={() => {
                          setDate(d.toISOString());
                          HapticsService.selection();
                          setShowDatePicker(false);
                        }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                          <View
                            style={[
                              styles.dateDayBadge,
                              { backgroundColor: theme.background, borderColor: theme.border },
                              isSelected && { borderColor: theme.primary, backgroundColor: theme.primary },
                            ]}>
                            <ThemedText
                              style={[
                                styles.dateDayText,
                                { color: isSelected ? '#FFFFFF' : theme.textSecondary },
                              ]}>
                              {dayName}
                            </ThemedText>
                          </View>
                          <ThemedText
                            style={[
                              styles.dateItemText,
                              isSelected && { color: theme.primary, fontFamily: FontFamily.bold },
                            ]}>
                            {dateFormatted}
                          </ThemedText>
                        </View>
                        {isSelected ? (
                          <Ionicons name="checkmark-circle" size={18} color={theme.primary} />
                        ) : null}
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>
            </View>
          </Modal>

          {/* Quick Paste SMS Autofill Modal */}
          <Modal
            visible={showPasteSmsModal}
            transparent
            animationType="slide"
            onRequestClose={() => setShowPasteSmsModal(false)}>
            <View style={styles.pickerOverlay}>
              <View
                style={[
                  styles.pickerCard,
                  {
                    backgroundColor: theme.card,
                    borderColor: theme.border,
                    paddingBottom: Math.max(20, insets.bottom + 16),
                  },
                ]}>
                <View style={styles.pickerHeader}>
                  <ThemedText style={styles.pickerTitle}>Autofill from Bank SMS</ThemedText>
                  <Pressable onPress={() => setShowPasteSmsModal(false)} hitSlop={10}>
                    <Ionicons name="close" size={22} color={theme.text} />
                  </Pressable>
                </View>

                <ThemedText style={styles.pickerSubtitle} themeColor="textSecondary">
                  Paste any SMS from Union Bank, SBI, HDFC, ICICI, etc., and SpendWise will automatically fill the amount, merchant, and category!
                </ThemedText>

                <TextInput
                  style={[
                    styles.modalSmsInput,
                    {
                      backgroundColor: theme.background,
                      borderColor: theme.border,
                      color: theme.text,
                    },
                  ]}
                  placeholder="Paste bank transaction SMS here..."
                  placeholderTextColor={theme.textSecondary}
                  value={smsTextToParse}
                  onChangeText={setSmsTextToParse}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />

                <ScalePressable
                  scaleTo={0.97}
                  haptic="medium"
                  style={[styles.submitBtn, { backgroundColor: theme.primary, marginTop: 14 }]}
                  onPress={() => handleFillFromSms(smsTextToParse)}>
                  <ThemedText style={styles.submitBtnText}>Autofill Transaction</ThemedText>
                </ScalePressable>
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
  datePresetsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 6,
    marginBottom: 14,
  },
  datePresetChip: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  datePresetText: {
    fontFamily: FontFamily.semiBold,
    fontSize: 12,
  },
  recentDatesLabel: {
    fontFamily: FontFamily.medium,
    fontSize: 12,
    marginBottom: 6,
  },
  dateRowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 4,
  },
  dateDayBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  dateDayText: {
    fontFamily: FontFamily.bold,
    fontSize: 11,
  },
  dateItemText: {
    fontFamily: FontFamily.medium,
    fontSize: 13,
  },
  smsQuickBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
  },
  smsQuickBtnText: {
    fontSize: 12,
    fontFamily: FontFamily.bold,
  },
  modalSmsInput: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    fontSize: 13,
    fontFamily: FontFamily.regular,
    minHeight: 90,
    marginTop: 10,
  },
  pickerSubtitle: {
    fontSize: 13,
    fontFamily: FontFamily.regular,
    marginBottom: 10,
    lineHeight: 18,
  },
});
