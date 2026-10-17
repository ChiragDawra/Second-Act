import { useState } from 'react';
import { Pressable, TextInput, View, type TextInputProps } from 'react-native';
import { colors, fonts, radius, space } from '../lib/theme';
import { Button, Row, Text } from './primitives';

export function Field({ label, hint, ...input }: TextInputProps & { label: string; hint?: string }) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={{ gap: 6 }}>
      <Text variant="label">{label}</Text>
      <TextInput
        placeholderTextColor={colors.ink400}
        {...input}
        onFocus={(e) => {
          setFocused(true);
          input.onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          input.onBlur?.(e);
        }}
        style={[
          {
            minHeight: 46,
            borderWidth: 1,
            borderColor: focused ? colors.sap : colors.ink200,
            borderRadius: radius.md,
            paddingHorizontal: space.md,
            paddingVertical: space.sm,
            backgroundColor: colors.white,
            fontFamily: fonts.regular,
            fontSize: 15,
            color: colors.ink950,
          },
          input.multiline ? { minHeight: 84, textAlignVertical: 'top' } : null,
          input.style,
        ]}
      />
      {hint ? <Text variant="caption">{hint}</Text> : null}
    </View>
  );
}

function Box({ checked, color }: { checked: boolean; color: string }) {
  return (
    <View
      style={{
        width: 22,
        height: 22,
        borderRadius: 6,
        borderWidth: 2,
        borderColor: checked ? color : colors.ink400,
        backgroundColor: checked ? color : colors.white,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {checked ? <Text style={{ color: colors.white, fontFamily: fonts.bold, fontSize: 13, lineHeight: 15 }}>✓</Text> : null}
    </View>
  );
}

export function CheckRow({
  label,
  description,
  checked,
  onToggle,
  color = colors.sap,
  disabled,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onToggle: () => void;
  color?: string;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked, disabled }}
      accessibilityLabel={label}
      onPress={onToggle}
      disabled={disabled}
      style={({ pressed }) => ({ opacity: disabled ? 0.5 : pressed ? 0.7 : 1, paddingVertical: 6 })}
    >
      <Row style={{ alignItems: 'flex-start' }} gap={10}>
        <Box checked={checked} color={color} />
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: fonts.semibold, fontSize: 14, color: colors.ink900 }}>{label}</Text>
          {description ? <Text variant="caption">{description}</Text> : null}
        </View>
      </Row>
    </Pressable>
  );
}

/** Explicit-approval control: nothing is shared until this is ticked. */
export function ConsentBox({ statement, approved, onToggle }: { statement: string; approved: boolean; onToggle: () => void }) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: approved }}
      accessibilityLabel="I approve this sharing"
      onPress={onToggle}
      style={{
        borderWidth: 1.5,
        borderColor: approved ? colors.green : colors.amber,
        backgroundColor: approved ? colors.green50 : colors.amber50,
        borderRadius: radius.md,
        padding: space.md,
      }}
    >
      <Row style={{ alignItems: 'flex-start' }} gap={10}>
        <Box checked={approved} color={colors.green} />
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={{ fontFamily: fonts.bold, fontSize: 13.5, color: colors.ink950 }}>
            {approved ? 'Approved — I consent to this sharing' : 'Tap to approve sharing'}
          </Text>
          <Text variant="small">{statement}</Text>
        </View>
      </Row>
    </Pressable>
  );
}

export function Segmented<T extends string>({ options, value, onChange }: { options: { value: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <Row gap={4} style={{ backgroundColor: colors.ink100, padding: 4, borderRadius: radius.md, alignSelf: 'flex-start' }} wrap>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            onPress={() => onChange(o.value)}
            style={{ paddingHorizontal: 12, paddingVertical: 7, borderRadius: radius.sm, backgroundColor: active ? colors.white : 'transparent' }}
          >
            <Text style={{ fontFamily: fonts.semibold, fontSize: 12.5, color: active ? colors.ink950 : colors.ink500 }}>{o.label}</Text>
          </Pressable>
        );
      })}
    </Row>
  );
}

/** Two-step confirmation that works on web and native (Alert.alert does not render on web). */
export function ConfirmButton({ label, confirmLabel, onConfirm, loading, kind = 'danger' }: { label: string; confirmLabel: string; onConfirm: () => void; loading?: boolean; kind?: 'danger' | 'primary' }) {
  const [armed, setArmed] = useState(false);
  if (!armed) return <Button label={label} kind={kind === 'danger' ? 'danger' : 'secondary'} onPress={() => setArmed(true)} />;
  return (
    <Row wrap>
      <Button
        label={confirmLabel}
        kind={kind === 'danger' ? 'primary' : 'primary'}
        color={kind === 'danger' ? colors.red : undefined}
        loading={loading}
        onPress={() => {
          onConfirm();
          setArmed(false);
        }}
      />
      <Button label="Cancel" kind="ghost" onPress={() => setArmed(false)} />
    </Row>
  );
}

export function Stepper({ value, onChange, min = 0, max = 4 }: { value: number; onChange: (v: number) => void; min?: number; max?: number }) {
  const btn = (label: string, next: number, disabled: boolean) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label === '−' ? 'Decrease level' : 'Increase level'}
      disabled={disabled}
      onPress={() => onChange(next)}
      style={{ width: 36, height: 36, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.ink200, alignItems: 'center', justifyContent: 'center', opacity: disabled ? 0.4 : 1, backgroundColor: colors.white }}
    >
      <Text style={{ fontFamily: fonts.bold, fontSize: 18, color: colors.ink900 }}>{label}</Text>
    </Pressable>
  );
  return (
    <Row gap={8}>
      {btn('−', value - 1, value <= min)}
      <Text style={{ fontFamily: fonts.bold, fontSize: 16, minWidth: 18, textAlign: 'center', color: colors.ink950 }}>{value}</Text>
      {btn('+', value + 1, value >= max)}
    </Row>
  );
}
