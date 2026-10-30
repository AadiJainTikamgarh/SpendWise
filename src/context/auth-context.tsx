import { Session, User } from '@supabase/supabase-js';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

import { supabase } from '@/utils/supabase';

WebBrowser.maybeCompleteAuthSession();

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  signInWithEmail: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUpWithEmail: (
    email: string,
    password: string,
    fullName?: string
  ) => Promise<{ error: Error | null; data?: any }>;
  signInWithGoogle: () => Promise<{ error: Error | null }>;
  sendPasswordReset: (email: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<{ error: Error | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        setSession(session);
        setUser(session?.user ?? null);
        setIsLoading(false);
      })
      .catch((err) => {
        console.error('Error fetching session:', err);
        setIsLoading(false);
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);
      setIsLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signInWithEmail = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      return { error };
    } catch (err: any) {
      return { error: err };
    }
  };

  const signUpWithEmail = async (email: string, password: string, fullName?: string) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            full_name: fullName?.trim() || '',
          },
        },
      });
      return { data, error };
    } catch (err: any) {
      return { error: err };
    }
  };

  const signInWithGoogle = async () => {
    try {
      const redirectUri = AuthSession.makeRedirectUri({
        scheme: 'spendwise',
        path: 'auth/callback',
      });

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUri,
          skipBrowserRedirect: true,
        },
      });

      if (error) {
        return { error };
      }
      if (!data?.url) {
        return { error: new Error('Failed to obtain Google OAuth URL') };
      }

      const res = await WebBrowser.openAuthSessionAsync(data.url, redirectUri);

      if (res.type === 'success' && res.url) {
        const parsedUrl = new URL(res.url);

        let accessToken: string | null = null;
        let refreshToken: string | null = null;
        let code: string | null = null;

        if (parsedUrl.hash) {
          const hashParams = new URLSearchParams(parsedUrl.hash.replace(/^#/, ''));
          accessToken = hashParams.get('access_token');
          refreshToken = hashParams.get('refresh_token');
        }

        if (!accessToken && parsedUrl.search) {
          const searchParams = new URLSearchParams(parsedUrl.search);
          accessToken = searchParams.get('access_token');
          refreshToken = searchParams.get('refresh_token');
          code = searchParams.get('code');
        }

        if (code) {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) throw exchangeError;
        } else if (accessToken && refreshToken) {
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (sessionError) throw sessionError;
        }
      }

      return { error: null };
    } catch (err: any) {
      return { error: err };
    }
  };

  const sendPasswordReset = async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim());
      return { error };
    } catch (err: any) {
      return { error: err };
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      return { error };
    } catch (err: any) {
      return { error: err };
    }
  };

  const value = useMemo(
    () => ({
      user,
      session,
      isLoading,
      signInWithEmail,
      signUpWithEmail,
      signInWithGoogle,
      sendPasswordReset,
      signOut,
    }),
    [user, session, isLoading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
