import { Redirect } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../auth/AuthProvider';
import { colors, fonts, roleTheme, space } from '../lib/theme';
import { Provenance } from '../ui/badges';
import { Field } from '../ui/forms';
import { Bullet, Button, Card, Row, Stack, Text } from '../ui/primitives';

/**
 * One sign-in for everyone. The server decides which workspace an account
 * gets; there is deliberately no role picker.
 */
export default function SignIn() {
  const { session, signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (session) return <Redirect href="/" />;

  const submit = async () => {
    if (!email.trim() || !password) {
      setError('Enter the email and password for your demo account.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await signIn(email, password);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Sign-in failed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: space.xl, gap: space.xl, maxWidth: 480, width: '100%', alignSelf: 'center', flexGrow: 1, justifyContent: 'center' }}>
          <View style={{ gap: 6 }}>
            <Text variant="label" style={{ color: colors.sap }}>Second Act</Text>
            <Text variant="display" style={{ fontSize: 30, lineHeight: 36 }}>The nearest role, not the hardest restart.</Text>
            <Text variant="body">Sign in with your own demo account. Each participant — worker, mentor, recruiter, administrator — has a separate identity.</Text>
          </View>

          <Card>
            <Stack>
              <Field
                label="Email"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                autoComplete="email"
                textContentType="username"
                placeholder="name@demo.secondact.test"
                returnKeyType="next"
              />
              <Field
                label="Password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoComplete="password"
                textContentType="password"
                placeholder="From the facilitator"
                returnKeyType="go"
                onSubmitEditing={submit}
              />
              {error ? (
                <Card tone="danger" style={{ padding: space.md }}>
                  <Text variant="small" style={{ color: colors.red }}>{error}</Text>
                </Card>
              ) : null}
              <Button label="Sign in" onPress={submit} loading={busy} />
            </Stack>
          </Card>

          <Card tone="muted">
            <Row wrap>
              <Provenance kind="live" />
              <Text variant="caption">Supabase Auth</Text>
              <Provenance kind="synthetic" />
              <Text variant="caption">All people and employers are fictional</Text>
            </Row>
            <Text variant="small">One shared journey, four views:</Text>
            {(['worker', 'mentor', 'recruiter', 'admin'] as const).map((r) => (
              <Bullet key={r} color={roleTheme[r].color}>
                <Text style={{ fontFamily: fonts.semibold, color: colors.ink900 }}>{roleTheme[r].label}</Text>
                {r === 'worker' && ' — reviews skills, proves one, chooses what to share'}
                {r === 'mentor' && ' — sees only what the worker approved'}
                {r === 'recruiter' && ' — sees only consented candidates'}
                {r === 'admin' && ' — health, datasets and audit; no private profiles'}
              </Bullet>
            ))}
            <Text variant="caption">Passwords are never stored in this app. The facilitator has them in a local, uncommitted file.</Text>
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
