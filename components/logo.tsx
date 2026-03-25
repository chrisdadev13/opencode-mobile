import { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { useThemeColor } from '@/hooks/use-theme-color';

const logo = {
  left: [
    '                   ',
    '█▀▀█ █▀▀█ █▀▀█ █▀▀▄',
    '█__█ █__█ █^^^ █__█',
    '▀▀▀▀ █▀▀▀ ▀▀▀▀ ▀~~▀',
  ],
  right: [
    '             ▄     ',
    '█▀▀▀ █▀▀█ █▀▀█ █▀▀█',
    '█___ █__█ █__█ █^^^',
    '▀▀▀▀ ▀▀▀▀ ▀▀▀▀ ▀▀▀▀',
  ],
};

// Each character maps to [topColor, bottomColor] within its cell.
// Block chars: █ = full, ▀ = top half, ▄ = bottom half, space = empty
// Shadow markers: _ = shadow fill, ^ = fg top / shadow bottom, ~ = shadow top
function charToPixel(
  char: string,
  fg: string,
  bg: string,
  shadow: string,
): [string, string] {
  switch (char) {
    case '█':
      return [fg, fg];
    case '▀':
      return [fg, bg];
    case '▄':
      return [bg, fg];
    case '_':
      return [shadow, shadow];
    case '^':
      return [fg, shadow];
    case '~':
      return [shadow, bg];
    default:
      return [bg, bg];
  }
}

function parseHex(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

function tint(bg: string, fg: string, ratio: number): string {
  const [br, bgG, bb] = parseHex(bg);
  const [fr, fgG, fb] = parseHex(fg);
  const r = Math.round(br * (1 - ratio) + fr * ratio);
  const g = Math.round(bgG * (1 - ratio) + fgG * ratio);
  const b = Math.round(bb * (1 - ratio) + fb * ratio);
  return `rgb(${r}, ${g}, ${b})`;
}

const PIXEL = 8;

export function Logo() {
  const text = useThemeColor({}, 'text');
  const muted = useThemeColor({}, 'muted');
  const background = useThemeColor({}, 'background');

  const grid = useMemo(() => {
    const leftShadow = tint(background, muted, 0.25);
    const rightShadow = tint(background, text, 0.25);

    return logo.left.map((leftLine, i) => {
      const rightLine = logo.right[i];
      const cells: [string, string][] = [];

      for (const ch of leftLine) {
        cells.push(charToPixel(ch, muted, background, leftShadow));
      }
      // gap column
      cells.push([background, background]);
      for (const ch of rightLine) {
        cells.push(charToPixel(ch, text, background, rightShadow));
      }

      return cells;
    });
  }, [text, muted, background]);

  return (
    <View>
      {grid.map((row, i) => (
        <View key={i} style={styles.row}>
          {row.map(([top, bottom], j) => (
            <View key={j} style={styles.cell}>
              <View style={[styles.half, { backgroundColor: top }]} />
              <View style={[styles.half, { backgroundColor: bottom }]} />
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
  },
  cell: {
    width: PIXEL,
    height: PIXEL * 2,
  },
  half: {
    flex: 1,
  },
});
