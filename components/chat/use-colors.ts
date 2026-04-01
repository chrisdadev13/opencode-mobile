import { Colors } from "@/constants/theme";

export type ChatColors = (typeof Colors)["dark"];

export function useColors(): ChatColors {
  return Colors.dark;
}
