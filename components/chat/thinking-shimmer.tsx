import { useEffect, useState } from "react";
import { View } from "react-native";
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
  const colors = useColors();
  const [phrase, setPhrase] = useState(
    () =>
      THINKING_PHRASES[Math.floor(Math.random() * THINKING_PHRASES.length)]!,
  );
  const opacity = useSharedValue(0.4);

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 700, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.4, { duration: 700, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false,
    );
  }, [opacity]);

  useEffect(() => {
    const interval = setInterval(() => {
      setPhrase(
        THINKING_PHRASES[Math.floor(Math.random() * THINKING_PHRASES.length)]!,
      );
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <View className="px-7 mb-6 items-start">
      <Animated.Text
        style={[
          {
            fontFamily: Fonts.sans,
            fontSize: 14,
            color: colors.muted,
            lineHeight: 20,
          },
          animatedStyle,
        ]}
      >
        {phrase}
      </Animated.Text>
    </View>
  );
}
