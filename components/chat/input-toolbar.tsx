import { Ionicons } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";
import { Fonts } from "@/constants/theme";
import { capitalize } from "./chat-utils";
import { useColors } from "./use-colors";

export function InputToolbar({
  activeAgent,
  activeModelLabel,
  activeEffortLabel,
  hasVariants,
  onAgentPress,
  onModelPress,
  onEffortPress,
}: {
  activeAgent: "build" | "plan";
  activeModelLabel: string;
  activeEffortLabel: string;
  hasVariants: boolean;
  onAgentPress: () => void;
  onModelPress: () => void;
  onEffortPress: () => void;
}) {
  const colors = useColors();

  return (
    <View
      className="flex-row items-center px-1 pb-2 bg-background rounded-b-4xl border-x border-b border-border/70 -mt-3 z-0"
      style={{ gap: 6, paddingTop: 18 }}
    >
      <Pressable
        className="flex-row items-center rounded-md"
        style={{ height: 28, paddingHorizontal: 8, gap: 4 }}
        onPress={onAgentPress}
      >
        <Text
          className="text-muted"
          style={{ fontFamily: Fonts.sans, fontSize: 13 }}
        >
          {activeAgent === "plan" ? "Plan" : "Build"}
        </Text>
        <Ionicons name="chevron-down" size={11} color={colors.muted} />
      </Pressable>

      <Pressable
        className="flex-row items-center rounded-md"
        style={{ height: 28, paddingHorizontal: 4, gap: 4 }}
        onPress={onModelPress}
      >
        <Ionicons name="flash" size={13} color={colors.muted} />
        <Text
          className="text-muted"
          style={{ fontFamily: Fonts.sans, fontSize: 13 }}
          numberOfLines={1}
        >
          {activeModelLabel}
        </Text>
        <Ionicons name="chevron-down" size={11} color={colors.muted} />
      </Pressable>

      <Pressable
        className="flex-row items-center rounded-md"
        style={{ height: 28, paddingHorizontal: 8, gap: 4 }}
        onPress={onEffortPress}
        disabled={!hasVariants}
      >
        <Ionicons name="speedometer-outline" size={13} color={colors.muted} />
        <Text
          className="text-muted"
          style={{
            fontFamily: Fonts.sans,
            fontSize: 13,
            opacity: hasVariants ? 1 : 0.5,
          }}
        >
          {activeEffortLabel}
        </Text>
        {hasVariants && (
          <Ionicons name="chevron-down" size={11} color={colors.muted} />
        )}
      </Pressable>
    </View>
  );
}
