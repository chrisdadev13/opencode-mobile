import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";

export type ChatColors = (typeof Colors)["light"];

export function useColors(): ChatColors {
  const colorScheme = useColorScheme();
  return Colors[colorScheme ?? "light"];
}
