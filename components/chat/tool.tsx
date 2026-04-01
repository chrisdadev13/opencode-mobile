import { Ionicons } from "@expo/vector-icons";
import { Text, View, type ViewProps } from "react-native";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
  useCollapsible,
  type CollapsibleProps,
} from "@/components/ui/collapsible";
import { Fonts } from "@/constants/theme";
import { type ToolGroup, getToolTitle } from "./chat-utils";
import { useColors } from "./use-colors";

// ── Tool (root) ────────────────────────────────────────────────────

export type ToolProps = CollapsibleProps;

export function Tool({ ...props }: ToolProps) {
  return <Collapsible {...props} />;
}

Tool.displayName = "Tool";

// ── ToolHeader ─────────────────────────────────────────────────────

export type ToolHeaderProps = ViewProps & {
  label: string;
  detail?: string;
};

function ToolHeaderInner({ label, detail, ...props }: ToolHeaderProps) {
  const colors = useColors();
  const { isOpen } = useCollapsible();

  return (
    <View className="flex-row items-center" style={{ gap: 6 }} {...props}>
      <Text
        className="text-foreground text-sm"
        style={{ fontFamily: Fonts.sans, fontWeight: "600" }}
      >
        {label}
      </Text>
      {detail ? (
        <Text
          className="text-muted text-sm"
          style={{ fontFamily: Fonts.sans, flexShrink: 1 }}
          numberOfLines={1}
        >
          {detail}
        </Text>
      ) : null}
      <Ionicons
        name={isOpen ? "chevron-down" : "chevron-forward"}
        size={12}
        color={colors.muted}
        style={{ flexShrink: 0 }}
      />
    </View>
  );
}

export function ToolHeader(props: ToolHeaderProps) {
  return (
    <CollapsibleTrigger>
      <ToolHeaderInner {...props} />
    </CollapsibleTrigger>
  );
}

ToolHeader.displayName = "ToolHeader";

// ── ToolContent ────────────────────────────────────────────────────

export type ToolContentProps = ViewProps;

export function ToolContent({ children, ...props }: ToolContentProps) {
  return (
    <CollapsibleContent>
      <View className="mt-1.5 ml-1" style={{ gap: 4 }} {...props}>
        {children}
      </View>
    </CollapsibleContent>
  );
}

ToolContent.displayName = "ToolContent";

// ── ToolStatusBadge ────────────────────────────────────────────────

export type ToolStatusBadgeProps = ViewProps & {
  status: "running" | "completed" | "error" | "pending";
};

const statusConfig = {
  running: { color: "#f59e0b", label: "Running" },
  completed: { color: "#22c55e", label: "Done" },
  error: { color: "#ef4444", label: "Error" },
  pending: { color: "#8b8b8b", label: "Pending" },
};

export function ToolStatusBadge({
  status,
  style,
  ...props
}: ToolStatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <View
      style={[
        {
          flexDirection: "row",
          alignItems: "center",
          gap: 4,
          paddingHorizontal: 6,
          paddingVertical: 2,
          borderRadius: 4,
          backgroundColor: config.color + "1a",
        },
        style,
      ]}
      {...props}
    >
      <View
        style={{
          width: 5,
          height: 5,
          borderRadius: 2.5,
          backgroundColor: config.color,
        }}
      />
      <Text
        style={{
          fontFamily: Fonts.mono,
          fontSize: 10,
          color: config.color,
          fontWeight: "500",
        }}
      >
        {config.label}
      </Text>
    </View>
  );
}

ToolStatusBadge.displayName = "ToolStatusBadge";

// ── Convenience: ToolGroupPart ─────────────────────────────────────
// Drop-in replacement that renders from a ToolGroup

export type ToolGroupPartProps = ViewProps & {
  group: ToolGroup;
};

export function ToolGroupPart({ group, style, ...props }: ToolGroupPartProps) {
  const colors = useColors();

  return (
    <Tool style={[{ marginTop: 8 }, style]} {...props}>
      <ToolHeader label={group.label} detail={group.detail} />
      <ToolContent>
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
      </ToolContent>
    </Tool>
  );
}

ToolGroupPart.displayName = "ToolGroupPart";
