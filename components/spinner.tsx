import { useEffect } from 'react';
import Svg, { Rect } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';

const AnimatedRect = Animated.createAnimatedComponent(Rect);

const cornerIndices = new Set([0, 2, 6, 8]);
const outerIndices = new Set([1, 3, 5, 7]);

const squares = Array.from({ length: 9 }, (_, i) => ({
  x: (i % 3) * 6,
  y: Math.floor(i / 3) * 6,
  corner: cornerIndices.has(i),
  outer: outerIndices.has(i),
  duration: 1000 + Math.random() * 1000,
  delay: Math.random() * 1500,
}));

function PulsingRect({
  x,
  y,
  outer,
  duration,
  delay,
  color,
}: {
  x: number;
  y: number;
  outer: boolean;
  duration: number;
  delay: number;
  color: string;
}) {
  const opacity = useSharedValue(outer ? 0.5 : 1);
  const minOpacity = outer ? 0.15 : 0.2;
  const maxOpacity = outer ? 0.5 : 1;

  useEffect(() => {
    opacity.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(minOpacity, { duration: duration / 2, easing: Easing.inOut(Easing.ease) }),
          withTiming(maxOpacity, { duration: duration / 2, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
      ),
    );
  }, []);

  const animatedProps = useAnimatedProps(() => ({
    opacity: opacity.value,
  }));

  return (
    <AnimatedRect
      x={x}
      y={y}
      width={3}
      height={3}
      rx={1}
      fill={color}
      animatedProps={animatedProps}
    />
  );
}

export function Spinner({ size = 15, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 15 15">
      {squares.map((square, i) =>
        square.corner ? (
          <Rect key={i} x={square.x} y={square.y} width={3} height={3} rx={1} fill={color} opacity={0} />
        ) : (
          <PulsingRect
            key={i}
            x={square.x}
            y={square.y}
            outer={square.outer}
            duration={square.duration}
            delay={square.delay}
            color={color}
          />
        ),
      )}
    </Svg>
  );
}
