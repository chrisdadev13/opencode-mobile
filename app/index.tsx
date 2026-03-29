import { Ionicons } from "@expo/vector-icons";
import { Redirect, useRouter } from "expo-router";
import { Button } from "heroui-native";
import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LeftSheet } from "@/components/left-sheet";
import { Logo } from "@/components/logo";
import { Colors, Fonts } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useProjects } from "@/hooks/use-opencode";
import { getClient, resetClient } from "@/lib/opencode";
import { clearAllServers, getLastUsedServer } from "@/lib/servers";

function formatTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes === 1) return "1 minute ago";
  if (minutes < 60) return `${minutes} minutes ago`;
  const hours = Math.floor(minutes / 60);
  if (hours === 1) return "1 hour ago";
  if (hours < 24) return `${hours} hours ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "1 day ago";
  if (days < 30) return `${days} days ago`;
  const date = new Date(timestamp);
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function abbreviatePath(worktree: string): string {
  const home = "/Users/" + worktree.split("/")[2];
  if (worktree.startsWith(home)) {
    return "~" + worktree.slice(home.length);
  }
  return worktree;
}

function getProjectName(worktree: string, name?: string): string {
  if (name) return name;
  const segments = worktree.replace(/\/+$/, "").split("/");
  return segments[segments.length - 1] || worktree;
}

export default function HomeScreen() {
  if (!getLastUsedServer()) {
    return <Redirect href="/connect" />;
  }

  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];
  const router = useRouter();
  const server = getLastUsedServer();
  const [menuOpen, setMenuOpen] = useState(false);
  const { projects: allProjects, loading, error, refresh } = useProjects();
  const projects = allProjects.filter((p) => p.worktree !== "/");

  return (
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3">
        <Pressable hitSlop={8} onPress={() => setMenuOpen(true)}>
          <Ionicons name="menu" size={24} color={colors.text} />
        </Pressable>
        <Pressable hitSlop={8} onPress={refresh}>
          <Ionicons name="refresh" size={20} color={colors.muted} />
        </Pressable>
      </View>

      {/* Logo + server status */}
      <View className="items-center mt-6 mb-8">
        <Logo />
        <View className="flex-row items-center mt-3 gap-2">
          <View
            style={{
              width: 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: error ? "#ef4444" : "#22c55e",
            }}
          />
          <Text className="text-muted text-sm">
            {server?.label || "Local Server"}
          </Text>
        </View>
      </View>

      {/* Projects heading */}
      <View className="px-6 flex-row items-center mb-2" style={{ gap: 6 }}>
        <Text
          className="text-foreground text-sm"
          style={{ fontFamily: Fonts.sans, fontWeight: "500" }}
        >
          Recent Projects
        </Text>
        {!loading && projects.length > 0 && (
          <Text
            className="text-muted text-xs"
            style={{ fontFamily: Fonts.sans }}
          >
            ({projects.length})
          </Text>
        )}
      </View>

      {/* Projects scroll area */}
      <ScrollView
        className="flex-1 px-6"
        contentContainerClassName="pb-8"
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View className="items-center py-8">
            <ActivityIndicator color={colors.muted} />
          </View>
        ) : error ? (
          <View className="items-center py-8">
            <Text className="text-muted text-sm mb-3">{error}</Text>
            <Button variant="outline" size="sm" onPress={refresh}>
              <Button.Label>Retry</Button.Label>
            </Button>
          </View>
        ) : projects.length === 0 ? (
          <View className="items-center py-8">
            <Text className="text-muted text-sm">No projects found</Text>
          </View>
        ) : (
          projects.map((project) => {
            const name = getProjectName(project.worktree, project.name);
            return (
              <Pressable
                key={project.id}
                className="py-2.5"
                onPress={async () => {
                  try {
                    const client = getClient();
                    const res = await client.session.list({ directory: project.worktree });
                    const sessions = Array.isArray(res.data) ? res.data : [];
                    if (sessions.length === 0) {
                      const created = await client.session.create({ directory: project.worktree });
                      if (created.data) {
                        router.push({
                          pathname: "/session/[id]",
                          params: { id: created.data.id, directory: project.worktree, projectName: name },
                        });
                        return;
                      }
                    }
                  } catch {}
                  router.push({
                    pathname: "/sessions",
                    params: {
                      directory: project.worktree,
                      name,
                    },
                  });
                }}
              >
                <View className="flex-row items-center justify-between">
                  <Text
                    className="text-foreground text-[14px] flex-1"
                    style={{ fontFamily: Fonts.mono, fontWeight: "300" }}
                    numberOfLines={1}
                  >
                    {abbreviatePath(project.worktree)}
                  </Text>
                  <Text
                    className="text-muted text-xs ml-4"
                    style={{ flexShrink: 0, fontFamily: Fonts.mono }}
                  >
                    {formatTime(project.time.updated)}
                  </Text>
                </View>
              </Pressable>
            );
          })
        )}
      </ScrollView>

      {/* Left Sheet */}
      <LeftSheet open={menuOpen} onClose={() => setMenuOpen(false)}>
        <View className="flex-1" style={{ paddingTop: insets.top }}>
          <View className="flex-1 items-center justify-center">
            <Text
              className="text-foreground text-base"
              style={{ fontFamily: Fonts.sans, fontWeight: "600" }}
            >
              No projects open
            </Text>
            <Text
              className="text-muted text-sm mt-2"
              style={{ fontFamily: Fonts.sans }}
            >
              Open a project to get started
            </Text>
            <Button
              variant="outline"
              size="sm"
              className="mt-5"
              onPress={() => setMenuOpen(false)}
            >
              <Ionicons name="open-outline" size={16} color={colors.text} />
              <Button.Label>Open project</Button.Label>
            </Button>
          </View>

          {/* Server info + disconnect */}
          <View
            className="px-4 py-3 border-t border-border"
            style={{ paddingBottom: insets.bottom + 8 }}
          >
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-2 flex-1">
                <View
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: 4,
                    backgroundColor: error ? "#ef4444" : "#22c55e",
                  }}
                />
                <Text
                  className="text-foreground text-sm"
                  style={{ fontFamily: Fonts.sans, fontWeight: "500" }}
                  numberOfLines={1}
                >
                  {server?.label || "Local Server"}
                </Text>
              </View>
              <Pressable
                hitSlop={8}
                onPress={() => {
                  setMenuOpen(false);
                  clearAllServers();
                  resetClient();
                  router.replace("/connect");
                }}
              >
                <Text
                  className="text-xs"
                  style={{ color: "#ef4444", fontFamily: Fonts.sans }}
                >
                  Disconnect
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </LeftSheet>
    </View>
  );
}
