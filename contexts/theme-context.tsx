import * as SecureStore from "expo-secure-store";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  DEFAULT_THEME_ID,
  THEMES,
  getThemeById,
  type AppColors,
  type ThemeEntry,
} from "@/constants/themes";

const THEME_KEY = "opencode_theme";

interface ThemeContextValue {
  colors: AppColors;
  themeId: string;
  themeLabel: string;
  themes: ThemeEntry[];
  setTheme: (id: string) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within <ThemeProvider>");
  }
  return context;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [themeId, setThemeId] = useState(DEFAULT_THEME_ID);

  // Load persisted theme on mount
  useEffect(() => {
    const saved = SecureStore.getItem(THEME_KEY);
    if (saved && getThemeById(saved).id === saved) {
      setThemeId(saved);
    }
  }, []);

  const setTheme = useCallback((id: string) => {
    setThemeId(id);
    SecureStore.setItemAsync(THEME_KEY, id);
  }, []);

  const entry = getThemeById(themeId);

  const value = useMemo<ThemeContextValue>(
    () => ({
      colors: entry.colors,
      themeId: entry.id,
      themeLabel: entry.label,
      themes: THEMES,
      setTheme,
    }),
    [entry, setTheme],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}
