import { Text, View, type ViewProps } from "react-native";
import { FileIcon } from "@/components/file-icon";
import { Fonts } from "@/constants/theme";
import type { FilePartType } from "./chat-utils";
import { useColors } from "./use-colors";

export type FilePartProps = ViewProps & {
  part: FilePartType;
};

export function FilePart({ part, style, ...props }: FilePartProps) {
  const colors = useColors();
  const filename = part.filename || part.url.split("/").pop() || "file";

  return (
    <View
      className="mt-2 flex-row items-center"
      style={[{ gap: 8 }, style]}
      {...props}
    >
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

FilePart.displayName = "FilePart";
