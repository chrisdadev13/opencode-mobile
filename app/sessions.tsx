import { Ionicons } from "@expo/vector-icons";
import type { SessionStatus } from "@opencode-ai/sdk/v2/client";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Button, Dialog } from "heroui-native";
import { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LeftSheet } from "@/components/left-sheet";
import { Logomark } from "@/components/logomark";
import { Spinner } from "@/components/spinner";
import { blue, Colors, Fonts } from "@/constants/theme";
import {
  useSessionStatuses,
  useSessions,
} from "@/hooks/use-opencode";
import { useWhisper } from "@/hooks/use-whisper";

type Session = ReturnType<typeof useSessions>["sessions"][number];
type GroupMode = "status" | "time";

function formatTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return "now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  const date = new Date(timestamp);
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function getStatusColor(): { busy: string; error: string } {
  return {
    busy: blue.dark[8],
    error: "#ef4444",
  };
}

function getTimeGroup(timestamp: number): string {
  const now = new Date();
  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  ).getTime();
  const startOfYesterday = startOfToday - 86400000;
  const startOfWeek = startOfToday - now.getDay() * 86400000;

  if (timestamp >= startOfToday) return "Today";
  if (timestamp >= startOfYesterday) return "Yesterday";
  if (timestamp >= startOfWeek) return "This Week";
  return "Older";
}

type GroupedSessions = { label: string; sessions: Session[] }[];

function groupByStatus(
  sessions: Session[],
  statuses: Record<string, SessionStatus>,
): GroupedSessions {
  const busy: Session[] = [];
  const retry: Session[] = [];
  const idle: Session[] = [];

  for (const s of sessions) {
    const st = statuses[s.id];
    if (st?.type === "busy") busy.push(s);
    else if (st?.type === "retry") retry.push(s);
    else idle.push(s);
  }

  const groups: GroupedSessions = [];
  if (busy.length) groups.push({ label: "Running", sessions: busy });
  if (retry.length) groups.push({ label: "Needs Attention", sessions: retry });
  if (idle.length) groups.push({ label: "Idle", sessions: idle });
  return groups;
}

function groupByTime(sessions: Session[]): GroupedSessions {
  const map = new Map<string, Session[]>();
  const order = ["Today", "Yesterday", "This Week", "Older"];

  for (const s of sessions) {
    const group = getTimeGroup(s.time.updated);
    if (!map.has(group)) map.set(group, []);
    map.get(group)!.push(s);
  }

  return order
    .filter((g) => map.has(g))
    .map((g) => ({ label: g, sessions: map.get(g)! }));
}

