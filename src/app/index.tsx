import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AnimatedIcon } from '@/components/animated-icon';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { WebBadge } from '@/components/web-badge';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { useTheme } from '@/hooks/use-theme';
import { supabase } from '@/utils/supabase';

interface Todo {
  id: string | number;
  name?: string;
  title?: string;
}

export default function HomeScreen() {
  const theme = useTheme();
  const { user, signOut } = useAuth();

  const [todos, setTodos] = useState<Todo[]>([]);
  const [dbStatus, setDbStatus] = useState<string>('Connecting to Supabase...');
  const [isSigningOut, setIsSigningOut] = useState(false);

  useEffect(() => {
    const checkSupabaseConnection = async () => {
      try {
        const { data, error } = await supabase.from('todos').select().limit(5);

        if (error) {
          // Table may not exist yet in a new project, but connection is alive!
          if (error.code === '42P01') {
            setDbStatus('Connected to Supabase (todos table not created yet)');
          } else {
            setDbStatus(`Connected to Supabase`);
          }
          return;
        }

        if (data) {
          setTodos(data as Todo[]);
          setDbStatus(`Connected to Supabase (${data.length} todos loaded)`);
        }
      } catch (err: any) {
        setDbStatus(`Supabase connection error: ${err.message}`);
      }
    };

    checkSupabaseConnection();
  }, []);

  const handleSignOut = async () => {
    setIsSigningOut(true);
    await signOut();
    setIsSigningOut(false);
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.topBar}>
          <View style={styles.userInfo}>
            <ThemedText type="smallBold">
              {user?.user_metadata?.full_name || 'Welcome!'}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {user?.email}
            </ThemedText>
          </View>
          <Pressable
            style={[
              styles.signOutButton,
              { backgroundColor: theme.backgroundElement, borderColor: theme.backgroundSelected },
            ]}
            onPress={handleSignOut}
            disabled={isSigningOut}>
            {isSigningOut ? (
              <ActivityIndicator size="small" color={theme.text} />
            ) : (
              <ThemedText type="smallBold" style={{ color: '#ff4d4f' }}>
                Sign Out
              </ThemedText>
            )}
          </Pressable>
        </View>

        <ThemedView style={styles.heroSection}>
          <AnimatedIcon />
          <ThemedText type="title" style={styles.title}>
            SpendWise
          </ThemedText>
          <ThemedText style={styles.tagline} themeColor="textSecondary">
            Personal Expense Management
          </ThemedText>
        </ThemedView>

        <ThemedView type="backgroundElement" style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.statusDot} />
            <ThemedText type="smallBold">Supabase Status</ThemedText>
          </View>
          <ThemedText type="small" themeColor="textSecondary">
            {dbStatus}
          </ThemedText>
          {todos.length > 0 ? (
            <View style={styles.todosContainer}>
              <ThemedText type="smallBold" style={{ marginTop: Spacing.two }}>
                Todos from Supabase:
              </ThemedText>
              {todos.map((item) => (
                <ThemedText key={item.id.toString()} type="small">
                  • {item.name || item.title || `Item #${item.id}`}
                </ThemedText>
              ))}
            </View>
          ) : null}
        </ThemedView>

        <ThemedView type="backgroundElement" style={styles.nextCard}>
          <ThemedText type="smallBold">Next Step: Phase 1 Financial Engine</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Ready to implement local SQLite storage, daily & monthly budgets, and expense tracking.
          </ThemedText>
        </ThemedView>

        {Platform.OS === 'web' && <WebBadge />}
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    flexDirection: 'row',
  },
  safeArea: {
    flex: 1,
    paddingHorizontal: Spacing.four,
    alignItems: 'center',
    gap: Spacing.three,
    paddingBottom: BottomTabInset + Spacing.three,
    maxWidth: MaxContentWidth,
  },
  topBar: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.two,
  },
  userInfo: {
    flex: 1,
  },
  signOutButton: {
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.three,
    borderRadius: 8,
    borderWidth: 1,
  },
  heroSection: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    paddingHorizontal: Spacing.four,
    gap: Spacing.two,
  },
  title: {
    textAlign: 'center',
  },
  tagline: {
    fontSize: 16,
    textAlign: 'center',
  },
  card: {
    alignSelf: 'stretch',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    borderRadius: Spacing.three,
    gap: Spacing.one,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#52c41a',
  },
  todosContainer: {
    marginTop: Spacing.one,
    gap: Spacing.half,
  },
  nextCard: {
    alignSelf: 'stretch',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    borderRadius: Spacing.three,
    gap: Spacing.one,
  },
});
