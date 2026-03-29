import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { FileIcon } from "@/components/file-icon";
import { Fonts } from "@/constants/theme";
import {
  type FilePartType,
  type PatchPartType,
  type ReasoningPartType,
  type RetryPartType,
  type SubtaskPartType,
  type ToolGroup,
  getToolTitle,
} from "./chat-utils";
import { useColors } from "./use-colors";

// ── ToolGroupRow ───────────────────────────────────────────────────

export function ToolGroupRow({ group }: { group: ToolGroup }) {
  const colors = useColors();
  const [expanded, setExpanded] = useState(false);

  return (
    <View className="mt-2">
      <Pressable
        className="flex-row items-center"
        style={{ gap: 6 }}
        onPress={() => setExpanded(!expanded)}
      >
        <Text
          className="text-foreground text-sm"
          style={{ fontFamily: Fonts.sans, fontWeight: "600" }}
        >
          {group.label}
        </Text>
        {group.detail ? (
          <Text
            className="text-muted text-sm"
            style={{ fontFamily: Fonts.sans, flexShrink: 1 }}
            numberOfLines={1}
          >
            {group.detail}
          </Text>
        ) : null}
        <Ionicons
          name={expanded ? "chevron-down" : "chevron-forward"}
          size={12}
          color={colors.muted}
          style={{ flexShrink: 0 }}
        />
      </Pressable>
      {expanded && (
        <View className="mt-1.5 ml-1" style={{ gap: 4 }}>
          {group.items.map((tool) => {
            const title = getToolTitle(tool);
            return (
              <View
                key={tool.id}
                className="flex-row items-center"
                style={{ gap: 6 }}
              >
                <Text
                  className="text-muted text-xs"
                  style={{ fontFamily: Fonts.mono, flexShrink: 1 }}
                  numberOfLines={1}
                >
                  {title}
                </Text>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

// ── ReasoningPartRow ───────────────────────────────────────────────

export function ReasoningPartRow({ part }: { part: ReasoningPartType }) {
  const colors = useColors();
  const [expanded, setExpanded] = useState(false);
  const duration =
    part.time?.end && part.time?.start
      ? ((part.time.end - part.time.start) / 1000).toFixed(1)
      : null;

  return (
    <View className="mb-1">
      <Pressable
        className="flex-row items-center"
        style={{ gap: 6 }}
        onPress={() => setExpanded(!expanded)}
      >
        <Ionicons name="bulb-outline" size={14} color={colors.muted} />
        <Text
          style={{
            fontFamily: Fonts.sans,
            fontSize: 13,
            fontWeight: "600",
            color: colors.muted,
          }}
        >
          Thinking
        </Text>
        {duration && (
          <Text
            style={{
              fontFamily: Fonts.mono,
              fontSize: 11,
              color: colors.muted,
            }}
          >
            {duration}s
          </Text>
        )}
        <Ionicons
          name={expanded ? "chevron-down" : "chevron-forward"}
          size={12}
          color={colors.muted}
        />
      </Pressable>
      {expanded && part.text ? (
        <View
          className="mt-1 ml-1 pl-2"
          style={{ borderLeftWidth: 2, borderLeftColor: colors.border }}
        >
          <Text
            style={{
              fontFamily: Fonts.sans,
              fontSize: 13,
              fontStyle: "italic",
              color: colors.muted,
              lineHeight: 20,
            }}
            selectable
          >
            {part.text}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

// ── SubtaskPartRow ─────────────────────────────────────────────────

export function SubtaskPartRow({ part }: { part: SubtaskPartType }) {
  const colors = useColors();

  return (
    <View
      className="mt-2 rounded-lg px-3 py-2"
      style={{
        backgroundColor: colors.surfaceSecondary,
        borderWidth: 1,
        borderColor: colors.border,
      }}
    >
      <View className="flex-row items-center" style={{ gap: 6 }}>
        <Ionicons name="git-network-outline" size={14} color={colors.muted} />
        <Text
          style={{
            fontFamily: Fonts.sans,
            fontSize: 13,
            fontWeight: "600",
            color: colors.text,
          }}
        >
          Subtask
        </Text>
        <Text
          style={{ fontFamily: Fonts.mono, fontSize: 11, color: colors.muted }}
          numberOfLines={1}
        >
          {part.agent}
        </Text>
      </View>
      {part.description ? (
        <Text
          style={{
            fontFamily: Fonts.sans,
            fontSize: 13,
            color: colors.muted,
            marginTop: 4,
          }}
          numberOfLines={2}
        >
          {part.description}
        </Text>
      ) : null}
    </View>
  );
}

// ── FilePartRow ────────────────────────────────────────────────────

export function FilePartRow({ part }: { part: FilePartType }) {
  const colors = useColors();
  const filename = part.filename || part.url.split("/").pop() || "file";

  return (
    <View className="mt-2 flex-row items-center" style={{ gap: 8 }}>
      <FileIcon filename={filename} size={16} />
      <Text
        style={{
          fontFamily: Fonts.sans,
          fontSize: 13,
          color: colors.text,
          flexShrink: 1,
        }}
        numberOfLines={1}
      >
        {filename}
      </Text>
      <Text
        style={{ fontFamily: Fonts.mono, fontSize: 11, color: colors.muted }}
      >
        {part.mime}
      </Text>
    </View>
  );
}

// ── PatchPartRow ───────────────────────────────────────────────────

export function PatchPartRow({ part }: { part: PatchPartType }) {
  const colors = useColors();
  const [expanded, setExpanded] = useState(false);

  return (
    <View className="mt-2">
      <Pressable
        className="flex-row items-center"
        style={{ gap: 6 }}
        onPress={() => setExpanded(!expanded)}
      >
        <Ionicons name="git-commit-outline" size={14} color={colors.muted} />
        <Text
          style={{
            fontFamily: Fonts.sans,
            fontSize: 13,
            fontWeight: "600",
            color: colors.text,
          }}
        >
          Patch
        </Text>
        <Text
          style={{ fontFamily: Fonts.mono, fontSize: 11, color: colors.muted }}
        >
          {part.files.length} file{part.files.length !== 1 ? "s" : ""}
        </Text>
        <Ionicons
          name={expanded ? "chevron-down" : "chevron-forward"}
          size={12}
          color={colors.muted}
        />
      </Pressable>
      {expanded && (
        <View className="mt-1 ml-1" style={{ gap: 4 }}>
          {part.files.map((file) => (
            <View
              key={file}
              className="flex-row items-center"
              style={{ gap: 6 }}
            >
              <FileIcon filename={file} size={14} />
              <Text
                style={{
                  fontFamily: Fonts.mono,
                  fontSize: 12,
                  color: colors.muted,
                }}
                numberOfLines={1}
              >
                {file}
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

// ── RetryPartRow ───────────────────────────────────────────────────

export function RetryPartRow({ part }: { part: RetryPartType }) {
  const colors = useColors();

  return (
    <View
      className="mt-2 flex-row items-center rounded-lg px-3 py-2"
      style={{
        backgroundColor: colors.surfaceSecondary,
        borderWidth: 1,
        borderColor: colors.destructive + "33",
        gap: 8,
      }}
    >
      <Ionicons name="warning-outline" size={14} color="#f59e0b" />
      <View style={{ flex: 1 }}>
        <Text
          style={{
            fontFamily: Fonts.sans,
            fontSize: 12,
            fontWeight: "600",
            color: colors.destructive,
          }}
        >
          Retry attempt {part.attempt}
        </Text>
        <Text
          style={{
            fontFamily: Fonts.sans,
            fontSize: 12,
            color: colors.muted,
            marginTop: 2,
          }}
          numberOfLines={2}
        >
          {part.error?.data?.message || "Unknown error"}
        </Text>
      </View>
    </View>
  );
}
