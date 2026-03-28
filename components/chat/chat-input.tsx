import { Ionicons } from "@expo/vector-icons";
import { ActivityIndicator, Pressable, TextInput, View } from "react-native";
import { Fonts } from "@/constants/theme";
import { useColors } from "./use-colors";

export function ChatInput({
  value,
  onChangeText,
  onSend,
  isBusy,
}: {
  value: string;
  onChangeText: (text: string) => void;
  onSend: () => void;
  isBusy: boolean;
}) {
  const colors = useColors();
  const hasText = value.trim().length > 0;

  return (
    <View className="bg-surface rounded-4xl border border-border z-50">
      <TextInput
        placeholder="Ask anything..."
        placeholderTextColor={colors.muted}
        value={value}
        onChangeText={onChangeText}
        multiline
        editable={!isBusy}
        style={{
          fontFamily: Fonts.sans,
          fontSize: 14,
          color: colors.text,
          paddingHorizontal: 12,
          minHeight: 100,
          paddingTop: 12,
          paddingBottom: 12,
          maxHeight: 180,
          textAlignVertical: "top",
        }}
        onSubmitEditing={onSend}
        blurOnSubmit={false}
      />

      {/* Attach button */}
      <Pressable
        hitSlop={8}
        style={{
          position: "absolute",
          bottom: 8,
          left: 8,
          width: 32,
          height: 32,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Ionicons name="add" size={20} color={colors.muted} />
      </Pressable>

      {/* Send / loading */}
      {isBusy ? (
        <View
          style={{
            position: "absolute",
            bottom: 8,
            right: 8,
            width: 32,
            height: 32,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <ActivityIndicator size="small" color={colors.muted} />
        </View>
      ) : (
        <Pressable
          onPress={onSend}
          disabled={!hasText}
          style={{
            position: "absolute",
            bottom: 8,
            right: 8,
            width: 32,
            height: 32,
            borderRadius: 8,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: hasText ? colors.accent : "transparent",
          }}
        >
          <Ionicons
            name="arrow-up"
            size={18}
            color={hasText ? colors.background : colors.muted}
          />
        </Pressable>
      )}
    </View>
  );
}
