import { ThemeProvider, type Theme } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Appearance } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { HeroUINativeProvider } from 'heroui-native';
import { Uniwind } from 'uniwind';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import 'react-native-reanimated';
import '../global.css';

import { Colors } from '@/constants/theme';

const OpenCodeDark: Theme = {
  dark: true,
  colors: {
    primary: Colors.dark.accent,
    background: Colors.dark.background,
    card: Colors.dark.surface,
    text: Colors.dark.text,
    border: Colors.dark.border,
    notification: Colors.dark.destructive,
  },
  fonts: {
    regular: { fontFamily: 'System', fontWeight: '400' },
    medium: { fontFamily: 'System', fontWeight: '500' },
    bold: { fontFamily: 'System', fontWeight: '700' },
    heavy: { fontFamily: 'System', fontWeight: '800' },
  },
};

export const unstable_settings = {
  initialRouteName: 'connect',
};

export default function RootLayout() {
  useEffect(() => {
    Appearance.setColorScheme('dark');
    Uniwind.setTheme('dark');
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider value={OpenCodeDark}>
        <HeroUINativeProvider>
          <KeyboardProvider>
            <Stack screenOptions={{ contentStyle: { backgroundColor: Colors.dark.background } }}>
              <Stack.Screen name="connect" options={{ headerShown: false }} />
              <Stack.Screen name="index" options={{ headerShown: false }} />
              <Stack.Screen name="sessions" options={{ headerShown: false, animation: 'slide_from_right' }} />
              <Stack.Screen name="session/[id]" options={{ headerShown: false, animation: 'slide_from_right' }} />
              <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
            </Stack>
            <StatusBar style="light" />
          </KeyboardProvider>
        </HeroUINativeProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
