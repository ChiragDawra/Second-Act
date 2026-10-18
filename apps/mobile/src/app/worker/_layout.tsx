import { Tabs } from 'expo-router';
import { View } from 'react-native';
import { RoleGate } from '../../auth/RoleGate';
import { colors, fonts, roleTheme } from '../../lib/theme';

export default function WorkerLayout() {
  const accent = roleTheme.worker.color;
  return (
    <RoleGate role="worker">
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: accent,
          tabBarInactiveTintColor: colors.ink500,
          tabBarLabelStyle: { fontFamily: fonts.semibold, fontSize: 12 },
          tabBarIcon: ({ color }) => <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color }} />,
        }}
      >
        <Tabs.Screen name="index" options={{ title: 'Skills' }} />
        <Tabs.Screen name="roles" options={{ title: 'Roles' }} />
        <Tabs.Screen name="prove" options={{ title: 'Prove' }} />
        <Tabs.Screen name="resume" options={{ title: 'Resume' }} />
        <Tabs.Screen name="connect" options={{ title: 'Connect' }} />
        <Tabs.Screen name="activity" options={{ title: 'Activity' }} />
        <Tabs.Screen name="role/[roleId]" options={{ href: null }} />
      </Tabs>
    </RoleGate>
  );
}
