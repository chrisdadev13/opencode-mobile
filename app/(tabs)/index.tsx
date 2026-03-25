import { Alert, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Button } from 'heroui-native';

import { HelloWave } from '@/components/hello-wave';
import { Logo } from '@/components/logo';
import ParallaxScrollView from '@/components/parallax-scroll-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

export default function HomeScreen() {
  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: '#f5f5f5', dark: '#2d2d2d' }}
      headerImage={
        <Image
          source={require('@/assets/images/partial-react-logo.png')}
          style={styles.reactLogo}
        />
      }>
      <ThemedView style={styles.titleContainer}>
        <Logo />
      </ThemedView>

      <ThemedView style={styles.section}>
        <ThemedText type="subtitle">HeroUI Native</ThemedText>
        <ThemedText>Components styled with the OpenCode theme.</ThemedText>

        <ThemedView style={styles.buttonRow}>
          <Button size="sm" variant="primary" onPress={() => Alert.alert('Primary', 'Accent color button')}>
            Primary
          </Button>
          <Button size="sm" variant="secondary" onPress={() => Alert.alert('Secondary')}>
            Secondary
          </Button>
          <Button size="sm" variant="ghost" onPress={() => Alert.alert('Ghost')}>
            Ghost
          </Button>
        </ThemedView>

        <ThemedView style={styles.buttonRow}>
          <Button size="sm" variant="outline" onPress={() => Alert.alert('Outline')}>
            Outline
          </Button>
          <Button size="sm" variant="tertiary" onPress={() => Alert.alert('Tertiary')}>
            Tertiary
          </Button>
          <Button size="sm" variant="danger" onPress={() => Alert.alert('Danger')}>
            Danger
          </Button>
        </ThemedView>
      </ThemedView>
    </ParallaxScrollView>
  );
}

const styles = StyleSheet.create({
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  section: {
    gap: 12,
    marginBottom: 8,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  reactLogo: {
    height: 178,
    width: 290,
    bottom: 0,
    left: 0,
    position: 'absolute',
  },
});
