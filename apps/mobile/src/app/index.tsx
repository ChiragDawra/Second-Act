import { Redirect } from 'expo-router';
import type { ReactNode } from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../auth/AuthProvider';
import { errorMessage } from '../lib/api';
import { missingConfig } from '../lib/config';
import { colors, space } from '../lib/theme';
import { Bullet, Button, Card, Stack, Text } from '../ui/primitives';
import { Loading } from '../ui/states';

/** Entry point: routes each signed-in account to its own workspace, by the role the server reports. */
export default function Index() {
  const { session, initializing, me, signOut } = useAuth();

  if (missingConfig.length > 0) return <SetupNeeded />;
  if (initializing) return <Centered><Loading label="Starting Second Act…" /></Centered>;
  if (!session) return <Redirect href="/sign-in" />;
  if (me.isPending) return <Centered><Loading label="Checking your role with the server…" /></Centered>;
  if (me.isError) {
    return (
      <Centered>
        <Card tone="danger">
          <Text variant="heading">Signed in, but the Second Act API refused or could not be reached</Text>
          <Text variant="small">{errorMessage(me.error)}</Text>
          <Button label="Try again" kind="secondary" onPress={() => void me.refetch()} />
          <Button label="Sign out" kind="ghost" onPress={() => void signOut()} />
        </Card>
      </Centered>
    );
  }
  return <Redirect href={`/${me.data.role}`} />;
}

function Centered({ children }: { children: ReactNode }) {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ flex: 1, justifyContent: 'center', padding: space.lg, maxWidth: 520, width: '100%', alignSelf: 'center' }}>{children}</View>
    </SafeAreaView>
  );
}

function SetupNeeded() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ padding: space.lg, maxWidth: 560, width: '100%', alignSelf: 'center' }}>
        <Stack>
          <Text variant="display">Setup needed</Text>
          <Card tone="warn">
            <Text variant="small">These public settings are missing from apps/mobile/.env:</Text>
            {missingConfig.map((m) => (
              <Bullet key={m}>{m}</Bullet>
            ))}
          </Card>
          <Text variant="small">
            Copy apps/mobile/.env.example to apps/mobile/.env, fill in the Supabase URL, the publishable (anon) key and the API URL,
            then restart Expo. See docs/DEMO_FACILITATOR_GUIDE.md.
          </Text>
        </Stack>
      </ScrollView>
    </SafeAreaView>
  );
}
