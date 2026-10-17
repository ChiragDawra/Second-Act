import { Tabs } from 'expo-router';
import { View } from 'react-native';
import { RoleGate } from '../../auth/RoleGate';
import { colors, fonts, roleTheme } from '../../lib/theme';

export default function AdminLayout() {
  return (
    <RoleGate role="admin">
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: roleTheme.admin.color,
          tabBarInactiveTintColor: colors.ink500,
          tabBarLabelStyle: { fontFamily: fonts.semibold, fontSize: 12 },
          tabBarIcon: ({ color }) => <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color }} />,
        }}
      >
        <Tabs.Screen name="index" options={{ title: 'System' }} />
        <Tabs.Screen name="audit" options={{ title: 'Audit' }} />
      </Tabs>
    </RoleGate>
  );
}
