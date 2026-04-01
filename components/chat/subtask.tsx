import { Ionicons } from "@expo/vector-icons";
import { Text, View, type ViewProps } from "react-native";
import { Fonts } from "@/constants/theme";
import type { SubtaskPartType } from "./chat-utils";
import { useColors } from "./use-colors";

export type SubtaskProps = ViewProps & {
  part: SubtaskPartType;
};

export function Subtask({ part, style, ...props }: SubtaskProps) {
  const colors = useColors();

  return (
    <View
      className="mt-2 rounded-lg px-3 py-2"
      style={[
        {
          backgroundColor: colors.surfaceSecondary,
          borderWidth: 1,
          borderColor: colors.border,
        },
        style,
      ]}
      {...props}
    >
      <View className="flex-row items-center" style={{ gap: 6 }}>
        <Ionicons name="git-network-outline" size={14} color={colors.muted} />
        <Text
          style={{
            fontFamily: Fonts.sans,
            fontSize: 13,
            fontWeight: "600",
            color: colors.text,
          }}
        >
          Subtask
        </Text>
        <Text
          style={{ fontFamily: Fonts.mono, fontSize: 11, color: colors.muted }}
          numberOfLines={1}
        >
          {part.agent}
        </Text>
      </View>
      {part.description ? (
        <Text
          style={{
            fontFamily: Fonts.sans,
            fontSize: 13,
            color: colors.muted,
            marginTop: 4,
          }}
          numberOfLines={2}
        >
          {part.description}
        </Text>
      ) : null}
    </View>
  );
}

Subtask.displayName = "Subtask";