function SessionStatusIcon({
  status,
}: {
  status: SessionStatus | undefined;
}) {
  const statusColors = getStatusColor();
  if (!status || status.type === "idle") {
    return (
      <View
        style={{
          width: 14,
          height: 14,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <View
          style={{
            width: 10,
            height: 2,
            borderRadius: 1,
            backgroundColor: "#d4d4d4",
          }}
        />
      </View>
    );
  }
  if (status.type === "busy") {
    return <Spinner size={14} color={statusColors.busy} />;
  }
  return <Ionicons name="alert-circle" size={14} color={statusColors.error} />;
}

export default function SessionsScreen() {
  const { directory, name } = useLocalSearchParams<{
    directory: string;
    name: string;
  }>();

  const insets = useSafeAreaInsets();
  const colors = Colors.dark;
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [groupMode, setGroupMode] = useState<GroupMode>("status");
  const { sessions, loading, error, refresh, create, remove } = useSessions({
    directory,
  });
  const statuses = useSessionStatuses();
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    title: string;
  } | null>(null);

  const {
    isRecording,
    isLoading: whisperLoading,
    transcription,
    toggleRecording,
    stopRecording,
  } = useWhisper();

  const grouped =
    groupMode === "status"
      ? groupByStatus(sessions, statuses)
      : groupByTime(sessions);

  async function handleNewSession() {
    const session = await create();
    if (session) {
      router.push(`/session/${session.id}`);
    }
  }

  const handleMicPress = useCallback(async () => {
    const result = await toggleRecording();
    if (result) {
      const session = await create();
      if (session) {
        router.push(`/session/${session.id}?initialMessage=${encodeURIComponent(result)}`);
      }
    }
  }, [toggleRecording, create, router]);

  // Stop and create session directly
  const handleStopAndCreate = useCallback(async () => {
    const result = await stopRecording();
    if (result && result.trim()) {
      const session = await create();
      if (session) {
        router.push(`/session/${session.id}?initialMessage=${encodeURIComponent(result)}`);
      }
    }
  }, [stopRecording, create, router]);

  return (
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3">
        <View className="flex-row items-center" style={{ gap: 12 }}>
          <Pressable hitSlop={8} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </Pressable>
          <View className="flex-row items-center" style={{ gap: 8 }}>
            <Logomark size={16} />
            <Text
              className="text-foreground text-base"
              style={{ fontFamily: Fonts.sans, fontWeight: "600" }}
              numberOfLines={1}
            >
              {name || "Sessions"}
            </Text>
          </View>
        </View>
        <View className="flex-row items-center" style={{ gap: 12 }}>
          <Pressable hitSlop={8} onPress={() => setMenuOpen(true)}>
            <Ionicons name="menu" size={22} color={colors.text} />
          </Pressable>
          <Pressable hitSlop={8} onPress={handleNewSession}>
            <Ionicons name="add" size={24} color={colors.text} />
          </Pressable>
        </View>
      </View>

      <ScrollView
        contentContainerClassName="flex-grow pb-12"
        showsVerticalScrollIndicator={false}
      >
        {/* Sessions list */}
        <View className="px-6 mt-2">
          <View className="flex-row items-center justify-between mb-4">
            <Text
              className="text-foreground text-base"
              style={{ fontFamily: Fonts.sans, fontWeight: "600" }}
            >
              Sessions
            </Text>
            <View className="flex-row items-center" style={{ gap: 12 }}>
              <Pressable
                hitSlop={8}
                onPress={() =>
                  setGroupMode((m) => (m === "status" ? "time" : "status"))
                }
                className="flex-row items-center"
                style={{ gap: 4 }}
              >
                <Ionicons
                  name={groupMode === "status" ? "pulse" : "time-outline"}
                  size={14}
                  color={colors.muted}
                />
                <Text
                  className="text-muted text-xs"
                  style={{ fontFamily: Fonts.sans }}
                >
                  {groupMode === "status" ? "Status" : "Time"}
                </Text>
              </Pressable>
              <Pressable hitSlop={8} onPress={refresh}>
                <Ionicons name="refresh" size={18} color={colors.muted} />
              </Pressable>
            </View>
          </View>

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
          ) : sessions.length === 0 ? (
            <View className="items-center py-8">
              <Text className="text-muted text-sm mb-3">No sessions yet</Text>
              <Button variant="outline" size="sm" onPress={handleNewSession}>
                <Ionicons name="add" size={16} color={colors.text} />
                <Button.Label>New Session</Button.Label>
              </Button>
            </View>
          ) : (
            grouped.map((group) => (
              <View key={group.label} className="mb-4">
                {/* Section header */}
                <View className="flex-row items-center mb-2" style={{ gap: 6 }}>
                  {groupMode === "status" && (
                    <View
                      style={{
                        width: 7,
                        height: 7,
                        borderRadius: 4,
                        backgroundColor:
                          group.label === "Running"
                            ? "#60a5fa"
                            : group.label === "Needs Attention"
                              ? "#ef4444"
                              : "#22c55e",
                      }}
                    />
                  )}
                  <Text
                    className="text-muted text-xs"
                    style={{
                      fontFamily: Fonts.sans,
                      fontWeight: "600",
                      textTransform: "uppercase",
                      letterSpacing: 0.5,
                    }}
                  >
                    {group.label}
                  </Text>
                  <Text
                    className="text-muted text-xs"
                    style={{ fontFamily: Fonts.sans }}
                  >
                    ({group.sessions.length})
                  </Text>
                </View>

                {/* Session rows */}
                {group.sessions.map((session, index) => {
                  const sessionStatus = statuses[session.id];
                  return (
                    <Pressable
                      key={session.id}
                      className="py-3"
                      style={
                        index < group.sessions.length - 1
                          ? {
                              borderBottomWidth: 0.5,
                              borderBottomColor: colors.border,
                            }
                          : undefined
                      }
                      onPress={() => router.push(`/session/${session.id}`)}
                      onLongPress={() =>
                        setDeleteTarget({
                          id: session.id,
                          title: session.title || "Untitled",
                        })
                      }
                    >
                      <View className="flex-row items-center justify-between">
                        <View
                          className="flex-row items-center flex-1"
                          style={{ gap: 8 }}
                        >
                          <SessionStatusIcon status={sessionStatus} />
                          <Text
                            className="text-foreground text-sm flex-1"
                            style={{ fontFamily: Fonts.sans }}
                            numberOfLines={1}
                          >
                            {session.title || "Untitled"}
                          </Text>
                        </View>
                        <Text
                          className="text-muted text-xs ml-4"
                          style={{ flexShrink: 0 }}
                        >
                          {formatTime(session.time.updated)}
                        </Text>
                        <Pressable
                          hitSlop={8}
                          onPress={() =>
                            setDeleteTarget({
                              id: session.id,
                              title: session.title || "Untitled",
                            })
                          }
                          style={{ marginLeft: 8 }}
                        >
                          <Ionicons
                            name="trash-outline"
                            size={16}
                            color={colors.muted}
                          />
                        </Pressable>
                      </View>
                      {sessionStatus?.type === "busy" && (
                        <Text
                          className="text-xs ml-6 mt-0.5"
                          style={{ color: "#60a5fa", fontFamily: Fonts.sans }}
                        >
                          Running...
                        </Text>
                      )}
                      {sessionStatus?.type === "retry" && (
                        <Text
                          className="text-xs ml-6 mt-0.5"
                          style={{ color: "#ef4444", fontFamily: Fonts.sans }}
                        >
                          Retry #{sessionStatus.attempt}:{" "}
                          {sessionStatus.message}
                        </Text>
                      )}
                      {session.summary && (
                        <Text className="text-muted text-xs mt-1 ml-6">
                          +{session.summary.additions} -
                          {session.summary.deletions} in {session.summary.files}{" "}
                          file{session.summary.files !== 1 ? "s" : ""}
                        </Text>
                      )}
                    </Pressable>
                  );
                })}
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* Floating mic button */}
      <View
        style={{
          position: "absolute",
          bottom: insets.bottom + 24,
          alignSelf: "center",
          alignItems: "center",
        }}
      >
        {isRecording && transcription && (
          <View
            style={{
              backgroundColor: colors.surface,
              paddingHorizontal: 16,
              paddingVertical: 8,
              borderRadius: 20,
              marginBottom: 12,
              maxWidth: 280,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.2,
              shadowRadius: 4,
              elevation: 3,
            }}
          >
            <Text
              className="text-foreground text-sm"
              style={{ fontFamily: Fonts.sans }}
              numberOfLines={2}
            >
              {transcription}
            </Text>
          </View>
        )}
        {isRecording ? (
          <Pressable
            onPress={handleStopAndCreate}
            style={{
              width: 56,
              height: 56,
              borderRadius: 28,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: blue.dark[8],
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.3,
              shadowRadius: 4,
              elevation: 5,
            }}
          >
            <Ionicons name="stop" size={24} color="#fff" />
          </Pressable>
        ) : (
          <Pressable
            onPress={handleMicPress}
            disabled={whisperLoading}
            style={{
              width: 56,
              height: 56,
              borderRadius: 28,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: colors.surface,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.3,
              shadowRadius: 4,
              elevation: 5,
            }}
          >
            {whisperLoading ? (
              <ActivityIndicator size="small" color={colors.muted} />
            ) : (
              <Ionicons name="mic-outline" size={24} color={colors.text} />
            )}
          </Pressable>
        )}
      </View>

      {/* Delete confirmation dialog */}
      <Dialog
        isOpen={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay />
          <Dialog.Content>
            <View className="mb-5 gap-1.5">
              <Dialog.Title>Delete Session</Dialog.Title>
              <Dialog.Description>
                Delete "{deleteTarget?.title}"? This cannot be undone.
              </Dialog.Description>
            </View>
            <View className="flex-row justify-end gap-3">
              <Button
                variant="ghost"
                size="sm"
                onPress={() => setDeleteTarget(null)}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onPress={() => {
                  if (deleteTarget) remove(deleteTarget.id);
                  setDeleteTarget(null);
                }}
              >
                Delete
              </Button>
            </View>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog>

      {/* Left Sheet Navigation */}
      <LeftSheet open={menuOpen} onClose={() => setMenuOpen(false)}>
        <View className="flex-1" style={{ paddingTop: insets.top }}>
          {/* New Session */}
          <View className="px-4 pt-4 pb-3">
            <Button
              variant="outline"
              onPress={() => {
                setMenuOpen(false);
                handleNewSession();
              }}
            >
              <Ionicons name="add" size={18} color={colors.text} />
              <Button.Label>New Session</Button.Label>
            </Button>
          </View>

          {/* Session list */}
          <ScrollView
            className="flex-1 px-4"
            showsVerticalScrollIndicator={false}
          >
            {loading ? (
              <View className="items-center py-8">
                <ActivityIndicator color={colors.muted} />
              </View>
            ) : sessions.length === 0 ? (
              <Text className="text-muted text-sm text-center py-8">
                No sessions yet
              </Text>
            ) : (
              grouped.map((group) => (
                <View key={`drawer-${group.label}`} className="mb-3">
                  <View
                    className="flex-row items-center px-2 mb-1"
                    style={{ gap: 5 }}
                  >
                    {groupMode === "status" && (
                      <View
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: 3,
                          backgroundColor:
                            group.label === "Running"
                              ? "#60a5fa"
                              : group.label === "Needs Attention"
                                ? "#ef4444"
                                : "#22c55e",
                        }}
                      />
                    )}
                    <Text
                      className="text-muted text-xs"
                      style={{
                        fontFamily: Fonts.sans,
                        fontWeight: "600",
                        textTransform: "uppercase",
                        letterSpacing: 0.5,
                      }}
                    >
                      {group.label}
                    </Text>
                  </View>

                  {group.sessions.map((session) => {
                    const sessionStatus = statuses[session.id];
                    return (
                      <Pressable
                        key={session.id}
                        className="py-3 px-2 rounded-lg"
                        onPress={() => {
                          setMenuOpen(false);
                          router.push(`/session/${session.id}`);
                        }}
                      >
                        <View
                          className="flex-row items-center"
                          style={{ gap: 8 }}
                        >
                          <SessionStatusIcon status={sessionStatus} />
                          <Text
                            className="text-foreground text-sm flex-1"
                            style={{ fontFamily: Fonts.sans }}
                            numberOfLines={1}
                          >
                            {session.title || "Untitled"}
                          </Text>
                        </View>
                        <View
                          className="flex-row items-center ml-6 mt-0.5"
                          style={{ gap: 6 }}
                        >
                          <Text className="text-muted text-xs">
                            {formatTime(session.time.updated)}
                          </Text>
                          {sessionStatus?.type === "busy" && (
                            <Text
                              className="text-xs"
                              style={{
                                color: "#60a5fa",
                                fontFamily: Fonts.sans,
                              }}
                            >
                              Running
                            </Text>
                          )}
                          {sessionStatus?.type === "retry" && (
                            <Text
                              className="text-xs"
                              style={{
                                color: "#ef4444",
                                fontFamily: Fonts.sans,
                              }}
                            >
                              Retry #{sessionStatus.attempt}
                            </Text>
                          )}
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              ))
            )}
          </ScrollView>

          {/* Project info */}
          <View
            className="px-4 py-3 border-t border-border"
            style={{ paddingBottom: insets.bottom + 8 }}
          >
            <View className="flex-row items-center gap-2">
              <Ionicons
                name="folder-outline"
                size={16}
                color={colors.muted}
              />
              <Text
                className="text-foreground text-sm"
                style={{ fontFamily: Fonts.sans, fontWeight: "500" }}
                numberOfLines={1}
              >
                {name || "Project"}
              </Text>
            </View>
            {directory && (
              <Text
                className="text-muted text-xs mt-0.5 ml-6"
                numberOfLines={1}
              >
                {directory}
              </Text>
            )}
          </View>
        </View>
      </LeftSheet>
    </View>
  );
}
