import { Ionicons } from "@expo/vector-icons";
import type { Part } from "@opencode-ai/sdk/v2/client";
import {
  createContext,
  memo,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import {
  Pressable,
  Text,
  View,
  type TextProps,
  type ViewProps,
} from "react-native";
import Markdown from "react-native-markdown-display";
import { Fonts } from "@/constants/theme";
import {
  getFileParts,
  getPatchParts,
  getReasoningParts,
  getRetryParts,
  getSubtaskParts,
  getTextFromParts,
  getToolParts,
  groupTools,
} from "./chat-utils";
import { FilePart } from "./file-part";
import { Patch } from "./patch";
import { ReasoningPart } from "./reasoning";
import { Retry } from "./retry";
import { Subtask } from "./subtask";
import { ToolGroupPart } from "./tool";
import { useColors } from "./use-colors";
import { useMarkdownStyles } from "./use-markdown-styles";

// ── Context ────────────────────────────────────────────────────────

interface MessageContextValue {
  role: "user" | "assistant";
  isUser: boolean;
}

const MessageContext = createContext<MessageContextValue | null>(null);

export const useMessage = () => {
  const context = useContext(MessageContext);
  if (!context) {
    throw new Error("Message sub-components must be used within <Message>");
  }
  return context;
};

// ── Message (root) ─────────────────────────────────────────────────

export type MessageProps = ViewProps & {
  from: "user" | "assistant";
};

export const Message = memo(function Message({
  from,
  children,
  className,
  ...props
}: MessageProps) {
  const contextValue = useMemo(
    () => ({ role: from, isUser: from === "user" }),
    [from],
  );

  return (
    <MessageContext.Provider value={contextValue}>
      <View
        className={`px-4 mb-4 items-start ${className ?? ""}`}
        {...props}
      >
        {children}
      </View>
    </MessageContext.Provider>
  );
});

Message.displayName = "Message";

// ── MessageContent ─────────────────────────────────────────────────

export type MessageContentProps = ViewProps;

export const MessageContent = memo(function MessageContent({
  children,
  className,
  ...props
}: MessageContentProps) {
  const { isUser } = useMessage();
  const colors = useColors();

  return (
    <View style={{ width: "100%" }}>
      <View
        className={`px-3 py-2 ${className ?? ""}`}
        style={{
          backgroundColor: isUser ? colors.surface : "transparent",
          borderLeftWidth: 3,
          borderLeftColor: isUser ? colors.yellow : "#3f3f3f",
        }}
        {...props}
      >
        {children}
      </View>
    </View>
  );
});

MessageContent.displayName = "MessageContent";

// ── MessageText ────────────────────────────────────────────────────

export type MessageTextProps = {
  text: string;
};

export const MessageText = memo(function MessageText({
  text,
}: MessageTextProps) {
  const { isUser } = useMessage();
  const mdStyles = useMarkdownStyles();

  if (!text) return null;

  if (isUser) {
    return (
      <Text
        className="text-sm text-foreground"
        style={{ fontFamily: Fonts.mono, lineHeight: 20 }}
        selectable
      >
        {text}
      </Text>
    );
  }

  return <Markdown style={mdStyles}>{text}</Markdown>;
});

MessageText.displayName = "MessageText";

// ── MessageActions ─────────────────────────────────────────────────

export type MessageActionsProps = ViewProps;

export function MessageActions({
  children,
  className,
  ...props
}: MessageActionsProps) {
  return (
    <View
      className={`flex-row items-center mt-1 ${className ?? ""}`}
      style={{ gap: 4 }}
      {...props}
    >
      {children}
    </View>
  );
}

MessageActions.displayName = "MessageActions";

// ── MessageAction ──────────────────────────────────────────────────

export type MessageActionProps = ViewProps & {
  icon: keyof typeof Ionicons.glyphMap;
  onPress?: () => void;
  label?: string;
};

export function MessageAction({
  icon,
  onPress,
  label,
  ...props
}: MessageActionProps) {
  const colors = useColors();

  return (
    <Pressable
      hitSlop={8}
      onPress={onPress}
      style={{
        width: 28,
        height: 28,
        borderRadius: 6,
        alignItems: "center",
        justifyContent: "center",
      }}
      accessibilityLabel={label}
      {...props}
    >
      <Ionicons name={icon} size={14} color={colors.muted} />
    </Pressable>
  );
}

MessageAction.displayName = "MessageAction";

// ── MessageParts (convenience) ─────────────────────────────────────
// Renders all part types from a Part[] array

export type MessagePartsProps = ViewProps & {
  parts: Part[];
};

export const MessageParts = memo(function MessageParts({
  parts,
  ...props
}: MessagePartsProps) {
  const text = getTextFromParts(parts);
  const groups = groupTools(getToolParts(parts));
  const reasoningParts = getReasoningParts(parts);
  const fileParts = getFileParts(parts);
  const patchParts = getPatchParts(parts);
  const retryParts = getRetryParts(parts);
  const subtaskParts = getSubtaskParts(parts);

  if (
    !text &&
    groups.length === 0 &&
    reasoningParts.length === 0 &&
    fileParts.length === 0 &&
    patchParts.length === 0 &&
    retryParts.length === 0 &&
    subtaskParts.length === 0
  )
    return null;

  return (
    <View {...props}>
      {reasoningParts.map((p) => (
        <ReasoningPart key={p.id} part={p} />
      ))}

      <MessageText text={text} />

      {groups.map((group) => (
        <ToolGroupPart key={group.key} group={group} />
      ))}

      {subtaskParts.map((p) => (
        <Subtask key={p.id} part={p} />
      ))}

      {fileParts.map((p) => (
        <FilePart key={p.id} part={p} />
      ))}

      {patchParts.map((p) => (
        <Patch key={p.id} part={p} />
      ))}

      {retryParts.map((p) => (
        <Retry key={p.id} part={p} />
      ))}
    </View>
  );
});

MessageParts.displayName = "MessageParts";
