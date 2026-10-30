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

export default function LoginScreen() {
  const theme = useTheme();
  const { signInWithEmail, signInWithGoogle } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSignIn = async () => {
    if (!email.trim() || !password) {
      setErrorMessage('Please enter both email and password.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    const { error } = await signInWithEmail(email, password);
    setIsLoading(false);

    if (error) {
      setErrorMessage(error.message);
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
          <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
            <View style={styles.header}>
              <ThemedText type="subtitle" style={styles.logoTitle}>
                SpendWise
              </ThemedText>
              <ThemedText style={styles.subtitle} themeColor="textSecondary">
                Know where your money goes
              </ThemedText>
            </View>

            {errorMessage ? (
              <View style={styles.errorBox}>
                <ThemedText style={styles.errorText}>{errorMessage}</ThemedText>
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
                  placeholder="Enter your password"
                  placeholderTextColor={theme.textSecondary}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.forgotPasswordRow}>
                <Link href="/(auth)/forgot-password" asChild>
                  <Pressable>
                    <ThemedText type="linkPrimary">Forgot password?</ThemedText>
                  </Pressable>
                </Link>
              </View>

              <Pressable
                style={[styles.primaryButton, isLoading && styles.buttonDisabled]}
                onPress={handleSignIn}
                disabled={isLoading || isGoogleLoading}>
                {isLoading ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <ThemedText style={styles.primaryButtonText}>Sign In</ThemedText>
                )}
              </Pressable>

              <View style={styles.dividerRow}>
                <View style={[styles.dividerLine, { backgroundColor: theme.backgroundSelected }]} />
                <ThemedText style={styles.dividerText} themeColor="textSecondary">
                  or
                </ThemedText>
                <View style={[styles.dividerLine, { backgroundColor: theme.backgroundSelected }]} />
              </View>

              <Pressable
                style={[
                  styles.googleButton,
                  {
                    backgroundColor: theme.backgroundElement,
                    borderColor: theme.backgroundSelected,
                  },
                  isGoogleLoading && styles.buttonDisabled,
                ]}
                onPress={handleGoogleSignIn}
                disabled={isLoading || isGoogleLoading}>
                {isGoogleLoading ? (
                  <ActivityIndicator color={theme.text} />
                ) : (
                  <ThemedText style={styles.googleButtonText}>Continue with Google</ThemedText>
                )}
              </Pressable>
            </View>

            <View style={styles.footer}>
              <ThemedText themeColor="textSecondary">{"Don't have an account? "}</ThemedText>
              <Link href="/(auth)/sign-up" asChild>
                <Pressable>
                  <ThemedText type="linkPrimary">Sign Up</ThemedText>
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
  forgotPasswordRow: {
    alignItems: 'flex-end',
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
    fontSize: 13,
  },
  googleButton: {
    height: 48,
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  googleButtonText: {
    fontSize: 15,
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
