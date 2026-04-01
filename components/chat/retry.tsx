import { Ionicons } from "@expo/vector-icons";
import { Text, View, type ViewProps } from "react-native";
import { Fonts } from "@/constants/theme";
import type { RetryPartType } from "./chat-utils";
import { useColors } from "./use-colors";

export type RetryProps = ViewProps & {
  part: RetryPartType;
};

export function Retry({ part, style, ...props }: RetryProps) {
  const colors = useColors();

  return (
    <View
      className="mt-2 flex-row items-center px-3 py-2"
      style={[
        {
          backgroundColor: colors.surfaceSecondary,
          borderLeftWidth: 3,
          borderLeftColor: colors.destructive,
          gap: 8,
        },
        style,
      ]}
      {...props}
    >
      <Ionicons name="warning-outline" size={14} color={colors.warning} />
      <View style={{ flex: 1 }}>
        <Text
          style={{
            fontFamily: Fonts.sans,
            fontSize: 12,
            fontWeight: "600",
            color: colors.destructive,
          }}
        >
          Retry attempt {part.attempt}
        </Text>
        <Text
          style={{
            fontFamily: Fonts.sans,
            fontSize: 12,
            color: colors.muted,
            marginTop: 2,
          }}
          numberOfLines={2}
        >
          {part.error?.data?.message || "Unknown error"}
        </Text>
      </View>
    </View>
  );
}

Retry.displayName = "Retry";
