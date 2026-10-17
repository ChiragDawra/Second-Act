import { useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState, type ReactNode } from 'react';
import { Platform, RefreshControl, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../auth/AuthProvider';
import { colors, fonts, roleTheme, space } from '../lib/theme';
import { Provenance } from './badges';
import { Button, Row, Text } from './primitives';

/** Always-visible banner: which independent account is signed in on this device or tab. */
export function RoleBar() {
  const { me, signOut } = useAuth();
  const [busy, setBusy] = useState(false);
  if (!me.data) return null;
  const t = roleTheme[me.data.role];
  return (
    <View style={{ backgroundColor: t.tint, borderBottomWidth: 1, borderBottomColor: t.border, paddingHorizontal: space.lg, paddingVertical: space.sm }}>
      <Row style={{ justifyContent: 'space-between', maxWidth: 760, width: '100%', alignSelf: 'center' }}>
        <Row gap={10} style={{ flex: 1 }}>
          <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: t.color }} />
          <View style={{ flex: 1 }}>
            <Text variant="label" style={{ color: t.color }}>{`Signed in · ${t.label}`}</Text>
            <Text numberOfLines={1} style={{ fontFamily: fonts.semibold, fontSize: 14, color: colors.ink950 }}>
              {me.data.display_name}
              {me.data.org ? `  ·  ${me.data.org.name}` : ''}
            </Text>
          </View>
          {me.data.is_synthetic ? <Provenance kind="synthetic" /> : null}
        </Row>
        <Button
          label="Sign out"
          kind="secondary"
          compact
          loading={busy}
          onPress={async () => {
            setBusy(true);
            await signOut();
          }}
        />
      </Row>
    </View>
  );
}

export function Screen({
  title,
  subtitle,
  children,
  onRefresh,
  refreshing = false,
}: {
  title?: string;
  subtitle?: string;
  children: ReactNode;
  onRefresh?: () => void;
  refreshing?: boolean;
}) {
  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.bg }}>
      <RoleBar />
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: space.lg, gap: space.lg, paddingBottom: 64, width: '100%', maxWidth: 760, alignSelf: 'center' }}
        refreshControl={onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.sap} /> : undefined}
      >
        {title ? (
          <Row style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <View style={{ flex: 1, gap: 2 }}>
              <Text variant="display">{title}</Text>
              {subtitle ? <Text variant="small">{subtitle}</Text> : null}
            </View>
            {onRefresh && Platform.OS === 'web' ? <Button label={refreshing ? 'Refreshing…' : 'Refresh'} kind="secondary" compact onPress={onRefresh} /> : null}
          </Row>
        ) : null}
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

/** Refetches when the user returns to a screen (cross-account updates appear without manual refresh). */
export function useRefetchOnFocus(refetch: () => unknown) {
  const first = useRef(true);
  useFocusEffect(
    useCallback(() => {
      if (first.current) {
        first.current = false;
        return;
      }
      void refetch();
    }, [refetch]),
  );
}
