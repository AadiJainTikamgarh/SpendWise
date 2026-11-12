import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { FontFamily, MaxContentWidth, Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { useAppTheme } from '@/hooks/use-theme';
import {
  FeedbackCategory,
  FeedbackService,
  QUICK_FEATURE_SUGGESTIONS,
} from '@/services/feedback-service';
import { safeGoBack } from '@/utils/navigation';

interface CategoryOption {
  key: FeedbackCategory;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
}

const CATEGORIES: CategoryOption[] = [
  {
    key: 'feature_request',
    label: 'Feature Request',
    icon: 'bulb-outline',
    color: '#F59E0B',
  },
  {
    key: 'bug_report',
    label: 'Bug Report',
    icon: 'bug-outline',
    color: '#EF4444',
  },
  {
    key: 'app_experience',
    label: 'App Experience',
    icon: 'heart-outline',
    color: '#EC4899',
  },
  {
    key: 'general',
    label: 'General Feedback',
    icon: 'chatbubble-ellipses-outline',
    color: '#14B896',
  },
];

const RATING_LABELS = [
  '',
  '1: Needs major work',
  '2: Fair, room to grow',
  '3: Good, does the job',
  '4: Very good experience',
  '5: Excellent, love it!',
];

export default function FeedbackScreen() {
  const { theme, isDark } = useAppTheme();
  const { user } = useAuth();

  const [category, setCategory] = useState<FeedbackCategory>('feature_request');
  const [rating, setRating] = useState<number>(5);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleBack = () => {
    safeGoBack('/profile');
  };

  const handleApplySuggestion = (suggestion: string) => {
    setTitle(suggestion);
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      Alert.alert('Title Required', 'Please enter a brief summary or title for your feedback.');
      return;
    }

    if (!description.trim()) {
      Alert.alert('Details Required', 'Please share some details so we understand your suggestion.');
      return;
    }

    setIsSubmitting(true);
    try {
      await FeedbackService.submitFeedback({
        category,
        rating,
        title: title.trim(),
        description: description.trim(),
        userId: isAnonymous ? undefined : user?.id,
        userEmail: isAnonymous ? undefined : user?.email,
      });

      setIsSubmitted(true);
    } catch {
      Alert.alert(
        'Submission Failed',
        'Could not save feedback at this moment. You can also send it directly via email.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendViaEmail = async () => {
    if (!title.trim() && !description.trim()) {
      Alert.alert('Feedback Empty', 'Please enter a title or description before opening email.');
      return;
    }

    await FeedbackService.sendViaEmail({
      category,
      rating,
      title: title.trim() || 'SpendWise Feedback',
      description: description.trim(),
      userEmail: isAnonymous ? undefined : user?.email,
    });
  };

  const handleResetForm = () => {
    setTitle('');
    setDescription('');
    setRating(5);
    setIsSubmitted(false);
  };

  const getTitlePlaceholder = () => {
    switch (category) {
      case 'feature_request':
        return 'e.g. Add recurring bill reminders';
      case 'bug_report':
        return 'e.g. Chart numbers glitch after currency toggle';
      case 'app_experience':
        return 'e.g. Beautiful dark mode and smooth animations';
      default:
        return 'e.g. Ideas to improve SpendWise';
    }
  };

  const getDescriptionPlaceholder = () => {
    switch (category) {
      case 'feature_request':
        return 'Describe the feature you would love to see. How should it work and why would it help you manage finances?';
      case 'bug_report':
        return 'What happened? What screen were you on? Any details to help us reproduce the issue.';
      case 'app_experience':
        return 'What do you enjoy most about SpendWise? What could we polish to make it feel even better?';
      default:
        return 'Share your feedback, ideas, or comments with our development team.';
    }
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right', 'bottom']}>
        {/* Header Bar */}
        <View style={styles.header}>
          <Pressable
            style={[styles.backButton, { backgroundColor: theme.card, borderColor: theme.border }]}
            onPress={handleBack}
            hitSlop={8}>
            <Ionicons name="arrow-back" size={20} color={theme.text} />
          </Pressable>
          <View style={styles.headerTextCol}>
            <ThemedText style={styles.headerTitle}>Feedback & Ideas</ThemedText>
            <ThemedText style={styles.headerSubtitle} themeColor="textSecondary">
              Help us shape SpendWise
            </ThemedText>
          </View>
          <View style={{ width: 40 }} />
        </View>

        {isSubmitted ? (
          /* Confirmation / Success View */
          <ScrollView contentContainerStyle={styles.successContainer}>
            <View
              style={[
                styles.successCard,
                {
                  backgroundColor: theme.card,
                  borderColor: theme.border,
                },
              ]}>
              <View style={styles.successIconBadge}>
                <Ionicons name="checkmark-circle" size={56} color="#10B981" />
              </View>

              <ThemedText style={styles.successTitle}>Thank You!</ThemedText>
              <ThemedText style={styles.successSubtitle} themeColor="textSecondary">
                Your feedback has been received. Every suggestion helps us improve SpendWise for everyone.
              </ThemedText>

              <View
                style={[
                  styles.submittedSummaryBox,
                  {
                    backgroundColor: isDark ? '#142820' : '#E6FAF3',
                    borderColor: isDark ? '#1D4536' : '#A7F3D0',
                  },
                ]}>
                <ThemedText style={[styles.submittedSummaryCategory, { color: theme.primary }]}>
                  {CATEGORIES.find((c) => c.key === category)?.label}
                </ThemedText>
                <ThemedText style={styles.submittedSummaryTitle} numberOfLines={2}>
                  {title}
                </ThemedText>
              </View>

              <Pressable
                style={[styles.doneButton, { backgroundColor: theme.primary }]}
                onPress={handleBack}>
                <ThemedText style={styles.doneButtonText}>Back to Profile</ThemedText>
              </Pressable>

              <Pressable style={styles.anotherButton} onPress={handleResetForm}>
                <ThemedText style={[styles.anotherButtonText, { color: theme.primary }]}>
                  Submit Another Feedback
                </ThemedText>
              </Pressable>
            </View>
          </ScrollView>
        ) : (
          /* Main Input Form */
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={{ flex: 1 }}>
            <ScrollView
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled">
              
              {/* Category Selector */}
              <View style={styles.section}>
                <ThemedText style={styles.sectionLabel}>Select Category</ThemedText>
                <View style={styles.categoryGrid}>
                  {CATEGORIES.map((cat) => {
                    const isSelected = category === cat.key;
                    return (
                      <Pressable
                        key={cat.key}
                        style={[
                          styles.categoryCard,
                          {
                            backgroundColor: isSelected
                              ? isDark
                                ? '#0F2922'
                                : '#ECFDF5'
                              : theme.card,
                            borderColor: isSelected ? theme.primary : theme.border,
                          },
                        ]}
                        onPress={() => setCategory(cat.key)}>
                        <View
                          style={[
                            styles.categoryIconCircle,
                            { backgroundColor: `${cat.color}15` },
                          ]}>
                          <Ionicons name={cat.icon} size={20} color={cat.color} />
                        </View>
                        <ThemedText
                          style={[
                            styles.categoryLabel,
                            {
                              color: isSelected ? theme.primary : theme.text,
                              fontFamily: isSelected ? FontFamily.bold : FontFamily.medium,
                            },
                          ]}>
                          {cat.label}
                        </ThemedText>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              {/* Star Rating Section */}
              <View
                style={[
                  styles.ratingCard,
                  { backgroundColor: theme.card, borderColor: theme.border },
                ]}>
                <ThemedText style={styles.ratingTitle}>How is your overall experience?</ThemedText>
                <View style={styles.starRow}>
                  {[1, 2, 3, 4, 5].map((starValue) => {
                    const isFilled = starValue <= rating;
                    return (
                      <Pressable
                        key={starValue}
                        onPress={() => setRating(starValue)}
                        hitSlop={8}
                        style={styles.starTouch}>
                        <Ionicons
                          name={isFilled ? 'star' : 'star-outline'}
                          size={32}
                          color={isFilled ? '#F59E0B' : theme.textSecondary}
                        />
                      </Pressable>
                    );
                  })}
                </View>
                <ThemedText style={styles.ratingLabel} themeColor="textSecondary">
                  {RATING_LABELS[rating]}
                </ThemedText>
              </View>

              {/* Quick Feature Suggestions Chips (Feature Request mode) */}
              {category === 'feature_request' && (
                <View style={styles.section}>
                  <ThemedText style={styles.sectionLabel}>Popular Feature Ideas</ThemedText>
                  <View style={styles.chipsContainer}>
                    {QUICK_FEATURE_SUGGESTIONS.map((suggestion) => (
                      <Pressable
                        key={suggestion}
                        style={[
                          styles.suggestionChip,
                          {
                            backgroundColor: title === suggestion ? `${theme.primary}20` : theme.card,
                            borderColor: title === suggestion ? theme.primary : theme.border,
                          },
                        ]}
                        onPress={() => handleApplySuggestion(suggestion)}>
                        <Ionicons
                          name="sparkles-outline"
                          size={14}
                          color={title === suggestion ? theme.primary : theme.textSecondary}
                          style={{ marginRight: 6 }}
                        />
                        <ThemedText
                          style={[
                            styles.chipText,
                            {
                              color: title === suggestion ? theme.primary : theme.text,
                              fontFamily: title === suggestion ? FontFamily.bold : FontFamily.regular,
                            },
                          ]}>
                          {suggestion}
                        </ThemedText>
                      </Pressable>
                    ))}
                  </View>
                </View>
              )}

              {/* Title / Summary Input */}
              <View style={styles.section}>
                <ThemedText style={styles.sectionLabel}>Title / Subject</ThemedText>
                <TextInput
                  style={[
                    styles.textInput,
                    {
                      backgroundColor: theme.card,
                      borderColor: theme.border,
                      color: theme.text,
                    },
                  ]}
                  placeholder={getTitlePlaceholder()}
                  placeholderTextColor={theme.textSecondary}
                  value={title}
                  onChangeText={setTitle}
                  maxLength={100}
                />
              </View>

              {/* Description Input */}
              <View style={styles.section}>
                <View style={styles.sectionHeaderRow}>
                  <ThemedText style={styles.sectionLabel}>Details & Thoughts</ThemedText>
                  <ThemedText style={styles.charCount} themeColor="textSecondary">
                    {description.length} / 1000
                  </ThemedText>
                </View>
                <TextInput
                  style={[
                    styles.textAreaInput,
                    {
                      backgroundColor: theme.card,
                      borderColor: theme.border,
                      color: theme.text,
                    },
                  ]}
                  placeholder={getDescriptionPlaceholder()}
                  placeholderTextColor={theme.textSecondary}
                  value={description}
                  onChangeText={setDescription}
                  multiline
                  numberOfLines={5}
                  maxLength={1000}
                  textAlignVertical="top"
                />
              </View>

              {/* Contact & Privacy Option */}
              <Pressable
                style={[
                  styles.anonymousToggleRow,
                  { backgroundColor: theme.card, borderColor: theme.border },
                ]}
                onPress={() => setIsAnonymous(!isAnonymous)}>
                <View style={{ flex: 1 }}>
                  <ThemedText style={styles.toggleTitle}>Submit Anonymously</ThemedText>
                  <ThemedText style={styles.toggleSubtitle} themeColor="textSecondary">
                    {isAnonymous
                      ? 'No account email will be attached'
                      : `Submitting as ${user?.email || 'authenticated user'}`}
                  </ThemedText>
                </View>
                <Ionicons
                  name={isAnonymous ? 'checkbox' : 'square-outline'}
                  size={22}
                  color={isAnonymous ? theme.primary : theme.textSecondary}
                />
              </Pressable>

              {/* Submit Button */}
              <Pressable
                style={[
                  styles.submitButton,
                  { backgroundColor: theme.primary },
                  isSubmitting && { opacity: 0.7 },
                ]}
                onPress={handleSubmit}
                disabled={isSubmitting}>
                {isSubmitting ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="paper-plane-outline" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
                    <ThemedText style={styles.submitButtonText}>Submit Feedback</ThemedText>
                  </>
                )}
              </Pressable>

              {/* Alternative Action: Send via Email */}
              <Pressable
                style={[
                  styles.emailButton,
                  { borderColor: theme.border, backgroundColor: theme.card },
                ]}
                onPress={handleSendViaEmail}>
                <Ionicons name="mail-outline" size={18} color={theme.text} style={{ marginRight: 8 }} />
                <ThemedText style={styles.emailButtonText}>Open in Email App</ThemedText>
              </Pressable>

              <View style={{ height: 40 }} />
            </ScrollView>
          </KeyboardAvoidingView>
        )}
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
    alignSelf: 'center',
    width: '100%',
    maxWidth: MaxContentWidth,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTextCol: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: FontFamily.bold,
  },
  headerSubtitle: {
    fontSize: 12,
  },
  scrollContent: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.two,
  },
  section: {
    marginBottom: Spacing.three,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.one,
  },
  sectionLabel: {
    fontSize: 13,
    fontFamily: FontFamily.semiBold,
    marginBottom: Spacing.one,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  charCount: {
    fontSize: 12,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryCard: {
    width: '48.5%',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 14,
    borderWidth: 1.5,
    gap: 10,
  },
  categoryIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryLabel: {
    fontSize: 13,
    flexShrink: 1,
  },
  ratingCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    marginBottom: Spacing.three,
  },
  ratingTitle: {
    fontSize: 14,
    fontFamily: FontFamily.semiBold,
    marginBottom: 10,
  },
  starRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 6,
  },
  starTouch: {
    padding: 2,
  },
  ratingLabel: {
    fontSize: 13,
    fontFamily: FontFamily.medium,
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  suggestionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 12,
  },
  textInput: {
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 14,
    fontFamily: FontFamily.regular,
  },
  textAreaInput: {
    minHeight: 110,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    fontSize: 14,
    fontFamily: FontFamily.regular,
    lineHeight: 20,
  },
  anonymousToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: Spacing.four,
  },
  toggleTitle: {
    fontSize: 14,
    fontFamily: FontFamily.medium,
  },
  toggleSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  submitButton: {
    height: 52,
    borderRadius: 26,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.two,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontFamily: FontFamily.bold,
  },
  emailButton: {
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emailButtonText: {
    fontSize: 14,
    fontFamily: FontFamily.semiBold,
  },
  successContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.four,
  },
  successCard: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 24,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
  },
  successIconBadge: {
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 22,
    fontFamily: FontFamily.bold,
    marginBottom: 8,
  },
  successSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  submittedSummaryBox: {
    width: '100%',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 24,
  },
  submittedSummaryCategory: {
    fontSize: 11,
    fontFamily: FontFamily.bold,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  submittedSummaryTitle: {
    fontSize: 14,
    fontFamily: FontFamily.semiBold,
  },
  doneButton: {
    width: '100%',
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  doneButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontFamily: FontFamily.bold,
  },
  anotherButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  anotherButtonText: {
    fontSize: 13,
    fontFamily: FontFamily.semiBold,
  },
});
