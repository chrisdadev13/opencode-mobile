/**
 * Theme system — compatible with OpenCode TUI theme format.
 *
 * Each theme has `defs` (hex color definitions) and `theme` (semantic
 * mappings referencing defs). Since the app is dark-only, we resolve
 * only the `.dark` variant from each theme entry.
 *
 * To add a new theme: add a RawTheme object to the `RAW_THEMES` record
 * and it will be available in the theme picker automatically.
 */

// ── Raw theme format (matches TUI JSON) ───────────────────────────

export type RawTheme = {
  defs: Record<string, string>;
  theme: Record<string, { dark: string; light: string } | string>;
};

// ── Resolved app colors ───────────────────────────────────────────

export type AppColors = {
  // Core
  text: string;
  background: string;
  surface: string;
  surfaceSecondary: string;
  border: string;
  muted: string;

  // Accents
  primary: string;
  accent: string;
  secondary: string;

  // Semantic
  destructive: string;
  success: string;
  warning: string;
  info: string;

  // Legacy (kept for compatibility with non-themed parts)
  tint: string;
  icon: string;
  tabIconDefault: string;
  tabIconSelected: string;
};

// ── Resolver ──────────────────────────────────────────────────────

function resolveColor(
  value: string,
  defs: Record<string, string>,
): string {
  // If it starts with # it's already a hex color
  if (value.startsWith("#")) return value;
  // Otherwise look up in defs
  return defs[value] ?? "#ff00ff"; // magenta fallback for missing defs
}

function resolveDark(
  entry: { dark: string; light: string } | string,
  defs: Record<string, string>,
): string {
  if (typeof entry === "string") return resolveColor(entry, defs);
  return resolveColor(entry.dark, defs);
}

export function resolveTheme(raw: RawTheme): AppColors {
  const { defs, theme: t } = raw;
  const r = (key: string) => {
    const entry = t[key];
    if (!entry) return "#ff00ff";
    return resolveDark(entry, defs);
  };

  const text = r("text");
  const background = r("background");
  const primary = r("primary");
  const muted = r("textMuted");

  return {
    text,
    background,
    surface: r("backgroundPanel"),
    surfaceSecondary: r("backgroundElement"),
    border: r("border"),
    muted,

    primary,
    accent: r("accent"),
    secondary: r("secondary"),

    destructive: r("error"),
    success: r("success"),
    warning: r("warning"),
    info: r("info"),

    // Legacy mappings
    tint: text,
    icon: muted,
    tabIconDefault: muted,
    tabIconSelected: text,
  };
}

// ── Theme registry ────────────────────────────────────────────────

export type ThemeEntry = {
  id: string;
  label: string;
  colors: AppColors;
};

