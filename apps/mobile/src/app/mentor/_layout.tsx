import { Stack } from 'expo-router';
import { RoleGate } from '../../auth/RoleGate';
import { colors } from '../../lib/theme';

export default function MentorLayout() {
  return (
    <RoleGate role="mentor">
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }} />
    </RoleGate>
  );
}
