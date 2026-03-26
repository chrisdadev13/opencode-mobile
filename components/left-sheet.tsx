import { useCallback, useEffect } from 'react';
import { Dimensions, Pressable, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
  runOnJS,
} from 'react-native-reanimated';

const DRAWER_WIDTH = Dimensions.get('window').width * 0.8;
const TIMING_CONFIG = { duration: 250, easing: Easing.out(Easing.cubic) };

type LeftSheetProps = {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
};

export function LeftSheet({ open, onClose, children }: LeftSheetProps) {
  const translateX = useSharedValue(-DRAWER_WIDTH);
  const overlayOpacity = useSharedValue(0);

  useEffect(() => {
    translateX.value = withTiming(open ? 0 : -DRAWER_WIDTH, TIMING_CONFIG);
    overlayOpacity.value = withTiming(open ? 1 : 0, TIMING_CONFIG);
  }, [open]);

  const drawerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
    pointerEvents: overlayOpacity.value > 0 ? 'auto' : 'none',
  }));

  const handleOverlayPress = useCallback(() => {
    onClose();
  }, [onClose]);

  return (
    <>
      <Animated.View style={[styles.overlay, overlayStyle]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={handleOverlayPress} />
      </Animated.View>
      <Animated.View style={[styles.drawer, drawerStyle]} className="bg-surface">
        {children}
      </Animated.View>
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 100,
  },
  drawer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: DRAWER_WIDTH,
    zIndex: 101,
  },
});
