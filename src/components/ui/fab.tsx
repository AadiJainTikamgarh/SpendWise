import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Platform, Pressable, StyleSheet } from 'react-native';

import { useTheme } from '@/hooks/use-theme';

interface FABProps {
  onPress?: () => void;
  date?: string;
}

export function FAB({ onPress, date }: FABProps) {
  const router = useRouter();
  const theme = useTheme();

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      router.push({
        pathname: '/modal/transaction' as any,
        params: date ? { date } : undefined,
      });
    }
  };

  return (
    <Pressable
      style={({ pressed }) => [
        styles.fab,
        {
          borderColor: theme.card,
        },
        pressed && styles.pressed,
      ]}
      onPress={handlePress}>
      <Ionicons name="add" size={30} color="#ffffff" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    left: '50%',
    marginLeft: -28,
    bottom: Platform.OS === 'ios' ? 24 : 16,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#14B896',
    borderWidth: 4,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#14B896',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    zIndex: 999,
  },
  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.95 }],
  },
});
