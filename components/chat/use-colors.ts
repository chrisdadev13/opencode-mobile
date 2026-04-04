import { useTheme } from "@/contexts/theme-context";
import type { AppColors } from "@/constants/themes";

export type ChatColors = AppColors;

export function useColors(): ChatColors {
  return useTheme().colors;
}
