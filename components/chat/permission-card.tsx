import { Ionicons } from "@expo/vector-icons";
import type { PermissionRequest } from "@opencode-ai/sdk/v2/client";
import { Pressable, Text, View } from "react-native";
import { Fonts } from "@/constants/theme";
import { useColors } from "./use-colors";

export function PermissionCard({
  permission,
  onReply,
}: {
  permission: PermissionRequest;
  onReply: (reply: "once" | "always" | "reject") => void;
}) {
  const colors = useColors();

  return (
    <View
      className="mx-4 mb-4 rounded-xl px-4 py-3"
      style={{
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: "#f59e0b44",
      }}
    >
      {/* Header */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 8,
          marginBottom: 10,
        }}
      >
        <Ionicons name="shield-checkmark-outline" size={18} color="#f59e0b" />
        <Text
          style={{
            fontFamily: Fonts.sans,
            fontSize: 14,
            fontWeight: "600",
            color: colors.text,
            flex: 1,
          }}
        >
          Permission Required
        </Text>
      </View>

      {/* Permission type badge */}
      <View
        style={{
          backgroundColor: colors.surfaceSecondary,
          borderRadius: 6,
          paddingHorizontal: 8,
          paddingVertical: 3,
          alignSelf: "flex-start",
          marginBottom: 8,
        }}
      >
        <Text
          style={{
            fontFamily: Fonts.mono,
            fontSize: 12,
            color: colors.muted,
          }}
        >
          {permission.permission}
        </Text>
      </View>

      {/* Patterns */}
      {permission.patterns.length > 0 && (
        <View style={{ marginBottom: 10 }}>
          {permission.patterns.map((p, i) => (
            <Text
              key={i}
              style={{
                fontFamily: Fonts.mono,
                fontSize: 12,
                color: colors.text,
                marginTop: 2,
              }}
              numberOfLines={1}
            >
              {p}
            </Text>
          ))}
        </View>
      )}

      {/* Action buttons */}
      <View style={{ flexDirection: "row", gap: 8 }}>
        <Pressable
          onPress={() => onReply("reject")}
          style={{
            flex: 1,
            height: 38,
            borderRadius: 8,
            borderWidth: 1,
            borderColor: colors.border,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text
            style={{
              fontFamily: Fonts.sans,
              fontSize: 13,
              fontWeight: "600",
              color: colors.destructive,
            }}
          >
            Deny
          </Text>
        </Pressable>
        <Pressable
          onPress={() => onReply("always")}
          style={{
            flex: 1,
            height: 38,
            borderRadius: 8,
            backgroundColor: colors.surfaceSecondary,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text
            style={{
              fontFamily: Fonts.sans,
              fontSize: 13,
              fontWeight: "500",
              color: colors.text,
            }}
          >
            Always
          </Text>
        </Pressable>
        <Pressable
          onPress={() => onReply("once")}
          style={{
            flex: 1,
            height: 38,
            borderRadius: 8,
            backgroundColor: colors.accent,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text
            style={{
              fontFamily: Fonts.sans,
              fontSize: 13,
              fontWeight: "600",
              color: colors.background,
            }}
          >
            Allow
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
