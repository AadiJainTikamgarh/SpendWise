import { Platform, StyleSheet, Text, type TextProps } from 'react-native';

import { FontFamily, Fonts, ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type ThemedTextProps = TextProps & {
  type?:
    | 'default'
    | 'title'
    | 'small'
    | 'smallBold'
    | 'subtitle'
    | 'link'
    | 'linkPrimary'
    | 'code'
    | 'hero'
    | 'caption';
  themeColor?: ThemeColor;
};

export function ThemedText({ style, type = 'default', themeColor, ...rest }: ThemedTextProps) {
  const theme = useTheme();

  return <Text style={[{ color: theme[themeColor ?? 'text'] }, styles[type], style]} {...rest} />;
}

const styles = StyleSheet.create({
  caption: {
    fontFamily: FontFamily.medium,
    fontSize: 12,
    lineHeight: 16,
  },
  small: {
    fontFamily: FontFamily.regular,
    fontSize: 13,
    lineHeight: 18,
  },
  smallBold: {
    fontFamily: FontFamily.semiBold,
    fontSize: 13,
    lineHeight: 18,
  },
  default: {
    fontFamily: FontFamily.regular,
    fontSize: 15,
    lineHeight: 22,
  },
  subtitle: {
    fontFamily: FontFamily.bold,
    fontSize: 20,
    lineHeight: 28,
  },
  title: {
    fontFamily: FontFamily.bold,
    fontSize: 28,
    lineHeight: 34,
  },
  hero: {
    fontFamily: FontFamily.extraBold,
    fontSize: 34,
    lineHeight: 42,
  },
  link: {
    fontFamily: FontFamily.medium,
    lineHeight: 22,
    fontSize: 14,
  },
  linkPrimary: {
    fontFamily: FontFamily.semiBold,
    lineHeight: 22,
    fontSize: 14,
    color: '#14B896',
  },
  code: {
    fontFamily: Fonts.mono,
    fontWeight: Platform.select({ android: 700 }) ?? 500,
    fontSize: 12,
  },
});
