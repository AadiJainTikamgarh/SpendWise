import { router } from 'expo-router';
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

export default function ForgotPasswordScreen() {
  const theme = useTheme();
  const { sendPasswordReset } = useAuth();

  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

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
          <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
            <View style={styles.header}>
              <ThemedText type="subtitle" style={styles.logoTitle}>
                Reset Password
              </ThemedText>
              <ThemedText style={styles.subtitle} themeColor="textSecondary">
                Enter your email to receive recovery instructions
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

              <Pressable
                style={[styles.primaryButton, isLoading && styles.buttonDisabled]}
                onPress={handleReset}
                disabled={isLoading}>
                {isLoading ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <ThemedText style={styles.primaryButtonText}>Send Reset Link</ThemedText>
                )}
              </Pressable>

              <Pressable style={styles.backButton} onPress={() => router.back()}>
                <ThemedText type="linkPrimary">Back to Sign In</ThemedText>
              </Pressable>
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
  backButton: {
    alignItems: 'center',
    marginTop: Spacing.two,
  },
});
