import { Redirect } from 'expo-router';
import { Stack } from 'expo-router';

import { getLastUsedServer } from '@/lib/servers';

export default function AppLayout() {
  if (!getLastUsedServer()) {
    return <Redirect href="/connect" />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
    </Stack>
  );
}
