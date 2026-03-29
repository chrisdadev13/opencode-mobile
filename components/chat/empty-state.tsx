import { Ionicons } from "@expo/vector-icons";
import { Text, View } from "react-native";
import { Logomark } from "@/components/logomark";
import { Fonts } from "@/constants/theme";
import type { useProjectInfo } from "@/hooks/use-opencode";
import { useColors } from "./use-colors";

export function EmptyState({
  projectInfo,
}: {
  projectInfo: ReturnType<typeof useProjectInfo>;
}) {
  const colors = useColors();
  const pathSegments = projectInfo?.path?.split("/") ?? [];
  const projectName = pathSegments.pop() ?? "";
  const parentPath = pathSegments.join("/");

  return (
    <View className="flex-1 items-center justify-center" style={{ gap: 16 }}>
      <Logomark size={36} />

      <Text
        style={{
          fontFamily: Fonts.sans,
          fontSize: 22,
          fontWeight: "600",
          color: colors.text,
        }}
      >
        Build anything
      </Text>

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
