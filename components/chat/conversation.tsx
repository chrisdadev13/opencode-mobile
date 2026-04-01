import { Ionicons } from "@expo/vector-icons";
import { forwardRef, type ReactNode } from "react";
import { ScrollView, Text, View, type ScrollViewProps, type ViewProps } from "react-native";
import { Logo } from "@/components/logo";
import { Fonts } from "@/constants/theme";
import type { useProjectInfo } from "@/hooks/use-opencode";
import { useColors } from "./use-colors";

// ── Conversation (root) ────────────────────────────────────────────

export type ConversationProps = ScrollViewProps & {
  children: ReactNode;
};

export const Conversation = forwardRef<ScrollView, ConversationProps>(
  function Conversation({ children, ...props }, ref) {
    return (
      <ScrollView
        ref={ref}
        className="flex-1"
        contentContainerClassName="py-4"
        showsVerticalScrollIndicator={false}
        {...props}
      >
        {children}
      </ScrollView>
    );
  },
);

Conversation.displayName = "Conversation";

// ── ConversationContent ────────────────────────────────────────────

export type ConversationContentProps = ViewProps;

export function ConversationContent({
  children,
  ...props
}: ConversationContentProps) {
  return <View {...props}>{children}</View>;
}

ConversationContent.displayName = "ConversationContent";

// ── ConversationEmptyState ─────────────────────────────────────────

export type ConversationEmptyStateProps = ViewProps & {
  projectInfo: ReturnType<typeof useProjectInfo>;
};

export function ConversationEmptyState({
  projectInfo,
  ...props
}: ConversationEmptyStateProps) {
  const colors = useColors();
  const pathSegments = projectInfo?.path?.split("/") ?? [];
  const projectName = pathSegments.pop() ?? "";
  const parentPath = pathSegments.join("/");

  return (
    <View
      className="flex-1 items-center justify-center"
      style={{ gap: 16 }}
      {...props}
    >
      <Logo width={240} />

      {projectInfo?.path ? (
        <Text
          style={{
            fontFamily: Fonts.mono,
            fontSize: 13,
            color: colors.muted,
          }}
        >
          {parentPath}/
          <Text style={{ fontWeight: "700", color: colors.text }}>
            {projectName}
          </Text>
        </Text>
      ) : null}

      {projectInfo?.branch ? (
        <View className="flex-row items-center" style={{ gap: 6 }}>
          <Ionicons name="git-branch-outline" size={14} color={colors.muted} />
          <Text
            style={{
              fontFamily: Fonts.sans,
              fontSize: 13,
              color: colors.muted,
            }}
          >
            Main branch ({projectInfo.branch})
          </Text>
        </View>
      ) : null}
    </View>
  );
}

ConversationEmptyState.displayName = "ConversationEmptyState";
