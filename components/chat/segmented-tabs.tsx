import { Pressable, Text, View } from "react-native";
import { Fonts } from "@/constants/theme";
import { useColors } from "./use-colors";

export type SegmentedTabsProps = {
  activeTab: "session" | "changes";
  onTabChange: (tab: "session" | "changes") => void;
};

export function SegmentedTabs({ activeTab, onTabChange }: SegmentedTabsProps) {
  const colors = useColors();

  return (
    <View
      style={{
        flexDirection: "row",
        gap: 0,
      }}
    >
      {(["session", "changes"] as const).map((tab) => {
        const active = activeTab === tab;
        return (
          <Pressable
            key={tab}
            onPress={() => onTabChange(tab)}
            style={{
              flex: 1,
              alignItems: "center",
              paddingVertical: 8,
              borderBottomWidth: active ? 2 : 1,
              borderBottomColor: active ? colors.text : colors.border,
            }}
          >
            <Text
              style={{
                fontFamily: Fonts.mono,
                fontSize: 12,
                fontWeight: active ? "600" : "400",
                color: active ? colors.text : colors.muted,
              }}
            >
              {tab === "session" ? "Session" : "Changes"}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

SegmentedTabs.displayName = "SegmentedTabs";
