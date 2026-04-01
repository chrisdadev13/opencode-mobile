import { Ionicons } from "@expo/vector-icons";
import type { PermissionRequest } from "@opencode-ai/sdk/v2/client";
import { createContext, useContext, useMemo, type ReactNode } from "react";
import { Pressable, Text, View, type ViewProps } from "react-native";
import { Fonts } from "@/constants/theme";
import { useColors } from "./use-colors";

// ── Context ────────────────────────────────────────────────────────

interface ConfirmationContextValue {
  permission: PermissionRequest;
}

const ConfirmationContext = createContext<ConfirmationContextValue | null>(null);

export const useConfirmation = () => {
  const context = useContext(ConfirmationContext);
  if (!context) {
    throw new Error(
      "Confirmation sub-components must be used within <Confirmation>",
    );
  }
  return context;
};

// ── Confirmation (root) ────────────────────────────────────────────

export type ConfirmationProps = ViewProps & {
  permission: PermissionRequest;
};

export function Confirmation({
  permission,
  children,
  className,
  ...props
}: ConfirmationProps) {
  const colors = useColors();
  const contextValue = useMemo(() => ({ permission }), [permission]);

  return (
    <ConfirmationContext.Provider value={contextValue}>
      <View
        className={`mx-4 mb-4 px-4 py-3 ${className ?? ""}`}
        style={{
          backgroundColor: colors.surface,
          borderLeftWidth: 3,
          borderLeftColor: "#f59e0b",
        }}
        {...props}
      >
        {children}
      </View>
    </ConfirmationContext.Provider>
  );
}

Confirmation.displayName = "Confirmation";

// ── ConfirmationHeader ─────────────────────────────────────────────

export type ConfirmationHeaderProps = ViewProps & {
  title?: string;
};

export function ConfirmationHeader({
  title = "Permission Required",
  ...props
}: ConfirmationHeaderProps) {
  const colors = useColors();

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        marginBottom: 10,
      }}
      {...props}
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
        {title}
      </Text>
    </View>
  );
}

ConfirmationHeader.displayName = "ConfirmationHeader";

// ── ConfirmationContent ────────────────────────────────────────────

export type ConfirmationContentProps = ViewProps;

export function ConfirmationContent({ children, ...props }: ConfirmationContentProps) {
  const { permission } = useConfirmation();
  const colors = useColors();

  return (
    <View {...props}>
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

      {children}
    </View>
  );
}

ConfirmationContent.displayName = "ConfirmationContent";

// ── ConfirmationActions ────────────────────────────────────────────

export type ConfirmationActionsProps = ViewProps;

export function ConfirmationActions({
  children,
  ...props
}: ConfirmationActionsProps) {
  return (
    <View style={{ flexDirection: "row", gap: 8 }} {...props}>
      {children}
    </View>
  );
}

ConfirmationActions.displayName = "ConfirmationActions";

// ── ConfirmationAction ─────────────────────────────────────────────

export type ConfirmationActionProps = ViewProps & {
  label: string;
  variant?: "outline" | "secondary" | "primary";
  onPress: () => void;
};

export function ConfirmationAction({
  label,
  variant = "primary",
  onPress,
  ...props
}: ConfirmationActionProps) {
  const colors = useColors();

  const buttonStyle = {
    outline: {
      backgroundColor: "transparent" as const,
      borderWidth: 1,
      borderColor: colors.border,
    },
    secondary: {
      backgroundColor: colors.surfaceSecondary,
    },
    primary: {
      backgroundColor: colors.accent,
    },
  }[variant];

  const textColor = {
    outline: colors.destructive,
    secondary: colors.text,
    primary: colors.background,
  }[variant];

  const fontWeight = variant === "outline" ? "600" : variant === "secondary" ? "500" : "600";

  return (
    <Pressable
      onPress={onPress}
      style={{
        flex: 1,
        height: 38,
        borderRadius: 8,
        alignItems: "center",
        justifyContent: "center",
        ...buttonStyle,
      }}
      {...props}
    >
      <Text
        style={{
          fontFamily: Fonts.sans,
          fontSize: 13,
          fontWeight,
          color: textColor,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

ConfirmationAction.displayName = "ConfirmationAction";
