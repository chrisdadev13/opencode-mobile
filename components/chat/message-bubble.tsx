import type { Part } from "@opencode-ai/sdk/v2/client";
import { Text, View } from "react-native";
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
import {
  FilePartRow,
  PatchPartRow,
  ReasoningPartRow,
  RetryPartRow,
  SubtaskPartRow,
  ToolGroupRow,
} from "./message-parts";
import { useMarkdownStyles } from "./use-markdown-styles";

export function MessageBubble({
  role,
  parts,
}: {
  role: "user" | "assistant";
  parts: Part[];
}) {
  const isUser = role === "user";
  const text = getTextFromParts(parts);
  const groups = groupTools(getToolParts(parts));
  const reasoningParts = getReasoningParts(parts);
  const fileParts = getFileParts(parts);
  const patchParts = getPatchParts(parts);
  const retryParts = getRetryParts(parts);
  const subtaskParts = getSubtaskParts(parts);
  const mdStyles = useMarkdownStyles();

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
    <View className={`px-4 mb-6 ${isUser ? "items-end" : "items-start"}`}>
      <View style={{ maxWidth: isUser ? "85%" : "100%" }}>
        <View
          className={`rounded-xl px-3 py-2 ${
            isUser
              ? "bg-accent-foreground border border-border"
              : "bg-transparent"
          }`}
        >
          {reasoningParts.map((p) => (
            <ReasoningPartRow key={p.id} part={p} />
          ))}

          {text ? (
            isUser ? (
              <Text
                className="text-sm text-foreground"
                style={{ fontFamily: Fonts.sans, lineHeight: 20 }}
                selectable
              >
                {text}
              </Text>
            ) : (
              <Markdown style={mdStyles}>{text}</Markdown>
            )
          ) : null}

          {groups.map((group) => (
            <ToolGroupRow key={group.key} group={group} />
          ))}

          {subtaskParts.map((p) => (
            <SubtaskPartRow key={p.id} part={p} />
          ))}

          {fileParts.map((p) => (
            <FilePartRow key={p.id} part={p} />
          ))}

          {patchParts.map((p) => (
            <PatchPartRow key={p.id} part={p} />
          ))}

          {retryParts.map((p) => (
            <RetryPartRow key={p.id} part={p} />
          ))}
        </View>
      </View>
    </View>
  );
}
