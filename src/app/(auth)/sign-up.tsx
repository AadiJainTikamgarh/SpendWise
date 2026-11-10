import { Ionicons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
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

export default function SignUpScreen() {
  const theme = useTheme();
  const { signUpWithEmail, signInWithGoogle } = useAuth();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [isNameFocused, setIsNameFocused] = useState(false);
  const [isEmailFocused, setIsEmailFocused] = useState(false);
  const [isPasswordFocused, setIsPasswordFocused] = useState(false);
  const [isConfirmPasswordFocused, setIsConfirmPasswordFocused] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const passwordsMatch = password.length > 0 && confirmPassword.length > 0 && password === confirmPassword;
  const passwordMismatch = confirmPassword.length > 0 && password !== confirmPassword;

  const handleSignUp = async () => {
    if (!email.trim() || !password) {
      setErrorMessage('Please fill in all required fields.');
      return;
    }

    if (password.length < 6) {
      setErrorMessage('Password must be at least 6 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const { data, error } = await signUpWithEmail(email, password, fullName);
    setIsLoading(false);

    if (error) {
      setErrorMessage(error.message);
    } else {
      if (data?.session) {
        setSuccessMessage('Account created successfully! Redirecting...');
      } else {
        setSuccessMessage(
          'Account created! Please check your email to confirm your account before signing in.'
        );
      }
    }
  };

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    setErrorMessage(null);

    const { error } = await signInWithGoogle();
    setIsGoogleLoading(false);

    if (error) {
      setErrorMessage(error.message);
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
                  <Ionicons name="wallet" size={30} color="#14B896" />
                </View>
              </View>
              <ThemedText type="subtitle" style={styles.logoTitle}>
                SpendWise
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary" style={styles.subtitle}>
                Take control of your personal finances
              </ThemedText>
            </View>

            {/* Elevated Form Card */}
            <ThemedView type="backgroundElement" style={styles.cardContainer}>
              <View style={styles.cardHeader}>
                <ThemedText type="smallBold" style={styles.cardTitle}>
                  Create Account
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  Join SpendWise to track expenses effortlessly
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
                {/* Full Name Input (Optional) */}
                <View style={styles.inputGroup}>
                  <ThemedText type="smallBold" style={styles.inputLabel}>
                    Full Name <ThemedText type="small" style={styles.optionalText}>(optional)</ThemedText>
                  </ThemedText>
                  <View
                    style={[
                      styles.inputWrapper,
                      {
                        backgroundColor: theme.background,
                        borderColor: isNameFocused ? '#14B896' : theme.backgroundSelected,
                      },
                    ]}>
                    <Ionicons
                      name="person-outline"
                      size={20}
                      color={isNameFocused ? '#14B896' : theme.textSecondary}
                      style={styles.inputLeadingIcon}
                    />
                    <TextInput
                      style={[styles.input, { color: theme.text }]}
                      placeholder="e.g. Aadi Jain"
                      placeholderTextColor={theme.textSecondary}
                      value={fullName}
                      onChangeText={setFullName}
                      onFocus={() => setIsNameFocused(true)}
                      onBlur={() => setIsNameFocused(false)}
                      autoCapitalize="words"
                    />
                  </View>
                </View>

                {/* Email Input */}
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

                {/* Password Input */}
                <View style={styles.inputGroup}>
                  <View style={styles.labelWithHintRow}>
                    <ThemedText type="smallBold" style={styles.inputLabel}>
                      Password
                    </ThemedText>
                    <ThemedText type="small" themeColor="textSecondary" style={styles.hintText}>
                      Min 6 characters
                    </ThemedText>
                  </View>
                  <View
                    style={[
                      styles.inputWrapper,
                      {
                        backgroundColor: theme.background,
                        borderColor: isPasswordFocused ? '#14B896' : theme.backgroundSelected,
                      },
                    ]}>
                    <Ionicons
                      name="lock-closed-outline"
                      size={20}
                      color={isPasswordFocused ? '#14B896' : theme.textSecondary}
                      style={styles.inputLeadingIcon}
                    />
                    <TextInput
                      style={[styles.input, { color: theme.text }]}
                      placeholder="Create a strong password"
                      placeholderTextColor={theme.textSecondary}
                      value={password}
                      onChangeText={setPassword}
                      onFocus={() => setIsPasswordFocused(true)}
                      onBlur={() => setIsPasswordFocused(false)}
                      secureTextEntry={!showPassword}
                      autoCapitalize="none"
                    />
                    <Pressable
                      style={styles.eyeIconButton}
                      onPress={() => setShowPassword((prev) => !prev)}
                      hitSlop={8}>
                      <Ionicons
                        name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                        size={20}
                        color={theme.textSecondary}
                      />
                    </Pressable>
                  </View>
                </View>

                {/* Confirm Password Input */}
                <View style={styles.inputGroup}>
                  <View style={styles.labelWithHintRow}>
                    <ThemedText type="smallBold" style={styles.inputLabel}>
                      Confirm Password
                    </ThemedText>
                    {passwordsMatch ? (
                      <View style={styles.matchIndicatorRow}>
                        <Ionicons name="checkmark-circle" size={14} color="#52c41a" />
                        <ThemedText type="small" style={{ color: '#52c41a', fontSize: 12 }}>
                          Match
                        </ThemedText>
                      </View>
                    ) : passwordMismatch ? (
                      <ThemedText type="small" style={{ color: '#ff4d4f', fontSize: 12 }}>
                        Passwords do not match
                      </ThemedText>
                    ) : null}
                  </View>
                  <View
                    style={[
                      styles.inputWrapper,
                      {
                        backgroundColor: theme.background,
                        borderColor: isConfirmPasswordFocused
                          ? '#14B896'
                          : passwordMismatch
                            ? '#ff4d4f80'
                            : theme.backgroundSelected,
                      },
                    ]}>
                    <Ionicons
                      name="lock-closed-outline"
                      size={20}
                      color={isConfirmPasswordFocused ? '#14B896' : theme.textSecondary}
                      style={styles.inputLeadingIcon}
                    />
                    <TextInput
                      style={[styles.input, { color: theme.text }]}
                      placeholder="Re-enter your password"
                      placeholderTextColor={theme.textSecondary}
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      onFocus={() => setIsConfirmPasswordFocused(true)}
                      onBlur={() => setIsConfirmPasswordFocused(false)}
                      secureTextEntry={!showConfirmPassword}
                      autoCapitalize="none"
                    />
                    <Pressable
                      style={styles.eyeIconButton}
                      onPress={() => setShowConfirmPassword((prev) => !prev)}
                      hitSlop={8}>
                      <Ionicons
                        name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                        size={20}
                        color={theme.textSecondary}
                      />
                    </Pressable>
                  </View>
                </View>

                {/* Primary Create Account Button */}
                <Pressable
                  style={[styles.primaryButton, isLoading && styles.buttonDisabled]}
                  onPress={handleSignUp}
                  disabled={isLoading || isGoogleLoading}>
                  {isLoading ? (
                    <ActivityIndicator color="#ffffff" />
                  ) : (
                    <View style={styles.buttonInner}>
                      <ThemedText style={styles.primaryButtonText}>Create Account</ThemedText>
                      <Ionicons name="arrow-forward" size={18} color="#ffffff" />
                    </View>
                  )}
                </Pressable>

                {/* Divider */}
                <View style={styles.dividerRow}>
                  <View style={[styles.dividerLine, { backgroundColor: theme.backgroundSelected }]} />
                  <ThemedText type="small" style={styles.dividerText} themeColor="textSecondary">
                    or continue with
                  </ThemedText>
                  <View style={[styles.dividerLine, { backgroundColor: theme.backgroundSelected }]} />
                </View>

                {/* Google Sign In Button */}
                <Pressable
                  style={[
                    styles.googleButton,
                    {
                      backgroundColor: theme.background,
                      borderColor: theme.backgroundSelected,
                    },
                    isGoogleLoading && styles.buttonDisabled,
                  ]}
                  onPress={handleGoogleSignIn}
                  disabled={isLoading || isGoogleLoading}>
                  {isGoogleLoading ? (
                    <ActivityIndicator color={theme.text} />
                  ) : (
                    <View style={styles.buttonInner}>
                      <Ionicons name="logo-google" size={18} color="#EA4335" />
                      <ThemedText style={styles.googleButtonText}>Continue with Google</ThemedText>
                    </View>
                  )}
                </Pressable>
              </View>
            </ThemedView>

            {/* Footer Navigation */}
            <View style={styles.footer}>
              <ThemedText themeColor="textSecondary">Already have an account? </ThemedText>
              <Link href="/(auth)/login" asChild>
                <Pressable hitSlop={8}>
                  <ThemedText type="smallBold" style={{ color: '#14B896' }}>
                    Sign In
                  </ThemedText>
                </Pressable>
              </Link>
            </View>
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
  optionalText: {
    fontSize: 12,
    color: '#888888',
    fontWeight: '400',
  },
  labelWithHintRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  hintText: {
    fontSize: 12,
  },
  matchIndicatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
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
  eyeIconButton: {
    padding: Spacing.one,
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
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: Spacing.two,
    gap: Spacing.two,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    fontSize: 12,
  },
  googleButton: {
    height: 50,
    borderRadius: 12,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  googleButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.65,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Spacing.four,
  },
});
