import { Tabs } from "expo-router";
import { Camera, Clock, MessageCircle, User, Users } from "lucide-react-native";
import React from "react";
import { Platform, StyleSheet, View } from "react-native";
import { BlurView } from "expo-blur";
import { t } from '@/utils/i18n';
import { useHub } from '@/providers/HubProvider';

function TabBarBackground() {
  if (Platform.OS === 'ios') {
    return (
      <BlurView
        tint="light"
        intensity={80}
        style={StyleSheet.absoluteFill}
      />
    );
  }
  return <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(250,250,248,0.96)' }]} />;
}

export default function TabLayout() {
  const { hubUnreadCount } = useHub();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: "#2E9E34",
        tabBarInactiveTintColor: "#8C8F88",
        headerShown: false,
        tabBarBackground: () => <TabBarBackground />,
        tabBarStyle: {
          backgroundColor: Platform.OS === 'ios' ? 'transparent' : 'rgba(250,250,248,0.96)',
          borderTopColor: '#E8E1D6',
          borderTopWidth: StyleSheet.hairlineWidth,
          elevation: 0,
          shadowColor: 'transparent',
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "600" as const,
          fontFamily: 'DMSans_600SemiBold',
          letterSpacing: 0.1,
        },
      }}
    >
      <Tabs.Screen
        name="(scanner)"
        options={{
          title: t('tab_scanner'),
          tabBarIcon: ({ color, size }) => <Camera color={color} size={size} strokeWidth={2} />,
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: t('tab_history'),
          tabBarIcon: ({ color, size }) => <Clock color={color} size={size} strokeWidth={2} />,
        }}
      />
      <Tabs.Screen
        name="hub"
        options={{
          title: t('tab_hub'),
          tabBarIcon: ({ color, size }) => <Users color={color} size={size} strokeWidth={2} />,
          tabBarBadge: hubUnreadCount > 0 ? (hubUnreadCount > 9 ? '9+' : hubUnreadCount) : undefined,
          tabBarBadgeStyle: {
            backgroundColor: '#D0260F',
            color: '#FFFFFF',
            fontSize: 10,
            fontWeight: '800' as const,
            fontFamily: 'DMSans_700Bold',
          },
        }}
      />
      <Tabs.Screen
        name="dr-toxi"
        options={{
          title: t('tab_drtoxi'),
          tabBarIcon: ({ color, size }) => <MessageCircle color={color} size={size} strokeWidth={2} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t('tab_profile'),
          tabBarIcon: ({ color, size }) => <User color={color} size={size} strokeWidth={2} />,
        }}
      />
    </Tabs>
  );
}
