import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { useTranslation } from 'react-i18next';

export default function TabLayout() {
  const { t } = useTranslation();
  const darkTabBarStyle = {
    backgroundColor: 'rgba(0,0,0,0.9)',
    borderTopColor: 'rgba(255,255,255,0.1)',
    borderTopWidth: 1,
    height: 75,
  } as const;
  const lightTabBarStyle = {
    backgroundColor: 'rgba(255,255,255,0.8)',
    borderTopColor: '#e5e7eb',
    borderTopWidth: 1,
    height: 75,
  } as const;

  return (
    <Tabs
      initialRouteName="recommend"
      screenOptions={{
        headerShown: false,
      }}>
      <Tabs.Screen
        name="recommend"
        options={{
          title: t('tabs.recommend'),
          tabBarActiveTintColor: '#ffffff',
          tabBarInactiveTintColor: 'rgba(255,255,255,0.5)',
          tabBarStyle: darkTabBarStyle,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="play-circle" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="square"
        options={{
          title: t('tabs.square'),
          tabBarActiveTintColor: '#111827',
          tabBarInactiveTintColor: '#9ca3af',
          tabBarStyle: lightTabBarStyle,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="grid" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="encounter"
        options={{
          title: t('tabs.encounter'),
          tabBarActiveTintColor: '#ffffff',
          tabBarInactiveTintColor: 'rgba(255,255,255,0.5)',
          tabBarStyle: darkTabBarStyle,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="sparkles" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="me"
        options={{
          title: t('tabs.me'),
          tabBarActiveTintColor: '#111827',
          tabBarInactiveTintColor: '#9ca3af',
          tabBarStyle: lightTabBarStyle,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person" color={color} size={size} />
          ),
        }}
      />
    </Tabs>
  );
}
