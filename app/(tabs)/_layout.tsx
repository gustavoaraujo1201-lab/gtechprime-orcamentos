// app/(tabs)/_layout.tsx
import { Tabs } from 'expo-router';
import { Platform, Text } from 'react-native';

const PRIMARY    = '#0d7de0';
const INACTIVE   = '#8a9bb0';
const TAB_BG     = '#0d1520';
const TAB_BORDER = 'rgba(13,125,224,0.18)';

export default function TabsLayout() {
  return (
    <Tabs
      initialRouteName="index"
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: PRIMARY,
        tabBarInactiveTintColor: INACTIVE,
        tabBarStyle: {
          backgroundColor: TAB_BG,
          borderTopColor: TAB_BORDER,
          borderTopWidth: 1,
          height: Platform.OS === 'ios' ? 80 : 60,
          paddingBottom: Platform.OS === 'ios' ? 20 : 8,
          paddingTop: 8,
          elevation: 12,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -3 },
          shadowOpacity: 0.4,
          shadowRadius: 8,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          letterSpacing: 0.2,
        },
      }}
    >
      {/* ── ABA: INÍCIO — primeira e padrão ── */}
      <Tabs.Screen
        name="index"
        options={{
          title: 'Início',
          tabBarIcon: ({ color, size }) => (
            <TabIcon emoji="🏠" color={color} size={size} />
          ),
        }}
      />

      {/* ── ABA: CADASTROS ── */}
      <Tabs.Screen
        name="cadastro"
        options={{
          title: 'Cadastros',
          tabBarIcon: ({ color, size }) => (
            <TabIcon emoji="📋" color={color} size={size} />
          ),
        }}
      />

      {/* ── ABA: ORÇAMENTOS ── */}
      <Tabs.Screen
        name="orcamentos"
        options={{
          title: 'Orçamentos',
          tabBarIcon: ({ color, size }) => (
            <TabIcon emoji="📄" color={color} size={size} />
          ),
        }}
      />

      {/* ── ABA: PERFIL ── */}
      <Tabs.Screen
        name="perfil"
        options={{
          title: 'Perfil',
          tabBarIcon: ({ color, size }) => (
            <TabIcon emoji="👤" color={color} size={size} />
          ),
        }}
      />
    </Tabs>
  );
}

function TabIcon({ emoji, color, size }: { emoji: string; color: string; size: number }) {
  return (
    <Text style={{ fontSize: size * 0.9, opacity: color === PRIMARY ? 1 : 0.55 }}>
      {emoji}
    </Text>
  );
}
