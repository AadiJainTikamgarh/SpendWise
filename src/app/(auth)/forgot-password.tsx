import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  BackHandler,
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
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { useTheme } from '@/hooks/use-theme';
import { safeGoBack } from '@/utils/navigation';

export default function ForgotPasswordScreen() {
  const theme = useTheme();
  const { sendPasswordReset } = useAuth();

  const [email, setEmail] = useState('');
  const [isEmailFocused, setIsEmailFocused] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleBack = () => {
    safeGoBack('/(auth)/login');
  };

  useEffect(() => {
    const onBackPress = () => {
      handleBack();
      return true;
    };
    const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => sub.remove();
  }, []);

  const handleReset = async () => {
    if (!email.trim()) {
      setErrorMessage('Please enter your email address.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const { error } = await sendPasswordReset(email);
    setIsLoading(false);

    if (error) {
      setErrorMessage(error.message);
    } else {
      setSuccessMessage('Password reset instructions have been sent to your email.');
    }
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboardView}>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>
            {/* Brand Header */}
            <View style={styles.header}>
              <View style={styles.emblemContainer}>
                <View style={styles.emblemGlow} />
                <View style={styles.emblemCircle}>
                  <Ionicons name="key-outline" size={28} color="#14B896" />
                </View>
              </View>
              <ThemedText type="subtitle" style={styles.logoTitle}>
                Reset Password
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary" style={styles.subtitle}>
                Enter your email to receive recovery instructions
              </ThemedText>
            </View>

            {/* Elevated Form Card */}
            <ThemedView type="backgroundElement" style={styles.cardContainer}>
              <View style={styles.cardHeader}>
                <ThemedText type="smallBold" style={styles.cardTitle}>
                  Forgot Password?
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  We will send a secure password reset link to your inbox
                </ThemedText>
              </View>

              {/* Error Alert Box */}
              {errorMessage ? (
                <View style={styles.errorBox}>
                  <Ionicons name="alert-circle-outline" size={18} color="#ff4d4f" />
                  <ThemedText style={styles.errorText}>{errorMessage}</ThemedText>
                </View>
              ) : null}

              {/* Success Alert Box */}
              {successMessage ? (
                <View style={styles.successBox}>
                  <Ionicons name="checkmark-circle-outline" size={18} color="#52c41a" />
                  <ThemedText style={styles.successText}>{successMessage}</ThemedText>
                </View>
              ) : null}

              {/* Form Fields */}
              <View style={styles.form}>
                <View style={styles.inputGroup}>
                  <ThemedText type="smallBold" style={styles.inputLabel}>
                    Email Address
                  </ThemedText>
                  <View
                    style={[
                      styles.inputWrapper,
                      {
                        backgroundColor: theme.background,
                        borderColor: isEmailFocused ? '#14B896' : theme.backgroundSelected,
                      },
                    ]}>
                    <Ionicons
                      name="mail-outline"
                      size={20}
                      color={isEmailFocused ? '#14B896' : theme.textSecondary}
                      style={styles.inputLeadingIcon}
                    />
                    <TextInput
                      style={[styles.input, { color: theme.text }]}
                      placeholder="name@example.com"
                      placeholderTextColor={theme.textSecondary}
                      value={email}
                      onChangeText={setEmail}
                      onFocus={() => setIsEmailFocused(true)}
                      onBlur={() => setIsEmailFocused(false)}
                      autoCapitalize="none"
                      keyboardType="email-address"
                      autoComplete="email"
                    />
                  </View>
                </View>

                {/* Submit Button */}
                <Pressable
                  style={[styles.primaryButton, isLoading && styles.buttonDisabled]}
                  onPress={handleReset}
                  disabled={isLoading}>
                  {isLoading ? (
                    <ActivityIndicator color="#ffffff" />
                  ) : (
                    <View style={styles.buttonInner}>
                      <ThemedText style={styles.primaryButtonText}>Send Reset Link</ThemedText>
                      <Ionicons name="paper-plane-outline" size={18} color="#ffffff" />
                    </View>
                  )}
                </Pressable>

                {/* Back to Sign In Link */}
                <Pressable style={styles.backButton} onPress={handleBack} hitSlop={8}>
                  <Ionicons name="arrow-back" size={16} color="#14B896" />
                  <ThemedText type="smallBold" style={{ color: '#14B896' }}>
                    Back to Sign In
                  </ThemedText>
                </Pressable>
              </View>
            </ThemedView>
          </ScrollView>
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
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.five,
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.four,
  },
  emblemContainer: {
    width: 68,
    height: 68,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.two,
  },
  emblemGlow: {
    position: 'absolute',
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#14B89625',
  },
  emblemCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#14B89615',
    borderWidth: 1.5,
    borderColor: '#14B89640',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoTitle: {
    fontSize: 26,
    lineHeight: 32,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  subtitle: {
    marginTop: Spacing.half,
    fontSize: 14,
    textAlign: 'center',
  },
  cardContainer: {
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
    borderRadius: 24,
    padding: Spacing.four,
    borderWidth: 1,
    borderColor: 'rgba(128, 128, 128, 0.15)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 3,
  },
  cardHeader: {
    marginBottom: Spacing.three,
    gap: 2,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    backgroundColor: '#ff4d4f15',
    borderColor: '#ff4d4f40',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    marginBottom: Spacing.three,
  },
  errorText: {
    flex: 1,
    color: '#ff4d4f',
    fontSize: 13,
    lineHeight: 18,
  },
  successBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    backgroundColor: '#52c41a15',
    borderColor: '#52c41a40',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    marginBottom: Spacing.three,
  },
  successText: {
    flex: 1,
    color: '#52c41a',
    fontSize: 13,
    lineHeight: 18,
  },
  form: {
    gap: Spacing.three,
  },
  inputGroup: {
    gap: 6,
  },
  inputLabel: {
    fontSize: 13,
    color: '#888888',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 50,
    borderRadius: 12,
    borderWidth: 1.5,
    paddingHorizontal: Spacing.three,
  },
  inputLeadingIcon: {
    marginRight: Spacing.two,
  },
  input: {
    flex: 1,
    height: '100%',
    fontSize: 15,
  },
  primaryButton: {
    height: 50,
    backgroundColor: '#14B896',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Spacing.two,
    shadowColor: '#14B896',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 2,
  },
  buttonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  buttonDisabled: {
    opacity: 0.65,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.one,
    paddingVertical: Spacing.two,
    marginTop: Spacing.one,
  },
});
