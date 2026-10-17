import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  Text as RNText,
  StyleSheet,
  View,
  type StyleProp,
  type TextProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { colors, fonts, radius, space } from '../lib/theme';

type Variant = 'display' | 'title' | 'heading' | 'body' | 'small' | 'caption' | 'mono' | 'label';

const variants: Record<Variant, TextStyle> = {
  display: { fontFamily: fonts.extrabold, fontSize: 26, lineHeight: 32, color: colors.ink950, letterSpacing: -0.5 },
  title: { fontFamily: fonts.bold, fontSize: 20, lineHeight: 26, color: colors.ink950 },
  heading: { fontFamily: fonts.bold, fontSize: 15, lineHeight: 21, color: colors.ink950 },
  body: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 21, color: colors.ink700 },
  small: { fontFamily: fonts.regular, fontSize: 12.5, lineHeight: 18, color: colors.ink600 },
  caption: { fontFamily: fonts.medium, fontSize: 11.5, lineHeight: 16, color: colors.ink500 },
  mono: { fontFamily: fonts.mono, fontSize: 11, lineHeight: 15, color: colors.ink500, letterSpacing: 0.4 },
  label: { fontFamily: fonts.mono, fontSize: 10.5, lineHeight: 14, color: colors.ink500, letterSpacing: 0.8, textTransform: 'uppercase' },
};

export function Text({ variant = 'body', style, ...rest }: TextProps & { variant?: Variant }) {
  return <RNText {...rest} style={[variants[variant], style]} />;
}

export function Card({ children, style, tone }: { children: ReactNode; style?: StyleProp<ViewStyle>; tone?: 'default' | 'info' | 'warn' | 'danger' | 'success' | 'muted' }) {
  const toneStyle = tone ? toneStyles[tone] : null;
  return <View style={[styles.card, toneStyle, style]}>{children}</View>;
}

const toneStyles = StyleSheet.create({
  default: {},
  info: { backgroundColor: colors.sap50, borderColor: colors.sap200 },
  warn: { backgroundColor: colors.amber50, borderColor: colors.amber200 },
  danger: { backgroundColor: colors.red50, borderColor: colors.red200 },
  success: { backgroundColor: colors.green50, borderColor: colors.green200 },
  muted: { backgroundColor: colors.ink50, borderColor: colors.ink200 },
});

export function Row({ children, style, gap = space.sm, wrap }: { children: ReactNode; style?: StyleProp<ViewStyle>; gap?: number; wrap?: boolean }) {
  return <View style={[{ flexDirection: 'row', alignItems: 'center', gap, flexWrap: wrap ? 'wrap' : 'nowrap' }, style]}>{children}</View>;
}

export function Stack({ children, style, gap = space.md }: { children: ReactNode; style?: StyleProp<ViewStyle>; gap?: number }) {
  return <View style={[{ gap }, style]}>{children}</View>;
}

export function Section({ title, subtitle, right, children }: { title: string; subtitle?: string; right?: ReactNode; children: ReactNode }) {
  return (
    <View style={{ gap: space.sm }}>
      <Row style={{ justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <View style={{ flex: 1 }}>
          <Text variant="heading">{title}</Text>
          {subtitle ? <Text variant="small">{subtitle}</Text> : null}
        </View>
        {right}
      </Row>
      {children}
    </View>
  );
}

type ButtonKind = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';

export function Button({
  label,
  onPress,
  kind = 'primary',
  loading,
  disabled,
  compact,
  accessibilityHint,
  color,
}: {
  label: string;
  onPress: () => void;
  kind?: ButtonKind;
  loading?: boolean;
  disabled?: boolean;
  compact?: boolean;
  accessibilityHint?: string;
  color?: string;
}) {
  const palette = buttonPalette(kind, color);
  const inactive = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: !!inactive, busy: !!loading }}
      onPress={onPress}
      disabled={inactive}
      style={({ pressed }) => [
        styles.button,
        compact && styles.buttonCompact,
        { backgroundColor: palette.bg, borderColor: palette.border, opacity: inactive ? 0.55 : pressed ? 0.85 : 1 },
      ]}
    >
      {loading ? <ActivityIndicator size="small" color={palette.fg} /> : null}
      <Text style={{ fontFamily: fonts.semibold, fontSize: compact ? 12.5 : 14, color: palette.fg }}>{label}</Text>
    </Pressable>
  );
}

function buttonPalette(kind: ButtonKind, color?: string) {
  switch (kind) {
    case 'primary':
      return { bg: color ?? colors.sap, fg: colors.white, border: color ?? colors.sap };
    case 'success':
      return { bg: colors.green, fg: colors.white, border: colors.green };
    case 'danger':
      return { bg: colors.white, fg: colors.red, border: colors.red200 };
    case 'secondary':
      return { bg: colors.white, fg: color ?? colors.ink900, border: colors.ink200 };
    default:
      return { bg: 'transparent', fg: color ?? colors.sap, border: 'transparent' };
  }
}

export function Divider() {
  return <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: colors.ink200, marginVertical: space.xs }} />;
}

export function KeyValue({ label, value }: { label: string; value: ReactNode }) {
  return (
    <Row style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
      <Text variant="small" style={{ flex: 1 }}>{label}</Text>
      {typeof value === 'string' || typeof value === 'number' ? (
        <Text variant="small" style={{ fontFamily: fonts.semibold, color: colors.ink900, textAlign: 'right', flexShrink: 1 }}>{value}</Text>
      ) : (
        value
      )}
    </Row>
  );
}

export function Bullet({ children, color = colors.ink400 }: { children: ReactNode; color?: string }) {
  return (
    <Row style={{ alignItems: 'flex-start' }}>
      <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: color, marginTop: 8 }} />
      <Text variant="small" style={{ flex: 1 }}>{children}</Text>
    </Row>
  );
}

export const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space.lg,
    gap: space.sm,
  },
  button: {
    minHeight: 44,
    paddingHorizontal: space.lg,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
  },
  buttonCompact: { minHeight: 36, paddingHorizontal: space.md },
});
