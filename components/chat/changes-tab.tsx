import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { DiffViewer } from "@/components/diff-viewer";
import { FileIcon } from "@/components/file-icon";
import { Fonts } from "@/constants/theme";
import type { FileStatus } from "@/hooks/use-opencode";
import { fetchWithTimeout, getServerUrl } from "@/lib/opencode";
import { useColors } from "./use-colors";

export function ChangesTab({
  files,
  loading,
}: {
  files: FileStatus[];
  loading: boolean;
}) {
  const colors = useColors();
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [diffContent, setDiffContent] = useState<string | null>(null);
  const [loadingDiff, setLoadingDiff] = useState(false);

  const handleFilePress = async (filePath: string) => {
    if (selectedFile === filePath) {
      setSelectedFile(null);
      setDiffContent(null);
      return;
    }
    setSelectedFile(filePath);
    setLoadingDiff(true);
    try {
      const baseUrl = getServerUrl();
      const res = await fetchWithTimeout(
        `${baseUrl}/file/content?path=${encodeURIComponent(filePath)}`,
      );
      const data = await res.json();
      setDiffContent(data.diff ?? null);
    } catch {
      setDiffContent(null);
    } finally {
      setLoadingDiff(false);
    }
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator color={colors.muted} />
      </View>
    );
  }

  if (files.length === 0) {
    return (
      <View className="flex-1 items-center justify-center">
        <Text className="text-muted text-sm" style={{ fontFamily: Fonts.sans }}>
          No changes yet
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      className="flex-1"
      contentContainerClassName="py-2"
      nestedScrollEnabled
    >
      {files.map((file, index) => (
        <View key={`${file.path}-${index}`} className="px-3 mt-2">
          <Pressable
            className="flex-row items-center rounded-xl border border-border bg-surface px-3"
            style={{ height: 48, gap: 10 }}
            onPress={() => handleFilePress(file.path)}
          >
            <FileIcon filename={file.path} size={14} />
            <Text
              className="text-foreground text-sm flex-1"
              style={{ fontFamily: Fonts.sans, fontWeight: "500" }}
              numberOfLines={1}
            >
              {file.path.split("/").pop()}
            </Text>
            <View className="flex-row items-center" style={{ gap: 6 }}>
              <Text
                style={{
                  fontFamily: Fonts.mono,
                  fontSize: 13,
                  fontWeight: "600",
                  color: "#22c55e",
                }}
              >
                +{file.added}
              </Text>
              <Text
                style={{
                  fontFamily: Fonts.mono,
                  fontSize: 13,
                  fontWeight: "600",
                  color: "#ef4444",
                }}
              >
                -{file.removed}
              </Text>
            </View>
            <Ionicons
              name={
                selectedFile === file.path ? "chevron-down" : "chevron-forward"
              }
              size={16}
              color={colors.muted}
            />
          </Pressable>
          {selectedFile === file.path && (
            <View
              style={{ height: 450 }}
              className="mt-1 mx-1 rounded-b-xl overflow-hidden border border-border"
            >
              {loadingDiff ? (
                <View className="flex-1 items-center justify-center">
                  <ActivityIndicator color={colors.muted} />
                </View>
              ) : diffContent ? (
                <DiffViewer content={diffContent} filename={file.path} />
              ) : (
                <View className="flex-1 items-center justify-center">
                  <Text className="text-muted text-xs">
                    Could not load file content
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>
      ))}
    </ScrollView>
  );
}
