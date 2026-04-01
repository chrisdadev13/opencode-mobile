import { Ionicons } from "@expo/vector-icons";
import { Text, View, type ViewProps } from "react-native";
import { FileIcon } from "@/components/file-icon";
import { Fonts } from "@/constants/theme";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import type { PatchPartType } from "./chat-utils";
import { useColors } from "./use-colors";
import { useCollapsible } from "@/components/ui/collapsible";

export type PatchProps = ViewProps & {
  part: PatchPartType;
};

function PatchTriggerContent({ part }: { part: PatchPartType }) {
  const colors = useColors();
  const { isOpen } = useCollapsible();

  return (
    <View className="flex-row items-center" style={{ gap: 6 }}>
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
        name={isOpen ? "chevron-down" : "chevron-forward"}
        size={12}
        color={colors.muted}
      />
    </View>
  );
}

export function Patch({ part, style, ...props }: PatchProps) {
  const colors = useColors();

  return (
    <Collapsible style={[{ marginTop: 8 }, style]} {...props}>
      <CollapsibleTrigger>
        <PatchTriggerContent part={part} />
      </CollapsibleTrigger>
      <CollapsibleContent>
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
      </CollapsibleContent>
    </Collapsible>
  );
}

Patch.displayName = "Patch";
