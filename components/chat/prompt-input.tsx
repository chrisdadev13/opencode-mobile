import { Ionicons } from "@expo/vector-icons";
import {
  createContext,
  memo,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import {
  ActivityIndicator,
  Pressable,
  Text,
  TextInput,
  View,
  type ViewProps,
} from "react-native";
import { useControllableState } from "@/hooks/use-controllable-state";
import { Fonts } from "@/constants/theme";
import { useColors } from "./use-colors";

// ── Context ────────────────────────────────────────────────────────

interface PromptInputContextValue {
  value: string;
  setValue: (text: string) => void;
  isBusy: boolean;
  canSend: boolean;
  onSend: () => void;
}

const PromptInputContext = createContext<PromptInputContextValue | null>(null);

export const usePromptInput = () => {
  const context = useContext(PromptInputContext);
  if (!context) {
    throw new Error(
      "PromptInput sub-components must be used within <PromptInput>",
    );
  }
  return context;
};

// ── PromptInput (root) ─────────────────────────────────────────────

export type PromptInputProps = ViewProps & {
  value?: string;
  defaultValue?: string;
  onValueChange?: (text: string) => void;
  onSubmit: (text: string) => void;
  isBusy?: boolean;
};

export const PromptInput = memo(function PromptInput({
  value: valueProp,
  defaultValue = "",
  onValueChange,
  onSubmit,
  isBusy = false,
  children,
  ...props
}: PromptInputProps) {
  const [value, setValue] = useControllableState({
    prop: valueProp,
    defaultProp: defaultValue,
    onChange: onValueChange,
  });

  const canSend = value.trim().length > 0 && !isBusy;

  const handleSend = () => {
    if (!canSend) return;
    onSubmit(value.trim());
    setValue("");
  };

  const contextValue = useMemo(
    () => ({ value, setValue, isBusy, canSend, onSend: handleSend }),
    [value, setValue, isBusy, canSend],
  );

  return (
    <PromptInputContext.Provider value={contextValue}>
      <View {...props}>{children}</View>
    </PromptInputContext.Provider>
  );
});

PromptInput.displayName = "PromptInput";

// ── PromptInputTextarea ────────────────────────────────────────────

export type PromptInputTextareaProps = {
  placeholder?: string;
  minHeight?: number;
  maxHeight?: number;
};

export const PromptInputTextarea = memo(function PromptInputTextarea({
  placeholder = "Ask anything...",
  minHeight = 48,
  maxHeight = 180,
}: PromptInputTextareaProps) {
  const { value, setValue, isBusy, onSend } = usePromptInput();
  const colors = useColors();

  return (
    <TextInput
      placeholder={placeholder}
      placeholderTextColor={colors.muted}
      value={value}
      onChangeText={setValue}
      multiline
      editable={!isBusy}
      style={{
        fontFamily: Fonts.mono,
        fontSize: 14,
        color: colors.text,
        paddingHorizontal: 12,
        minHeight,
        paddingTop: 12,
        paddingBottom: 12,
        maxHeight,
        textAlignVertical: "top",
      }}
      onSubmitEditing={onSend}
      blurOnSubmit={false}
    />
  );
});

PromptInputTextarea.displayName = "PromptInputTextarea";

// ── PromptInputActions ─────────────────────────────────────────────

export type PromptInputActionsProps = ViewProps;

export function PromptInputActions({ children, ...props }: ViewProps) {
  return <View {...props}>{children}</View>;
}

PromptInputActions.displayName = "PromptInputActions";

// ── PromptInputAction ──────────────────────────────────────────────

export type PromptInputActionProps = ViewProps & {
  icon?: keyof typeof Ionicons.glyphMap;
  onPress?: () => void;
  type?: "send" | "attach" | "custom";
  position?: "left" | "right";
};

export function PromptInputAction({
  icon,
  onPress,
  type = "custom",
  position = "right",
}: PromptInputActionProps) {
  const { canSend, isBusy, onSend } = usePromptInput();
  const colors = useColors();

  if (type === "send") {
    if (isBusy) {
      return (
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
      );
    }

    return (
      <Pressable
        onPress={onSend}
        disabled={!canSend}
        style={{
          position: "absolute",
          bottom: 8,
          right: 8,
          width: 32,
          height: 32,
          alignItems: "center",
          justifyContent: "center",
          opacity: canSend ? 1 : 0.3,
        }}
      >
        <Ionicons
          name="arrow-up"
          size={18}
          color={colors.muted}
        />
      </Pressable>
    );
  }

  // Custom action
  return (
    <Pressable
      hitSlop={8}
      onPress={onPress}
      style={{
        position: "absolute",
        bottom: 8,
        ...(position === "left" ? { left: 8 } : { right: 8 }),
        width: 32,
        height: 32,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Ionicons name={icon ?? "ellipsis-horizontal"} size={20} color={colors.muted} />
    </Pressable>
  );
}

PromptInputAction.displayName = "PromptInputAction";

// ── PromptInputToolbar ─────────────────────────────────────────────

export type PromptInputToolbarProps = ViewProps;

export function PromptInputToolbar({
  children,
  className,
  ...props
}: PromptInputToolbarProps) {
  return (
    <View
      className={`flex-row items-center px-1 pt-2 pb-2 ${className ?? ""}`}
      style={{ gap: 8 }}
      {...props}
    >
      {children}
    </View>
  );
}

PromptInputToolbar.displayName = "PromptInputToolbar";

// ── PromptInputToolbarItem ─────────────────────────────────────────

export type PromptInputToolbarItemProps = ViewProps & {
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
  onPress?: () => void;
  hasChevron?: boolean;
  disabled?: boolean;
  variant?: "accent" | "bold" | "muted";
};

export function PromptInputToolbarItem({
  label,
  icon,
  onPress,
  hasChevron = false,
  disabled = false,
  variant = "muted",
  ...props
}: PromptInputToolbarItemProps) {
  const colors = useColors();

  const textColor =
    variant === "accent"
      ? colors.primary
      : variant === "bold"
        ? colors.text
        : colors.muted;

  const fontWeight = variant === "bold" ? "700" : variant === "accent" ? "600" : "400";

  return (
    <Pressable
      className="flex-row items-center"
      style={{ height: 28, paddingHorizontal: 4, gap: 4 }}
      onPress={onPress}
      disabled={disabled}
      {...props}
    >
      <Text
        style={{
          fontFamily: Fonts.mono,
          fontSize: 13,
          fontWeight,
          color: textColor,
          opacity: disabled ? 0.5 : 1,
        }}
        numberOfLines={1}
      >
        {label}
      </Text>
    </Pressable>
  );
}

PromptInputToolbarItem.displayName = "PromptInputToolbarItem";
