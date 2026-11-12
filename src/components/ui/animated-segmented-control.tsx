import { Ionicons } from '@expo/vector-icons';
import React, { useEffect } from 'react';
import {
  LayoutChangeEvent,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { FontFamily } from '@/constants/theme';
import { HapticsService } from '@/services/haptics';

export interface SegmentOption<T extends string = string> {
  key: T;
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
  activeColor?: string;
}

interface AnimatedSegmentedControlProps<T extends string = string> {
  options: SegmentOption<T>[];
  selectedKey: T;
  onSelect: (key: T) => void;
  backgroundColor: string;
  borderColor: string;
  defaultActiveColor?: string;
}

export function AnimatedSegmentedControl<T extends string = string>({
  options,
  selectedKey,
  onSelect,
  backgroundColor,
  borderColor,
  defaultActiveColor = '#14B896',
}: AnimatedSegmentedControlProps<T>) {
  const selectedIndex = options.findIndex((o) => o.key === selectedKey);
  const activeIndex = selectedIndex >= 0 ? selectedIndex : 0;

  const [containerWidth, setContainerWidth] = React.useState(0);
  const pillTranslateX = useSharedValue(0);

  const segmentWidth = containerWidth > 0 ? (containerWidth - 8) / options.length : 0;

  useEffect(() => {
    if (segmentWidth > 0) {
      pillTranslateX.value = withSpring(activeIndex * segmentWidth, {
        damping: 18,
        stiffness: 250,
      });
    }
  }, [activeIndex, segmentWidth, pillTranslateX]);

  const pillAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: pillTranslateX.value }],
    width: segmentWidth,
  }));

  const handleLayout = (e: LayoutChangeEvent) => {
    setContainerWidth(e.nativeEvent.layout.width);
  };

  const handlePress = (key: T, index: number) => {
    if (key !== selectedKey) {
      HapticsService.selection();
      onSelect(key);
    }
  };

  const currentOption = options[activeIndex];
  const activePillColor = currentOption?.activeColor || defaultActiveColor;

  return (
    <View
      onLayout={handleLayout}
      style={[
        styles.container,
        {
          backgroundColor,
          borderColor,
        },
      ]}>
      {segmentWidth > 0 ? (
        <Animated.View
          style={[
            styles.activePill,
            { backgroundColor: activePillColor },
            pillAnimatedStyle,
          ]}
        />
      ) : null}

      {options.map((option, index) => {
        const isSelected = option.key === selectedKey;
        return (
          <Pressable
            key={option.key}
            style={styles.tab}
            onPress={() => handlePress(option.key, index)}>
            {option.icon ? (
              <Ionicons
                name={option.icon}
                size={14}
                color={isSelected ? '#ffffff' : '#94A3B8'}
                style={{ marginRight: 5 }}
              />
            ) : null}
            <ThemedText
              style={[
                styles.tabText,
                { color: isSelected ? '#ffffff' : '#94A3B8' },
              ]}>
              {option.label}
            </ThemedText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    padding: 4,
    position: 'relative',
    alignItems: 'center',
  },
  activePill: {
    position: 'absolute',
    top: 4,
    bottom: 4,
    left: 4,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
    height: '100%',
  },
  tabText: {
    fontFamily: FontFamily.bold,
    fontSize: 13,
  },
});
