import { useMemo } from "react";
import { Fonts } from "@/constants/theme";
import { useColors } from "./use-colors";

export function useMarkdownStyles() {
  const colors = useColors();

  return useMemo(
    () =>
      ({
        body: {
          fontFamily: Fonts.mono,
          fontSize: 14,
          lineHeight: 20,
          color: colors.text,
        },
        heading1: {
          fontFamily: Fonts.sans,
          fontSize: 22,
          fontWeight: "700",
          color: colors.text,
          marginTop: 16,
          marginBottom: 8,
        },
        heading2: {
          fontFamily: Fonts.sans,
          fontSize: 18,
          fontWeight: "700",
          color: colors.text,
          marginTop: 14,
          marginBottom: 6,
        },
        heading3: {
          fontFamily: Fonts.sans,
          fontSize: 16,
          fontWeight: "600",
          color: colors.text,
          marginTop: 12,
          marginBottom: 4,
        },
        paragraph: {
          marginTop: 0,
          marginBottom: 8,
        },
        strong: {
          fontWeight: "700",
        },
        em: {
          fontStyle: "italic",
        },
        code_inline: {
          fontFamily: Fonts.mono,
          fontSize: 13,
          backgroundColor: colors.surfaceSecondary,
          color: colors.text,
          borderRadius: 4,
          paddingHorizontal: 5,
          paddingVertical: 1,
        },
        fence: {
          fontFamily: Fonts.mono,
          fontSize: 13,
          lineHeight: 20,
          backgroundColor: colors.surfaceSecondary,
          color: colors.text,
          borderRadius: 8,
          borderWidth: 1,
          borderColor: colors.border,
          padding: 12,
          marginVertical: 8,
        },
        code_block: {
          fontFamily: Fonts.mono,
          fontSize: 13,
          lineHeight: 20,
          backgroundColor: colors.surfaceSecondary,
          color: colors.text,
          borderRadius: 8,
          borderWidth: 1,
          borderColor: colors.border,
          padding: 12,
          marginVertical: 8,
        },
        blockquote: {
          backgroundColor: colors.surfaceSecondary,
          borderLeftWidth: 3,
          borderLeftColor: colors.muted,
          paddingLeft: 12,
          paddingVertical: 4,
          marginVertical: 8,
          borderRadius: 4,
        },
        link: {
          color: colors.accent,
          textDecorationLine: "underline",
        },
        list_item: {
          marginBottom: 4,
        },
        bullet_list: {
          marginVertical: 4,
        },
        ordered_list: {
          marginVertical: 4,
        },
        hr: {
          backgroundColor: colors.border,
          height: 1,
          marginVertical: 12,
        },
        table: {
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: 6,
          marginVertical: 8,
        },
        thead: {
          backgroundColor: colors.surfaceSecondary,
        },
        th: {
          padding: 8,
          fontWeight: "600",
          borderBottomWidth: 1,
          borderColor: colors.border,
        },
        td: {
          padding: 8,
          borderBottomWidth: 1,
          borderColor: colors.border,
        },
        tr: {
          borderBottomWidth: 1,
          borderColor: colors.border,
        },
      }) as const,
    [colors],
  );
}
