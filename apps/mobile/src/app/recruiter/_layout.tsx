import { Tabs } from 'expo-router';
import { View } from 'react-native';
import { RoleGate } from '../../auth/RoleGate';
import { colors, fonts, roleTheme } from '../../lib/theme';

export default function RecruiterLayout() {
  return (
    <RoleGate role="recruiter">
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: roleTheme.recruiter.color,
          tabBarInactiveTintColor: colors.ink500,
          tabBarLabelStyle: { fontFamily: fonts.semibold, fontSize: 12 },
          tabBarIcon: ({ color }) => <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color }} />,
        }}
      >
        <Tabs.Screen name="index" options={{ title: 'Candidates' }} />
        <Tabs.Screen name="openings" options={{ title: 'Openings' }} />
        <Tabs.Screen name="candidate/[grantId]" options={{ href: null }} />
      </Tabs>
    </RoleGate>
  );
}
