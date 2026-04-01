import { Ionicons } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";
import { Logomark } from "@/components/logomark";
import { Fonts } from "@/constants/theme";
import { SegmentedTabs } from "./segmented-tabs";
import { StatusBadge } from "./status-badge";
import { useColors } from "./use-colors";

export { SegmentedTabs } from "./segmented-tabs";
export { StatusBadge } from "./status-badge";

export type SessionHeaderProps = {
  title: string | undefined;
  hasMessages: boolean;
  loading: boolean;
  isBusy: boolean;
  activeTab: "session" | "changes";
  onBack: () => void;
  onStop: () => void;
  onTabChange: (tab: "session" | "changes") => void;
};

export function SessionHeader({
  title,
  hasMessages,
  loading,
  isBusy,
  activeTab,
  onBack,
  onStop,
  onTabChange,
}: SessionHeaderProps) {
  const colors = useColors();

  return (
    <View className="px-4 pt-2 pb-3" style={{ gap: 12 }}>
      <View className="flex-row items-center" style={{ gap: 10 }}>
        <Pressable
          hitSlop={8}
          onPress={onBack}
          style={{
            width: 32,
            height: 32,
            borderRadius: 10,
            backgroundColor: colors.surfaceSecondary,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons name="chevron-back" size={18} color={colors.text} />
        </Pressable>

        <Logomark size={16} />
        <Text
          className="text-foreground flex-1"
          style={{ fontFamily: Fonts.sans, fontWeight: "600", fontSize: 16 }}
          numberOfLines={1}
        >
          {title || (hasMessages || loading ? "Session" : "New Session")}
        </Text>

        <StatusBadge isBusy={isBusy} onStop={onStop} />
      </View>

      <SegmentedTabs activeTab={activeTab} onTabChange={onTabChange} />
    </View>
  );
}

SessionHeader.displayName = "SessionHeader";
