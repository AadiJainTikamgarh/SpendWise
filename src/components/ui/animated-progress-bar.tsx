import React, { useEffect } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

interface AnimatedProgressBarProps {
  percentage: number;
  color?: string;
  backgroundColor?: string;
  height?: number;
  style?: ViewStyle;
}

export function AnimatedProgressBar({
  percentage,
  color = '#14B896',
  backgroundColor = 'rgba(0,0,0,0.06)',
  height = 6,
  style,
}: AnimatedProgressBarProps) {
  const progress = useSharedValue(0);

  useEffect(() => {
    const clamped = Math.max(0, Math.min(100, percentage));
    progress.value = withTiming(clamped, { duration: 700 });
  }, [percentage, progress]);

  const animatedStyle = useAnimatedStyle(() => ({
    width: `${progress.value}%`,
  }));

  return (
    <View
      style={[
        styles.track,
        {
          height,
          backgroundColor,
          borderRadius: height / 2,
        },
        style,
      ]}>
      <Animated.View
        style={[
          styles.fill,
          {
            backgroundColor: color,
            borderRadius: height / 2,
          },
          animatedStyle,
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    width: '100%',
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
  },
});
