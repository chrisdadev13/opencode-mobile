import { Ionicons } from "@expo/vector-icons";
import { Platform, Pressable, Text, View } from "react-native";
import { Logomark } from "@/components/logomark";
import { Fonts } from "@/constants/theme";
import { useColors } from "./use-colors";

// ── StatusBadge ────────────────────────────────────────────────────

export function StatusBadge({
  isBusy,
  onStop,
}: {
  isBusy: boolean;
  onStop?: () => void;
}) {
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
          borderRadius: 14,
          backgroundColor: "#fef2f2",
        }}
      >
        <View
          style={{
            width: 6,
            height: 6,
            borderRadius: 3,
            backgroundColor: "#f59e0b",
          }}
        />
        <Text
          style={{
            fontFamily: Fonts.mono,
            fontSize: 11,
            color: "#ef4444",
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
        borderRadius: 14,
        backgroundColor: colors.surfaceSecondary,
      }}
    >
      <View
        style={{
          width: 6,
          height: 6,
          borderRadius: 3,
          backgroundColor: "#22c55e",
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

// ── SegmentedTabs ──────────────────────────────────────────────────

export function SegmentedTabs({
  activeTab,
  onTabChange,
}: {
  activeTab: "session" | "changes";
  onTabChange: (tab: "session" | "changes") => void;
}) {
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

// ── SessionHeader ──────────────────────────────────────────────────

export function SessionHeader({
  title,
  hasMessages,
  loading,
  isBusy,
  activeTab,
  onBack,
  onStop,
  onTabChange,
}: {
  title: string | undefined;
  hasMessages: boolean;
  loading: boolean;
  isBusy: boolean;
  activeTab: "session" | "changes";
  onBack: () => void;
  onStop: () => void;
  onTabChange: (tab: "session" | "changes") => void;
}) {
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
