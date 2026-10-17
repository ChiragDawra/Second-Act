import type { ReactNode } from 'react';
import { ActivityIndicator, View } from 'react-native';
import type { UseQueryResult } from '@tanstack/react-query';
import { ApiError, errorMessage } from '../lib/api';
import { colors, space } from '../lib/theme';
import { Button, Card, Text } from './primitives';

export function Loading({ label = 'Loading…' }: { label?: string }) {
  return (
    <View style={{ padding: space.xl, alignItems: 'center', gap: space.sm }} accessibilityLiveRegion="polite">
      <ActivityIndicator color={colors.sap} />
      <Text variant="small">{label}</Text>
    </View>
  );
}

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const forbidden = error instanceof ApiError && error.status === 403;
  return (
    <Card tone={forbidden ? 'warn' : 'danger'}>
      <Text variant="heading">{forbidden ? 'Access refused by the server' : 'Could not load this'}</Text>
      <Text variant="small">{errorMessage(error)}</Text>
      {onRetry ? <Button label="Try again" kind="secondary" compact onPress={onRetry} /> : null}
    </Card>
  );
}

export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <Card tone="muted">
      <Text variant="heading">{title}</Text>
      {children ? <Text variant="small">{children}</Text> : null}
    </Card>
  );
}

/** Renders loading / error-with-retry / content for a TanStack query. */
export function QueryView<T>({ query, children, loadingLabel }: { query: UseQueryResult<T>; children: (data: T) => ReactNode; loadingLabel?: string }) {
  if (query.isPending) return <Loading label={loadingLabel} />;
  if (query.isError) return <ErrorState error={query.error} onRetry={() => void query.refetch()} />;
  return <>{children(query.data)}</>;
}

export function Notice({ children, tone = 'info' }: { children: ReactNode; tone?: 'info' | 'warn' | 'success' | 'danger' | 'muted' }) {
  return (
    <Card tone={tone} style={{ paddingVertical: space.md }}>
      {typeof children === 'string' ? <Text variant="small">{children}</Text> : children}
    </Card>
  );
}
