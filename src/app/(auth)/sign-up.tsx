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
  const { signUpWithEmail } = useAuth();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

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
      // Check if email confirmation is required by Supabase project
      if (data?.session) {
        setSuccessMessage('Account created successfully! Redirecting...');
      } else {
        setSuccessMessage(
          'Account created! Please check your email to confirm your account before signing in.'
        );
      }
    }
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboardView}>
          <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
            <View style={styles.header}>
              <ThemedText type="subtitle" style={styles.logoTitle}>
                Create Account
              </ThemedText>
              <ThemedText style={styles.subtitle} themeColor="textSecondary">
                Start managing your expenses with SpendWise
              </ThemedText>
            </View>

            {errorMessage ? (
              <View style={styles.errorBox}>
                <ThemedText style={styles.errorText}>{errorMessage}</ThemedText>
              </View>
            ) : null}

            {successMessage ? (
              <View style={styles.successBox}>
                <ThemedText style={styles.successText}>{successMessage}</ThemedText>
              </View>
            ) : null}

            <View style={styles.form}>
              <View style={styles.inputGroup}>
                <ThemedText type="smallBold" style={styles.label}>
                  Full Name (optional)
                </ThemedText>
                <TextInput
                  style={[
                    styles.input,
                    {
                      backgroundColor: theme.backgroundElement,
                      color: theme.text,
                      borderColor: theme.backgroundSelected,
                    },
                  ]}
                  placeholder="e.g. Aadi Jain"
                  placeholderTextColor={theme.textSecondary}
                  value={fullName}
                  onChangeText={setFullName}
                  autoCapitalize="words"
                />
              </View>

              <View style={styles.inputGroup}>
                <ThemedText type="smallBold" style={styles.label}>
                  Email
                </ThemedText>
                <TextInput
                  style={[
                    styles.input,
                    {
                      backgroundColor: theme.backgroundElement,
                      color: theme.text,
                      borderColor: theme.backgroundSelected,
                    },
                  ]}
                  placeholder="name@example.com"
                  placeholderTextColor={theme.textSecondary}
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  autoComplete="email"
                />
              </View>

              <View style={styles.inputGroup}>
                <ThemedText type="smallBold" style={styles.label}>
                  Password
                </ThemedText>
                <TextInput
                  style={[
                    styles.input,
                    {
                      backgroundColor: theme.backgroundElement,
                      color: theme.text,
                      borderColor: theme.backgroundSelected,
                    },
                  ]}
                  placeholder="Minimum 6 characters"
                  placeholderTextColor={theme.textSecondary}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.inputGroup}>
                <ThemedText type="smallBold" style={styles.label}>
                  Confirm Password
                </ThemedText>
                <TextInput
                  style={[
                    styles.input,
                    {
                      backgroundColor: theme.backgroundElement,
                      color: theme.text,
                      borderColor: theme.backgroundSelected,
                    },
                  ]}
                  placeholder="Re-enter your password"
                  placeholderTextColor={theme.textSecondary}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry
                  autoCapitalize="none"
                />
              </View>

              <Pressable
                style={[styles.primaryButton, isLoading && styles.buttonDisabled]}
                onPress={handleSignUp}
                disabled={isLoading}>
                {isLoading ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <ThemedText style={styles.primaryButtonText}>Sign Up</ThemedText>
                )}
              </Pressable>
            </View>

            <View style={styles.footer}>
              <ThemedText themeColor="textSecondary">Already have an account? </ThemedText>
              <Link href="/(auth)/login" asChild>
                <Pressable>
                  <ThemedText type="linkPrimary">Sign In</ThemedText>
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
  logoTitle: {
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  subtitle: {
    marginTop: Spacing.one,
    fontSize: 15,
    textAlign: 'center',
  },
  errorBox: {
    backgroundColor: '#ff4d4f20',
    borderColor: '#ff4d4f80',
    borderWidth: 1,
    borderRadius: 8,
    padding: Spacing.two,
    marginBottom: Spacing.three,
  },
  errorText: {
    color: '#ff4d4f',
    fontSize: 14,
    textAlign: 'center',
  },
  successBox: {
    backgroundColor: '#52c41a20',
    borderColor: '#52c41a80',
    borderWidth: 1,
    borderRadius: 8,
    padding: Spacing.two,
    marginBottom: Spacing.three,
  },
  successText: {
    color: '#52c41a',
    fontSize: 14,
    textAlign: 'center',
  },
  form: {
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
    gap: Spacing.three,
  },
  inputGroup: {
    gap: Spacing.one,
  },
  label: {
    marginBottom: 2,
  },
  input: {
    height: 48,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: Spacing.three,
    fontSize: 16,
  },
  primaryButton: {
    height: 48,
    backgroundColor: '#208AEF',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Spacing.two,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Spacing.five,
  },
});
