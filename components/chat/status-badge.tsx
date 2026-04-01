import { Pressable, Text, View } from "react-native";
import { Fonts } from "@/constants/theme";
import { useColors } from "./use-colors";

export type StatusBadgeProps = {
  isBusy: boolean;
  onStop?: () => void;
};

export function StatusBadge({ isBusy, onStop }: StatusBadgeProps) {
  const colors = useColors();

  if (isBusy) {
    return (
      <Pressable
        hitSlop={8}
        onPress={onStop}
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 5,
          height: 28,
          paddingHorizontal: 10,
        }}
      >
        <View
          style={{
            width: 6,
            height: 6,
            borderRadius: 3,
            backgroundColor: colors.warning,
          }}
        />
        <Text
          style={{
            fontFamily: Fonts.mono,
            fontSize: 11,
            color: colors.destructive,
            fontWeight: "500",
          }}
        >
          Stop
        </Text>
      </Pressable>
    );
  }

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
        height: 28,
        paddingHorizontal: 10,
      }}
    >
      <View
        style={{
          width: 6,
          height: 6,
          borderRadius: 3,
          backgroundColor: colors.success,
        }}
      />
      <Text
        style={{
          fontFamily: Fonts.mono,
          fontSize: 11,
          color: colors.muted,
        }}
      >
        Ready
      </Text>
    </View>
  );
}

StatusBadge.displayName = "StatusBadge";
