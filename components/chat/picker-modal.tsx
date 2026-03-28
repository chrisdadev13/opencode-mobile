import { Ionicons } from "@expo/vector-icons";
import type { ReactNode } from "react";
import { Modal, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Fonts } from "@/constants/theme";
import { useColors } from "./use-colors";

// ── Generic PickerModal ────────────────────────────────────────────

export function PickerModal({
  visible,
  title,
  onClose,
  children,
}: {
  visible: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable
        style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)" }}
        onPress={onClose}
      >
        <View style={{ flex: 1 }} />
        <Pressable
          onPress={(e) => e.stopPropagation()}
          style={{
            backgroundColor: colors.background,
            borderTopLeftRadius: 16,
            borderTopRightRadius: 16,
            paddingBottom: Math.max(insets.bottom, 16),
            maxHeight: "60%",
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              paddingHorizontal: 16,
              paddingVertical: 14,
              borderBottomWidth: 1,
              borderColor: colors.border,
            }}
          >
            <Text
              style={{
                fontFamily: Fonts.sans,
                fontSize: 16,
                fontWeight: "600",
                color: colors.text,
              }}
            >
              {title}
            </Text>
            <Pressable hitSlop={8} onPress={onClose}>
              <Ionicons name="close" size={20} color={colors.muted} />
            </Pressable>
          </View>
          <ScrollView>{children}</ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ── PickerOption ───────────────────────────────────────────────────

export function PickerOption({
  label,
  description,
  icon,
  isActive,
  onPress,
}: {
  label: string;
  description?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  isActive: boolean;
  onPress: () => void;
}) {
  const colors = useColors();

  return (
    <Pressable
      onPress={onPress}
      style={{
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 16,
        paddingVertical: description ? 14 : 12,
        gap: 10,
        backgroundColor: isActive ? colors.surfaceSecondary : "transparent",
      }}
    >
      {icon && (
        <Ionicons
          name={icon}
          size={description ? 16 : 14}
          color={isActive ? colors.accent : colors.muted}
        />
      )}
      <View style={{ flex: 1 }}>
        <Text
          style={{
            fontFamily: Fonts.sans,
            fontSize: 14,
            color: colors.text,
            fontWeight: isActive ? "600" : "400",
          }}
          numberOfLines={1}
        >
          {label}
        </Text>
        {description ? (
          <Text
            style={{
              fontFamily: Fonts.sans,
              fontSize: 12,
              color: colors.muted,
              marginTop: 2,
            }}
          >
            {description}
          </Text>
        ) : null}
      </View>
      {isActive && (
        <Ionicons name="checkmark" size={18} color={colors.accent} />
      )}
    </Pressable>
  );
}

// ── PickerSectionHeader ────────────────────────────────────────────

export function PickerSectionHeader({ title }: { title: string }) {
  const colors = useColors();

  return (
    <Text
      style={{
        fontFamily: Fonts.mono,
        fontSize: 11,
        fontWeight: "600",
        color: colors.muted,
        paddingHorizontal: 16,
        paddingTop: 14,
        paddingBottom: 6,
        textTransform: "uppercase",
        letterSpacing: 0.5,
      }}
    >
      {title}
    </Text>
  );
}
