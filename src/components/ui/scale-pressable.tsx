import React from 'react';
import {
  Pressable,
  PressableProps,
  StyleProp,
  ViewStyle,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { HapticsService } from '@/services/haptics';

export interface ScalePressableProps extends Omit<PressableProps, 'style'> {
  style?: StyleProp<ViewStyle>;
  scaleTo?: number;
  haptic?: 'light' | 'medium' | 'heavy' | 'selection' | 'none';
  children: React.ReactNode;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function ScalePressable({
  style,
  scaleTo = 0.96,
  haptic = 'light',
  onPress,
  onPressIn,
  onPressOut,
  children,
  disabled,
  ...rest
}: ScalePressableProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = (event: any) => {
    if (!disabled) {
      scale.value = withSpring(scaleTo, {
        damping: 15,
        stiffness: 300,
      });

      if (haptic === 'light') HapticsService.light();
      else if (haptic === 'medium') HapticsService.medium();
      else if (haptic === 'heavy') HapticsService.heavy();
      else if (haptic === 'selection') HapticsService.selection();
    }
    onPressIn?.(event);
  };

  const handlePressOut = (event: any) => {
    if (!disabled) {
      scale.value = withSpring(1, {
        damping: 15,
        stiffness: 300,
      });
    }
    onPressOut?.(event);
  };

  return (
    <AnimatedPressable
      style={[style, animatedStyle]}
      disabled={disabled}
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      {...rest}>
      {children}
    </AnimatedPressable>
  );
}
