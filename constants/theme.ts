/**
 * OpenCode theme colors — classic shadcn neutral.
 *
 * Monochromatic. Primary is near-black in light mode, near-white in dark mode.
 * Used by React Navigation and components outside Tailwind/Uniwind.
 */

import { Platform } from 'react-native';
import { generateScale, shift, type HexColor } from '@/lib/color';

const interactive: HexColor = '#3b82f6';
const blueSeed = shift(interactive, { h: -12, l: 0.128, c: 1.12 });

export const blue = {
  light: generateScale(blueSeed, false),
  dark: generateScale(blueSeed, true),
};

export const Colors = {
  light: {
    text: '#1a1a1a',
    background: '#ffffff',
    tint: '#1D1917',
    icon: '#8b8b8b',
    tabIconDefault: '#8b8b8b',
    tabIconSelected: '#1D1917',
    surface: '#ffffff',
    surfaceSecondary: '#f5f5f5',
    border: '#e5e5e5',
    muted: '#8b8b8b',
    accent: '#1D1917',
    destructive: '#dc2626',
  },
  dark: {
    text: '#fafafa',
    background: '#1a1a1a',
    tint: '#e5e5e5',
    icon: '#a3a3a3',
    tabIconDefault: '#a3a3a3',
    tabIconSelected: '#e5e5e5',
    surface: '#2d2d2d',
    surfaceSecondary: '#3f3f3f',
    border: 'rgba(255, 255, 255, 0.1)',
    muted: '#a3a3a3',
    accent: '#e5e5e5',
    destructive: '#ef4444',
  },
};

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
