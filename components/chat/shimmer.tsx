import { useEffect, useState } from "react";
import { View, type TextStyle } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { Fonts } from "@/constants/theme";
import { useColors } from "./use-colors";

// ── Shimmer ────────────────────────────────────────────────────────

export type ShimmerProps = {
  children: string;
  duration?: number;
  style?: TextStyle;
};

export function Shimmer({ children, duration = 1400, style }: ShimmerProps) {
  const colors = useColors();
  const opacity = useSharedValue(0.4);

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(1, {
          duration: duration / 2,
          easing: Easing.inOut(Easing.ease),
        }),
        withTiming(0.4, {
          duration: duration / 2,
          easing: Easing.inOut(Easing.ease),
        }),
      ),
      -1,
      false,
    );
  }, [opacity, duration]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.Text
      style={[
        {
          fontFamily: Fonts.mono,
          fontSize: 14,
          color: colors.accent,
          lineHeight: 20,
        },
        style,
        animatedStyle,
      ]}
    >
      {children}
    </Animated.Text>
  );
}

Shimmer.displayName = "Shimmer";

// ── ThinkingShimmer ────────────────────────────────────────────────

const THINKING_PHRASES = [
  "Thinking...",
  "Preparing...",
  "Baking...",
  "Brewing ideas...",
  "Cooking up something...",
  "Crunching thoughts...",
  "Spinning gears...",
  "Connecting dots...",
  "Warming up...",
  "Pondering...",
  "Assembling words...",
  "Almost there...",
];

export function ThinkingShimmer() {
  const [phrase, setPhrase] = useState(
    () =>
      THINKING_PHRASES[Math.floor(Math.random() * THINKING_PHRASES.length)]!,
  );

  useEffect(() => {
    const interval = setInterval(() => {
      setPhrase(
        THINKING_PHRASES[Math.floor(Math.random() * THINKING_PHRASES.length)]!,
      );
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <View className="px-7 mb-6 items-start">
      <Shimmer>{phrase}</Shimmer>
    </View>
  );
}

ThinkingShimmer.displayName = "ThinkingShimmer";
