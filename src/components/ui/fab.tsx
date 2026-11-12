import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Platform, Pressable, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { useTheme } from '@/hooks/use-theme';
import { HapticsService } from '@/services/haptics';

interface FABProps {
  onPress?: () => void;
  date?: string;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function FAB({ onPress, date }: FABProps) {
  const router = useRouter();
  const theme = useTheme();

  const scale = useSharedValue(1);
  const rotation = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      { rotate: `${rotation.value}deg` },
    ],
  }));

  const handlePressIn = () => {
    HapticsService.medium();
    scale.value = withSpring(0.9, { damping: 12, stiffness: 300 });
    rotation.value = withSpring(45, { damping: 15, stiffness: 280 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 12, stiffness: 300 });
    rotation.value = withSpring(0, { damping: 15, stiffness: 280 });
  };

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
    <AnimatedPressable
      style={[
        styles.fab,
        {
          borderColor: theme.card,
        },
        animatedStyle,
      ]}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={handlePress}>
      <Ionicons name="add" size={30} color="#ffffff" />
    </AnimatedPressable>
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
});
