import * as Linking from 'expo-linking';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { supabase } from '@/utils/supabase';

export default function AuthCallbackScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    code?: string;
    error?: string;
    error_description?: string;
    access_token?: string;
    refresh_token?: string;
  }>();

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState('Completing authentication...');

  useEffect(() => {
    let isMounted = true;

    async function handleAuthCallback() {
      try {
        const {
          data: { session: existingSession },
        } = await supabase.auth.getSession();

        if (existingSession) {
          if (isMounted) {
            router.replace('/');
          }
          return;
        }

        if (params.error || params.error_description) {
          throw new Error(params.error_description || params.error || 'Authentication failed');
        }

        let code = params.code;
        let accessToken = params.access_token;
        let refreshToken = params.refresh_token;

        const initialUrl = await Linking.getInitialURL();
        if (initialUrl) {
          const hashIndex = initialUrl.indexOf('#');
          const queryIndex = initialUrl.indexOf('?');

          if (hashIndex !== -1) {
            const hashPart = initialUrl.substring(hashIndex + 1);
            const hashParams = new URLSearchParams(hashPart);
            if (!accessToken) accessToken = hashParams.get('access_token') || undefined;
            if (!refreshToken) refreshToken = hashParams.get('refresh_token') || undefined;
            if (!code) code = hashParams.get('code') || undefined;
            if (hashParams.has('error_description') || hashParams.has('error')) {
              throw new Error(
                hashParams.get('error_description') || hashParams.get('error') || 'Auth error'
              );
            }
          }

          if (queryIndex !== -1 && !code) {
            const endQuery =
              hashIndex !== -1 && hashIndex > queryIndex ? hashIndex : initialUrl.length;
            const queryPart = initialUrl.substring(queryIndex + 1, endQuery);
            const queryParams = new URLSearchParams(queryPart);
            if (!code) code = queryParams.get('code') || undefined;
            if (!accessToken) accessToken = queryParams.get('access_token') || undefined;
            if (!refreshToken) refreshToken = queryParams.get('refresh_token') || undefined;
          }
        }

        if (code) {
          if (isMounted) setStatusMessage('Exchanging code for session...');
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) throw exchangeError;

          if (isMounted) {
            setStatusMessage('Signed in! Redirecting...');
            router.replace('/');
          }
          return;
        }

        if (accessToken && refreshToken) {
          if (isMounted) setStatusMessage('Setting up session...');
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (sessionError) throw sessionError;

          if (isMounted) {
            setStatusMessage('Signed in! Redirecting...');
            router.replace('/');
          }
          return;
        }

        const {
          data: { session: finalCheckSession },
        } = await supabase.auth.getSession();
        if (finalCheckSession) {
          if (isMounted) {
            router.replace('/');
          }
          return;
        }

        throw new Error('No authentication credentials found in the callback URL.');
      } catch (err: any) {
        if (isMounted) {
          const {
            data: { session: retrySession },
          } = await supabase.auth.getSession();

          if (retrySession) {
            router.replace('/');
            return;
          }

          setErrorMessage(err?.message || 'Failed to complete authentication.');
        }
      }
    }

    handleAuthCallback();

    return () => {
      isMounted = false;
    };
  }, [params, router]);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>
          <ThemedText type="subtitle" style={styles.logoTitle}>
            SpendWise
          </ThemedText>

          {errorMessage ? (
            <View style={styles.errorBox}>
              <ThemedText style={styles.errorTitle}>Authentication Error</ThemedText>
              <ThemedText style={styles.errorText}>{errorMessage}</ThemedText>
              <Pressable
                style={[styles.button, { backgroundColor: '#208AEF' }]}
                onPress={() => router.replace('/(auth)/login')}>
                <ThemedText style={styles.buttonText}>Return to Sign In</ThemedText>
              </Pressable>
            </View>
          ) : (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="large" color="#208AEF" />
              <ThemedText style={styles.statusText} themeColor="textSecondary">
                {statusMessage}
              </ThemedText>
            </View>
          )}
        </View>
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
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
  },
  logoTitle: {
    fontWeight: '700',
    marginBottom: Spacing.four,
  },
  loadingBox: {
    alignItems: 'center',
    gap: Spacing.three,
  },
  statusText: {
    fontSize: 15,
  },
  errorBox: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#ff4d4f20',
    borderColor: '#ff4d4f80',
    borderWidth: 1,
    borderRadius: 12,
    padding: Spacing.four,
    alignItems: 'center',
    gap: Spacing.two,
  },
  errorTitle: {
    color: '#ff4d4f',
    fontSize: 16,
    fontWeight: '700',
  },
  errorText: {
    color: '#ff4d4f',
    fontSize: 14,
    textAlign: 'center',
  },
  button: {
    marginTop: Spacing.two,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.four,
    borderRadius: 8,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
});