const RAW_THEMES: Record<string, { label: string; raw: RawTheme }> = {
  opencode: {
    label: "OpenCode",
    raw: {
      defs: {
        darkStep1: "#0a0a0a",
        darkStep2: "#141414",
        darkStep3: "#1e1e1e",
        darkStep4: "#282828",
        darkStep5: "#323232",
        darkStep6: "#3c3c3c",
        darkStep7: "#484848",
        darkStep8: "#606060",
        darkStep9: "#fab283",
        darkStep10: "#ffc09f",
        darkStep11: "#808080",
        darkStep12: "#eeeeee",
        darkSecondary: "#5c9cf5",
        darkAccent: "#9d7cd8",
        darkRed: "#e06c75",
        darkOrange: "#f5a742",
        darkGreen: "#7fd88f",
        darkCyan: "#56b6c2",
        darkYellow: "#e5c07b",
        lightStep1: "#ffffff",
        lightStep2: "#fafafa",
        lightStep3: "#f5f5f5",
        lightStep4: "#ebebeb",
        lightStep5: "#e1e1e1",
        lightStep6: "#d4d4d4",
        lightStep7: "#b8b8b8",
        lightStep8: "#a0a0a0",
        lightStep9: "#3b7dd8",
        lightStep10: "#2968c3",
        lightStep11: "#8a8a8a",
        lightStep12: "#1a1a1a",
        lightSecondary: "#7b5bb6",
        lightAccent: "#d68c27",
        lightRed: "#d1383d",
        lightOrange: "#d68c27",
        lightGreen: "#3d9a57",
        lightCyan: "#318795",
        lightYellow: "#b0851f",
      },
      theme: {
        primary: { dark: "darkStep9", light: "lightStep9" },
        secondary: { dark: "darkSecondary", light: "lightSecondary" },
        accent: { dark: "darkAccent", light: "lightAccent" },
        error: { dark: "darkRed", light: "lightRed" },
        warning: { dark: "darkOrange", light: "lightOrange" },
        success: { dark: "darkGreen", light: "lightGreen" },
        info: { dark: "darkCyan", light: "lightCyan" },
        text: { dark: "darkStep12", light: "lightStep12" },
        textMuted: { dark: "darkStep11", light: "lightStep11" },
        background: { dark: "darkStep1", light: "lightStep1" },
        backgroundPanel: { dark: "darkStep2", light: "lightStep2" },
        backgroundElement: { dark: "darkStep3", light: "lightStep3" },
        border: { dark: "darkStep7", light: "lightStep7" },
        borderActive: { dark: "darkStep8", light: "lightStep8" },
        borderSubtle: { dark: "darkStep6", light: "lightStep6" },
      },
    },
  },
  dracula: {
    label: "Dracula",
    raw: {
      defs: {
        background: "#282a36",
        currentLine: "#44475a",
        selection: "#44475a",
        foreground: "#f8f8f2",
        comment: "#6272a4",
        cyan: "#8be9fd",
        green: "#50fa7b",
        orange: "#ffb86c",
        pink: "#ff79c6",
        purple: "#bd93f9",
        red: "#ff5555",
        yellow: "#f1fa8c",
      },
      theme: {
        primary: { dark: "purple", light: "purple" },
        secondary: { dark: "pink", light: "pink" },
        accent: { dark: "cyan", light: "cyan" },
        error: { dark: "red", light: "red" },
        warning: { dark: "yellow", light: "yellow" },
        success: { dark: "green", light: "green" },
        info: { dark: "orange", light: "orange" },
        text: { dark: "foreground", light: "#282a36" },
        textMuted: { dark: "comment", light: "#6272a4" },
        background: { dark: "#282a36", light: "#f8f8f2" },
        backgroundPanel: { dark: "#21222c", light: "#e8e8e2" },
        backgroundElement: { dark: "currentLine", light: "#d8d8d2" },
        border: { dark: "currentLine", light: "#c8c8c2" },
        borderActive: { dark: "purple", light: "purple" },
        borderSubtle: { dark: "#191a21", light: "#e0e0e0" },
      },
    },
  },
  tokyonight: {
    label: "Tokyo Night",
    raw: {
      defs: {
        darkStep1: "#1a1b26",
        darkStep2: "#1e2030",
        darkStep3: "#222436",
        darkStep4: "#292e42",
        darkStep5: "#3b4261",
        darkStep6: "#545c7e",
        darkStep7: "#737aa2",
        darkStep8: "#9099b2",
        darkStep9: "#82aaff",
        darkStep10: "#89b4fa",
        darkStep11: "#828bb8",
        darkStep12: "#c8d3f5",
        darkRed: "#ff757f",
        darkOrange: "#ff966c",
        darkYellow: "#ffc777",
        darkGreen: "#c3e88d",
        darkCyan: "#86e1fc",
        darkPurple: "#c099ff",
      },
      theme: {
        primary: { dark: "darkStep9", light: "darkStep9" },
        secondary: { dark: "darkPurple", light: "darkPurple" },
        accent: { dark: "darkOrange", light: "darkOrange" },
        error: { dark: "darkRed", light: "darkRed" },
        warning: { dark: "darkOrange", light: "darkOrange" },
        success: { dark: "darkGreen", light: "darkGreen" },
        info: { dark: "darkStep9", light: "darkStep9" },
        text: { dark: "darkStep12", light: "darkStep12" },
        textMuted: { dark: "darkStep11", light: "darkStep11" },
        background: { dark: "darkStep1", light: "darkStep1" },
        backgroundPanel: { dark: "darkStep2", light: "darkStep2" },
        backgroundElement: { dark: "darkStep3", light: "darkStep3" },
        border: { dark: "darkStep7", light: "darkStep7" },
        borderActive: { dark: "darkStep8", light: "darkStep8" },
        borderSubtle: { dark: "darkStep6", light: "darkStep6" },
      },
    },
  },
  nord: {
    label: "Nord",
    raw: {
      defs: {
        nord0: "#2E3440",
        nord1: "#3B4252",
        nord2: "#434C5E",
        nord3: "#4C566A",
        nord4: "#D8DEE9",
        nord5: "#E5E9F0",
        nord6: "#ECEFF4",
        nord7: "#8FBCBB",
        nord8: "#88C0D0",
        nord9: "#81A1C1",
        nord10: "#5E81AC",
        nord11: "#BF616A",
        nord12: "#D08770",
        nord13: "#EBCB8B",
        nord14: "#A3BE8C",
        nord15: "#B48EAD",
      },
      theme: {
        primary: { dark: "nord8", light: "nord10" },
        secondary: { dark: "nord9", light: "nord9" },
        accent: { dark: "nord7", light: "nord7" },
        error: { dark: "nord11", light: "nord11" },
        warning: { dark: "nord12", light: "nord12" },
        success: { dark: "nord14", light: "nord14" },
        info: { dark: "nord8", light: "nord10" },
        text: { dark: "nord6", light: "nord0" },
        textMuted: { dark: "#8B95A7", light: "nord1" },
        background: { dark: "nord0", light: "nord6" },
        backgroundPanel: { dark: "nord1", light: "nord5" },
        backgroundElement: { dark: "nord2", light: "nord4" },
        border: { dark: "nord2", light: "nord3" },
        borderActive: { dark: "nord3", light: "nord2" },
        borderSubtle: { dark: "nord2", light: "nord3" },
      },
    },
  },
  catppuccin: {
    label: "Catppuccin",
    raw: {
      defs: {
        lightRosewater: "#dc8a78",
        lightFlamingo: "#dd7878",
        lightPink: "#ea76cb",
        lightMauve: "#8839ef",
        lightRed: "#d20f39",
        lightMaroon: "#e64553",
        lightPeach: "#fe640b",
        lightYellow: "#df8e1d",
        lightGreen: "#40a02b",
        lightTeal: "#179299",
        lightSky: "#04a5e5",
        lightSapphire: "#209fb5",
        lightBlue: "#1e66f5",
        lightLavender: "#7287fd",
        lightText: "#4c4f69",
        lightSubtext1: "#5c5f77",
        lightSubtext0: "#6c6f85",
        lightOverlay2: "#7c7f93",
        lightOverlay1: "#8c8fa1",
        lightOverlay0: "#9ca0b0",
        lightSurface2: "#acb0be",
        lightSurface1: "#bcc0cc",
        lightSurface0: "#ccd0da",
        lightBase: "#eff1f5",
        lightMantle: "#e6e9ef",
        lightCrust: "#dce0e8",
        darkRosewater: "#f5e0dc",
        darkFlamingo: "#f2cdcd",
        darkPink: "#f5c2e7",
        darkMauve: "#cba6f7",
        darkRed: "#f38ba8",
        darkMaroon: "#eba0ac",
        darkPeach: "#fab387",
        darkYellow: "#f9e2af",
        darkGreen: "#a6e3a1",
        darkTeal: "#94e2d5",
        darkSky: "#89dceb",
        darkSapphire: "#74c7ec",
        darkBlue: "#89b4fa",
        darkLavender: "#b4befe",
        darkText: "#cdd6f4",
        darkSubtext1: "#bac2de",
        darkSubtext0: "#a6adc8",
        darkOverlay2: "#9399b2",
        darkOverlay1: "#7f849c",
        darkOverlay0: "#6c7086",
        darkSurface2: "#585b70",
        darkSurface1: "#45475a",
        darkSurface0: "#313244",
        darkBase: "#1e1e2e",
        darkMantle: "#181825",
        darkCrust: "#11111b",
      },
      theme: {
        primary: { dark: "darkBlue", light: "lightBlue" },
        secondary: { dark: "darkMauve", light: "lightMauve" },
        accent: { dark: "darkPink", light: "lightPink" },
        error: { dark: "darkRed", light: "lightRed" },
        warning: { dark: "darkYellow", light: "lightYellow" },
        success: { dark: "darkGreen", light: "lightGreen" },
        info: { dark: "darkTeal", light: "lightTeal" },
        text: { dark: "darkText", light: "lightText" },
        textMuted: { dark: "darkOverlay2", light: "lightOverlay2" },
        background: { dark: "darkBase", light: "lightBase" },
        backgroundPanel: { dark: "darkMantle", light: "lightMantle" },
        backgroundElement: { dark: "darkCrust", light: "lightCrust" },
        border: { dark: "darkSurface0", light: "lightSurface0" },
        borderActive: { dark: "darkSurface1", light: "lightSurface1" },
        borderSubtle: { dark: "darkSurface2", light: "lightSurface2" },
      },
    },
  },
  gruvbox: {
    label: "Gruvbox",
    raw: {
      defs: {
        darkBg0: "#282828",
        darkBg1: "#3c3836",
        darkBg2: "#504945",
        darkBg3: "#665c54",
        darkFg0: "#fbf1c7",
        darkFg1: "#ebdbb2",
        darkGray: "#928374",
        darkRed: "#cc241d",
        darkGreen: "#98971a",
        darkYellow: "#d79921",
        darkBlue: "#458588",
        darkPurple: "#b16286",
        darkAqua: "#689d6a",
        darkOrange: "#d65d0e",
        darkRedBright: "#fb4934",
        darkGreenBright: "#b8bb26",
        darkYellowBright: "#fabd2f",
        darkBlueBright: "#83a598",
        darkPurpleBright: "#d3869b",
        darkAquaBright: "#8ec07c",
        darkOrangeBright: "#fe8019",
      },
      theme: {
        primary: { dark: "darkBlueBright", light: "darkBlueBright" },
        secondary: { dark: "darkPurpleBright", light: "darkPurpleBright" },
        accent: { dark: "darkAquaBright", light: "darkAquaBright" },
        error: { dark: "darkRedBright", light: "darkRedBright" },
        warning: { dark: "darkOrangeBright", light: "darkOrangeBright" },
        success: { dark: "darkGreenBright", light: "darkGreenBright" },
        info: { dark: "darkYellowBright", light: "darkYellowBright" },
        text: { dark: "darkFg1", light: "darkFg1" },
        textMuted: { dark: "darkGray", light: "darkGray" },
        background: { dark: "darkBg0", light: "darkBg0" },
        backgroundPanel: { dark: "darkBg1", light: "darkBg1" },
        backgroundElement: { dark: "darkBg2", light: "darkBg2" },
        border: { dark: "darkBg3", light: "darkBg3" },
        borderActive: { dark: "darkFg1", light: "darkFg1" },
        borderSubtle: { dark: "darkBg2", light: "darkBg2" },
      },
    },
  },
};

// ── Resolve all themes at import time ─────────────────────────────

export const THEMES: ThemeEntry[] = Object.entries(RAW_THEMES).map(
  ([id, { label, raw }]) => ({
    id,
    label,
    colors: resolveTheme(raw),
  }),
);

export const DEFAULT_THEME_ID = "opencode";

export function getThemeById(id: string): ThemeEntry {
  return THEMES.find((t) => t.id === id) ?? THEMES[0]!;
}

/**
 * Register a raw TUI theme at runtime.
 * Usage: registerTheme("dracula", "Dracula", rawJson);
 */
export function registerTheme(
  id: string,
  label: string,
  raw: RawTheme,
): ThemeEntry {
  const entry: ThemeEntry = { id, label, colors: resolveTheme(raw) };
  // Avoid duplicates
  const idx = THEMES.findIndex((t) => t.id === id);
  if (idx >= 0) {
    THEMES[idx] = entry;
  } else {
    THEMES.push(entry);
  }
  return entry;
}
