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
  minHeight = 100,
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
        fontFamily: Fonts.sans,
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
          borderRadius: 8,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: canSend ? colors.accent : "transparent",
        }}
      >
        <Ionicons
          name="arrow-up"
          size={18}
          color={canSend ? colors.background : colors.muted}
        />
      </Pressable>
    );
  }

  if (type === "attach") {
    return (
      <Pressable
        hitSlop={8}
        onPress={onPress}
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
        <Ionicons name={icon ?? "add"} size={20} color={colors.muted} />
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
      className={`flex-row items-center px-1 pb-2 bg-background rounded-b-4xl border-x border-b border-border/70 -mt-3 z-0 ${className ?? ""}`}
      style={{ gap: 6, paddingTop: 18 }}
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
};

export function PromptInputToolbarItem({
  label,
  icon,
  onPress,
  hasChevron = true,
  disabled = false,
  ...props
}: PromptInputToolbarItemProps) {
  const colors = useColors();

  return (
    <Pressable
      className="flex-row items-center rounded-md"
      style={{ height: 28, paddingHorizontal: icon ? 4 : 8, gap: 4 }}
      onPress={onPress}
      disabled={disabled}
      {...props}
    >
      {icon && <Ionicons name={icon} size={13} color={colors.muted} />}
      <Text
        className="text-muted"
        style={{
          fontFamily: Fonts.sans,
          fontSize: 13,
          opacity: disabled ? 0.5 : 1,
        }}
        numberOfLines={1}
      >
        {label}
      </Text>
      {hasChevron && (
        <Ionicons name="chevron-down" size={11} color={colors.muted} />
      )}
    </Pressable>
  );
}

PromptInputToolbarItem.displayName = "PromptInputToolbarItem";
