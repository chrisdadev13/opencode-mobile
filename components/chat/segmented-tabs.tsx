import { Platform, Pressable, Text, View } from "react-native";
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
        backgroundColor: colors.surfaceSecondary,
        borderRadius: 10,
        padding: 3,
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
              paddingVertical: 7,
              borderRadius: 8,
              backgroundColor: active ? colors.background : "transparent",
              ...(active
                ? Platform.select({
                    ios: {
                      shadowColor: "#000",
                      shadowOffset: { width: 0, height: 1 },
                      shadowOpacity: 0.08,
                      shadowRadius: 2,
                    },
                    default: { elevation: 1 },
                  })
                : {}),
            }}
          >
            <Text
              style={{
                fontFamily: Fonts.sans,
                fontSize: 13,
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
