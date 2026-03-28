import type { Part } from "@opencode-ai/sdk/v2/client";

// ── Part type aliases ──────────────────────────────────────────────

export type ToolPartType = Extract<Part, { type: "tool" }>;
export type ReasoningPartType = Extract<Part, { type: "reasoning" }>;
export type FilePartType = Extract<Part, { type: "file" }>;
export type PatchPartType = Extract<Part, { type: "patch" }>;
export type RetryPartType = Extract<Part, { type: "retry" }>;
export type SubtaskPartType = Extract<Part, { type: "subtask" }>;

// ── Part extractors ────────────────────────────────────────────────

export function getTextFromParts(parts: Part[]): string {
  return parts
    .filter((p): p is Extract<Part, { type: "text" }> => p.type === "text")
    .map((p) => p.text)
    .join("");
}

export function getToolParts(parts: Part[]): ToolPartType[] {
  return parts.filter((p): p is ToolPartType => p.type === "tool");
}

export function getReasoningParts(parts: Part[]): ReasoningPartType[] {
  return parts.filter((p): p is ReasoningPartType => p.type === "reasoning");
}

export function getFileParts(parts: Part[]): FilePartType[] {
  return parts.filter((p): p is FilePartType => p.type === "file");
}

export function getPatchParts(parts: Part[]): PatchPartType[] {
  return parts.filter((p): p is PatchPartType => p.type === "patch");
}

export function getRetryParts(parts: Part[]): RetryPartType[] {
  return parts.filter((p): p is RetryPartType => p.type === "retry");
}

export function getSubtaskParts(parts: Part[]): SubtaskPartType[] {
  return parts.filter((p): p is SubtaskPartType => p.type === "subtask");
}

// ── Tool grouping ──────────────────────────────────────────────────

export type ToolGroup = {
  key: string;
  tool: string;
  label: string;
  detail: string;
  items: ToolPartType[];
};

export function getToolTitle(tool: ToolPartType): string {
  if (tool.state.status === "completed" || tool.state.status === "running") {
    return tool.state.title || tool.tool;
  }
  return tool.tool;
}

function extractFile(title: string): string {
  const parts = title.replace(/^(Read|Edit|Write|Patch)\s+/i, "").trim();
  return parts || title;
}

export function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function groupTools(tools: ToolPartType[]): ToolGroup[] {
  const groups: ToolGroup[] = [];
  let current: ToolGroup | null = null;

  for (const tool of tools) {
    const name = tool.tool;
    if (current && current.tool === name) {
      current.items.push(tool);
    } else {
      current = {
        key: tool.id,
        tool: name,
        label: "",
        detail: "",
        items: [tool],
      };
      groups.push(current);
    }
  }

  for (const group of groups) {
    const count = group.items.length;
    const name = group.tool;

    if (name === "read" || name === "glob" || name === "list_files") {
      group.label = "Explored";
      group.detail = `${count} read${count !== 1 ? "s" : ""}`;
    } else if (name === "edit" || name === "write" || name === "patch") {
      if (count === 1) {
        const title = getToolTitle(group.items[0]!);
        const file = extractFile(title);
        group.label = "Edit";
        group.detail = file;
      } else {
        group.label = "Edited";
        group.detail = `${count} files`;
      }
    } else if (name === "bash" || name === "shell") {
      group.label = "Ran";
      group.detail =
        count === 1 ? getToolTitle(group.items[0]!) : `${count} commands`;
    } else if (name === "ask_user" || name === "question") {
      group.label = "Questions";
      group.detail = `${count} answered`;
    } else {
      group.label = capitalize(name);
      group.detail = count > 1 ? `${count}` : getToolTitle(group.items[0]!);
    }
  }

  return groups;
}
