import { Ionicons } from "@expo/vector-icons";
import type {
  Part,
  PermissionRequest,
  QuestionAnswer,
  QuestionRequest,
} from "@opencode-ai/sdk/v2/client";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import Markdown from "react-native-markdown-display";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { DiffViewer } from "@/components/diff-viewer";
import { FileIcon } from "@/components/file-icon";
import { Logomark } from "@/components/logomark";
import { Colors, Fonts } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import {
  type FileStatus,
  useFileStatus,
  useProjectInfo,
  useProviders,
  useSession,
} from "@/hooks/use-opencode";
import { fetchWithTimeout, getServerUrl } from "@/lib/opencode";

function getTextFromParts(parts: Part[]): string {
  return parts
    .filter((p): p is Extract<Part, { type: "text" }> => p.type === "text")
    .map((p) => p.text)
    .join("");
}

type ToolPartType = Extract<Part, { type: "tool" }>;

function getToolParts(parts: Part[]) {
  return parts.filter((p): p is ToolPartType => p.type === "tool");
}

type ReasoningPartType = Extract<Part, { type: "reasoning" }>;
type FilePartType = Extract<Part, { type: "file" }>;
type PatchPartType = Extract<Part, { type: "patch" }>;
type RetryPartType = Extract<Part, { type: "retry" }>;
type SubtaskPartType = Extract<Part, { type: "subtask" }>;

function getReasoningParts(parts: Part[]): ReasoningPartType[] {
  return parts.filter((p): p is ReasoningPartType => p.type === "reasoning");
}
function getFileParts(parts: Part[]): FilePartType[] {
  return parts.filter((p): p is FilePartType => p.type === "file");
}
function getPatchParts(parts: Part[]): PatchPartType[] {
  return parts.filter((p): p is PatchPartType => p.type === "patch");
}
function getRetryParts(parts: Part[]): RetryPartType[] {
  return parts.filter((p): p is RetryPartType => p.type === "retry");
}
function getSubtaskParts(parts: Part[]): SubtaskPartType[] {
  return parts.filter((p): p is SubtaskPartType => p.type === "subtask");
}

type ToolGroup = {
  key: string;
  tool: string;
  label: string;
  detail: string;
  items: ToolPartType[];
};

function groupTools(tools: ToolPartType[]): ToolGroup[] {
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

function getToolTitle(tool: ToolPartType): string {
  if (tool.state.status === "completed" || tool.state.status === "running") {
    return tool.state.title || tool.tool;
  }
  return tool.tool;
}

function extractFile(title: string): string {
  const parts = title.replace(/^(Read|Edit|Write|Patch)\s+/i, "").trim();
  return parts || title;
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export default function SessionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];
  const router = useRouter();
  const scrollViewRef = useRef<ScrollView>(null);
  const [inputText, setInputText] = useState("");
  const [activeTab, setActiveTab] = useState<"session" | "changes">("session");
  const [modelPickerVisible, setModelPickerVisible] = useState(false);
  const [activeAgent, setActiveAgent] = useState<"build" | "plan">("build");
  const [agentPickerVisible, setAgentPickerVisible] = useState(false);
  const prevMessageCount = useRef(0);

  const {
    messages,
    loading,
    sending,
    error,
    sessionStatus,
    title,
    sendMessage,
    abort,
    pendingPermission,
    replyPermission,
    pendingQuestion,
    replyQuestion,
    rejectQuestion,
  } = useSession(id);

  const {
    files: changedFiles,
    loading: filesLoading,
    refresh: refreshFiles,
  } = useFileStatus();
  const projectInfo = useProjectInfo();
  const { providers, defaultModel } = useProviders();
  const [selectedModel, setSelectedModel] = useState<{
    providerID: string;
    modelID: string;
  } | null>({ providerID: "opencode", modelID: "big-pickle" });
  const [selectedVariant, setSelectedVariant] = useState<string | null>(null);
  const [effortPickerVisible, setEffortPickerVisible] = useState(false);

  // Use selected model, fall back to default from provider config
  const activeModel = selectedModel ?? defaultModel;

  const isBusy = sessionStatus.type === "busy" || sending;

  // Flatten all provider models into a single list for the picker
  const allModels = useMemo(
    () =>
      providers.flatMap((p) =>
        p.models.map((m) => ({
          providerID: p.id,
          providerName: p.name,
          modelID: m.id,
          modelName: m.name,
          variants: m.variants,
        })),
      ),
    [providers],
  );

  // Available effort variants for the active model
  const activeVariants = useMemo(() => {
    if (!activeModel) return [];
    const match = allModels.find(
      (m) =>
        m.providerID === activeModel.providerID &&
        m.modelID === activeModel.modelID,
    );
    return match?.variants ?? [];
  }, [activeModel, allModels]);

  // Reset selected variant when switching to a model that doesn't support it
  useEffect(() => {
    if (selectedVariant && !activeVariants.includes(selectedVariant)) {
      setSelectedVariant(null);
    }
  }, [activeVariants, selectedVariant]);

  const activeEffortLabel = selectedVariant
    ? capitalize(selectedVariant)
    : "Default";

  const activeModelLabel = useMemo(() => {
    if (!activeModel) return "Select model";
    const match = allModels.find(
      (m) =>
        m.providerID === activeModel.providerID &&
        m.modelID === activeModel.modelID,
    );
    return match?.modelName ?? activeModel.modelID;
  }, [activeModel, allModels]);

  const handleSend = async () => {
    if (!inputText.trim() || isBusy) return;
    const text = inputText.trim();
    setInputText("");
    await sendMessage(
      text,
      activeModel ?? undefined,
      activeAgent,
      selectedVariant ?? undefined,
    );
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-background"
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={{ paddingTop: insets.top }}
    >
      {/* Header */}
      <View className="px-4 pt-2 pb-3" style={{ gap: 12 }}>
        {/* Top row: back, title, status */}
        <View className="flex-row items-center" style={{ gap: 10 }}>
          <Pressable
            hitSlop={8}
            onPress={() => router.back()}
            style={{
              width: 32,
              height: 32,
              borderRadius: 10,
              backgroundColor: colors.surfaceSecondary,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons name="chevron-back" size={18} color={colors.text} />
          </Pressable>

          <Logomark size={16} />
          <Text
            className="text-foreground flex-1"
            style={{ fontFamily: Fonts.sans, fontWeight: "600", fontSize: 16 }}
            numberOfLines={1}
          >
            {title ||
              (messages.length > 0 || loading ? "Session" : "New Session")}
          </Text>

          {isBusy ? (
            <Pressable
              hitSlop={8}
              onPress={abort}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 5,
                height: 28,
                paddingHorizontal: 10,
                borderRadius: 14,
                backgroundColor: "#fef2f2",
              }}
            >
              <View
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: 3,
                  backgroundColor: "#f59e0b",
                }}
              />
              <Text
                style={{
                  fontFamily: Fonts.mono,
                  fontSize: 11,
                  color: "#ef4444",
                  fontWeight: "500",
                }}
              >
                Stop
              </Text>
            </Pressable>
          ) : (
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 5,
                height: 28,
                paddingHorizontal: 10,
                borderRadius: 14,
                backgroundColor: colors.surfaceSecondary,
              }}
            >
              <View
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: 3,
                  backgroundColor: "#22c55e",
                }}
              />
              <Text
                style={{
                  fontFamily: Fonts.mono,
                  fontSize: 11,
                  color: colors.muted,
                }}
              >
                Ready
              </Text>
            </View>
          )}
        </View>

        {/* Segmented tabs */}
        <View
          style={{
            flexDirection: "row",
            backgroundColor: colors.surfaceSecondary,
            borderRadius: 10,
            padding: 3,
          }}
        >
          {(["session", "changes"] as const).map((tab) => {
            const active = activeTab === tab;
            return (
              <Pressable
                key={tab}
                onPress={() => setActiveTab(tab)}
                style={{
                  flex: 1,
                  alignItems: "center",
                  paddingVertical: 7,
                  borderRadius: 8,
                  backgroundColor: active ? colors.background : "transparent",
                  ...(active
                    ? Platform.select({
                        ios: {
                          shadowColor: "#000",
                          shadowOffset: { width: 0, height: 1 },
                          shadowOpacity: 0.08,
                          shadowRadius: 2,
                        },
                        default: { elevation: 1 },
                      })
                    : {}),
                }}
              >
                <Text
                  style={{
                    fontFamily: Fonts.sans,
                    fontSize: 13,
                    fontWeight: active ? "600" : "400",
                    color: active ? colors.text : colors.muted,
                  }}
                >
                  {tab === "session" ? "Session" : "Changes"}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Tab content */}
      <View className="flex-1">
        {activeTab === "changes" ? (
          <ChangesTab
            files={changedFiles}
            loading={filesLoading}
            refresh={refreshFiles}
            colors={colors}
          />
        ) : (
          <>
            {loading ? (
              <View className="flex-1 items-center justify-center">
                <ActivityIndicator color={colors.muted} />
              </View>
            ) : (
              <ScrollView
                ref={scrollViewRef}
                className="flex-1"
                contentContainerClassName="py-4"
                contentContainerStyle={
                  messages.length === 0 ? { flexGrow: 1 } : undefined
                }
                showsVerticalScrollIndicator={false}
                onContentSizeChange={() => {
                  const count = messages.length;
                  if (count !== prevMessageCount.current) {
                    prevMessageCount.current = count;
                    scrollViewRef.current?.scrollToEnd({ animated: false });
                  }
                }}
              >
                {messages.length === 0 && !loading && (
                  <EmptyState projectInfo={projectInfo} colors={colors} />
                )}
                {messages
                  .filter((msg) => msg.info?.role)
                  .map((msg, idx) => (
                    <MessageBubble
                      key={`${msg.info.id}-${idx}`}
                      role={msg.info.role}
                      parts={msg.parts}
                      colors={colors}
                    />
                  ))}
                {/* Inline permission prompt */}
                {pendingPermission && (
                  <PermissionCard
                    permission={pendingPermission}
                    onReply={(reply) =>
                      replyPermission(pendingPermission.id, reply)
                    }
                    colors={colors}
                  />
                )}
                {/* Inline question prompt */}
                {pendingQuestion && (
                  <QuestionCard
                    question={pendingQuestion}
                    onReply={(answers) =>
                      replyQuestion(pendingQuestion.id, answers)
                    }
                    onReject={() => rejectQuestion(pendingQuestion.id)}
                    colors={colors}
                  />
                )}
                {isBusy && !pendingPermission && !pendingQuestion && (
                  <ThinkingShimmer colors={colors} />
                )}
                {error && (
                  <View className="px-4 py-2">
                    <Text className="text-danger text-xs">{error}</Text>
                  </View>
                )}
              </ScrollView>
            )}

            {/* Input area */}
            <View
              className="px-3 pt-2 mb-2"
              style={{ paddingBottom: Math.max(insets.bottom, 18) }}
            >
              {/* Input card */}
              <View className="bg-surface rounded-4xl border border-[#C1C0C0] z-50">
                <TextInput
                  placeholder="Ask anything..."
                  placeholderTextColor={colors.muted}
                  value={inputText}
                  onChangeText={setInputText}
                  multiline
                  editable={!isBusy}
                  style={{
                    fontFamily: Fonts.sans,
                    fontSize: 14,
                    color: colors.text,
                    paddingHorizontal: 12,
                    minHeight: 100,
                    paddingTop: 12,
                    paddingBottom: 44,
                    maxHeight: 180,
                    textAlignVertical: "top",
                  }}
                  onSubmitEditing={handleSend}
                  blurOnSubmit={false}
                />
                {/* + button — absolute bottom-left */}
                <Pressable
                  hitSlop={8}
                  style={{
                    position: "absolute",
                    bottom: 8,
                    left: 8,
                    width: 32,
                    height: 32,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Ionicons name="add" size={20} color={colors.muted} />
                </Pressable>
                {/* Send button — absolute bottom-right */}
                {isBusy ? (
                  <View
                    style={{
                      position: "absolute",
                      bottom: 8,
                      right: 8,
                      width: 32,
                      height: 32,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <ActivityIndicator size="small" color={colors.muted} />
                  </View>
                ) : (
                  <Pressable
                    onPress={handleSend}
                    disabled={!inputText.trim()}
                    style={{
                      position: "absolute",
                      bottom: 8,
                      right: 8,
                      width: 32,
                      height: 32,
                      borderRadius: 8,
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: inputText.trim()
                        ? colors.accent
                        : "transparent",
                    }}
                  >
                    <Ionicons
                      name="arrow-up"
                      size={18}
                      color={
                        inputText.trim() ? colors.background : colors.muted
                      }
                    />
                  </Pressable>
                )}
              </View>

              {/* Toolbar tray */}
              <View
                className="flex-row items-center px-1 pb-2 bg-[#F8F8F8] rounded-b-4xl border-x border-b border-[#DBDBDB] -mt-3 z-0"
                style={{ gap: 6, paddingTop: 18 }}
              >
                <Pressable
                  className="flex-row items-center rounded-md"
                  style={{ height: 28, paddingHorizontal: 8, gap: 4 }}
                  onPress={() => setAgentPickerVisible(true)}
                >
                  <Text
                    className="text-muted"
                    style={{ fontFamily: Fonts.sans, fontSize: 13 }}
                  >
                    {activeAgent === "plan" ? "Plan" : "Build"}
                  </Text>
                  <Ionicons
                    name="chevron-down"
                    size={11}
                    color={colors.muted}
                  />
                </Pressable>
                <Pressable
                  className="flex-row items-center rounded-md"
                  style={{ height: 28, paddingHorizontal: 4, gap: 4 }}
                  onPress={() => setModelPickerVisible(true)}
                >
                  <Ionicons name="flash" size={13} color={colors.muted} />
                  <Text
                    className="text-muted"
                    style={{ fontFamily: Fonts.sans, fontSize: 13 }}
                    numberOfLines={1}
                  >
                    {activeModelLabel}
                  </Text>
                  <Ionicons
                    name="chevron-down"
                    size={11}
                    color={colors.muted}
                  />
                </Pressable>
                <Pressable
                  className="flex-row items-center rounded-md"
                  style={{ height: 28, paddingHorizontal: 8, gap: 4 }}
                  onPress={() => setEffortPickerVisible(true)}
                  disabled={activeVariants.length === 0}
                >
                  <Ionicons
                    name="speedometer-outline"
                    size={13}
                    color={colors.muted}
                  />
                  <Text
                    className="text-muted"
                    style={{
                      fontFamily: Fonts.sans,
                      fontSize: 13,
                      opacity: activeVariants.length === 0 ? 0.5 : 1,
                    }}
                  >
                    {activeEffortLabel}
                  </Text>
                  {activeVariants.length > 0 && (
                    <Ionicons
                      name="chevron-down"
                      size={11}
                      color={colors.muted}
                    />
                  )}
                </Pressable>
              </View>
            </View>
          </>
        )}
      </View>

      {/* Model picker modal */}
      <Modal
        visible={modelPickerVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModelPickerVisible(false)}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)" }}
          onPress={() => setModelPickerVisible(false)}
        >
          <View style={{ flex: 1 }} />
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={{
              backgroundColor: colors.background,
              borderTopLeftRadius: 16,
              borderTopRightRadius: 16,
              paddingBottom: Math.max(insets.bottom, 16),
              maxHeight: "60%",
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                paddingHorizontal: 16,
                paddingVertical: 14,
                borderBottomWidth: 1,
                borderColor: colors.border,
              }}
            >
              <Text
                style={{
                  fontFamily: Fonts.sans,
                  fontSize: 16,
                  fontWeight: "600",
                  color: colors.text,
                }}
              >
                Select Model
              </Text>
              <Pressable
                hitSlop={8}
                onPress={() => setModelPickerVisible(false)}
              >
                <Ionicons name="close" size={20} color={colors.muted} />
              </Pressable>
            </View>
            <ScrollView>
              {providers.map((provider) => (
                <View key={provider.id}>
                  <Text
                    style={{
                      fontFamily: Fonts.mono,
                      fontSize: 11,
                      fontWeight: "600",
                      color: colors.muted,
                      paddingHorizontal: 16,
                      paddingTop: 14,
                      paddingBottom: 6,
                      textTransform: "uppercase",
                      letterSpacing: 0.5,
                    }}
                  >
                    {provider.name}
                  </Text>
                  {provider.models.map((model) => {
                    const isActive =
                      activeModel?.providerID === provider.id &&
                      activeModel?.modelID === model.id;
                    return (
                      <Pressable
                        key={`${provider.id}-${model.id}`}
                        onPress={() => {
                          setSelectedModel({
                            providerID: provider.id,
                            modelID: model.id,
                          });
                          setModelPickerVisible(false);
                        }}
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          paddingHorizontal: 16,
                          paddingVertical: 12,
                          gap: 10,
                          backgroundColor: isActive
                            ? colors.surfaceSecondary
                            : "transparent",
                        }}
                      >
                        <Ionicons
                          name="flash"
                          size={14}
                          color={isActive ? colors.accent : colors.muted}
                        />
                        <Text
                          style={{
                            flex: 1,
                            fontFamily: Fonts.sans,
                            fontSize: 14,
                            color: colors.text,
                            fontWeight: isActive ? "600" : "400",
                          }}
                          numberOfLines={1}
                        >
                          {model.name}
                        </Text>
                        {isActive && (
                          <Ionicons
                            name="checkmark"
                            size={18}
                            color={colors.accent}
                          />
                        )}
                      </Pressable>
                    );
                  })}
                </View>
              ))}
              {allModels.length === 0 && (
                <View
                  style={{
                    padding: 32,
                    alignItems: "center",
                  }}
                >
                  <ActivityIndicator color={colors.muted} />
                  <Text
                    style={{
                      fontFamily: Fonts.sans,
                      fontSize: 13,
                      color: colors.muted,
                      marginTop: 8,
                    }}
                  >
                    Loading models...
                  </Text>
                </View>
              )}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Agent picker modal */}
      <Modal
        visible={agentPickerVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setAgentPickerVisible(false)}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)" }}
          onPress={() => setAgentPickerVisible(false)}
        >
          <View style={{ flex: 1 }} />
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={{
              backgroundColor: colors.background,
              borderTopLeftRadius: 16,
              borderTopRightRadius: 16,
              paddingBottom: Math.max(insets.bottom, 16),
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                paddingHorizontal: 16,
                paddingVertical: 14,
                borderBottomWidth: 1,
                borderColor: colors.border,
              }}
            >
              <Text
                style={{
                  fontFamily: Fonts.sans,
                  fontSize: 16,
                  fontWeight: "600",
                  color: colors.text,
                }}
              >
                Select Mode
              </Text>
              <Pressable
                hitSlop={8}
                onPress={() => setAgentPickerVisible(false)}
              >
                <Ionicons name="close" size={20} color={colors.muted} />
              </Pressable>
            </View>
            {(["build", "plan"] as const).map((agent) => {
              const isActive = activeAgent === agent;
              return (
                <Pressable
                  key={agent}
                  onPress={() => {
                    setActiveAgent(agent);
                    setAgentPickerVisible(false);
                  }}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    paddingHorizontal: 16,
                    paddingVertical: 14,
                    gap: 10,
                    backgroundColor: isActive
                      ? colors.surfaceSecondary
                      : "transparent",
                  }}
                >
                  <Ionicons
                    name={agent === "plan" ? "map-outline" : "hammer-outline"}
                    size={16}
                    color={isActive ? colors.accent : colors.muted}
                  />
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        fontFamily: Fonts.sans,
                        fontSize: 14,
                        color: colors.text,
                        fontWeight: isActive ? "600" : "400",
                      }}
                    >
                      {capitalize(agent)}
                    </Text>
                    <Text
                      style={{
                        fontFamily: Fonts.sans,
                        fontSize: 12,
                        color: colors.muted,
                        marginTop: 2,
                      }}
                    >
                      {agent === "plan"
                        ? "Create a plan before writing code"
                        : "Write code and make changes"}
                    </Text>
                  </View>
                  {isActive && (
                    <Ionicons
                      name="checkmark"
                      size={18}
                      color={colors.accent}
                    />
                  )}
                </Pressable>
              );
            })}
          </Pressable>
        </Pressable>
      </Modal>

      {/* Effort picker modal */}
      <Modal
        visible={effortPickerVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setEffortPickerVisible(false)}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)" }}
          onPress={() => setEffortPickerVisible(false)}
        >
          <View style={{ flex: 1 }} />
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={{
              backgroundColor: colors.background,
              borderTopLeftRadius: 16,
              borderTopRightRadius: 16,
              paddingBottom: Math.max(insets.bottom, 16),
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                paddingHorizontal: 16,
                paddingVertical: 14,
                borderBottomWidth: 1,
                borderColor: colors.border,
              }}
            >
              <Text
                style={{
                  fontFamily: Fonts.sans,
                  fontSize: 16,
                  fontWeight: "600",
                  color: colors.text,
                }}
              >
                Reasoning Effort
              </Text>
              <Pressable
                hitSlop={8}
                onPress={() => setEffortPickerVisible(false)}
              >
                <Ionicons name="close" size={20} color={colors.muted} />
              </Pressable>
            </View>
            {/* Default option */}
            <Pressable
              onPress={() => {
                setSelectedVariant(null);
                setEffortPickerVisible(false);
              }}
              style={{
                flexDirection: "row",
                alignItems: "center",
                paddingHorizontal: 16,
                paddingVertical: 14,
                gap: 10,
                backgroundColor:
                  selectedVariant === null
                    ? colors.surfaceSecondary
                    : "transparent",
              }}
            >
              <Ionicons
                name="speedometer-outline"
                size={16}
                color={selectedVariant === null ? colors.accent : colors.muted}
              />
              <Text
                style={{
                  flex: 1,
                  fontFamily: Fonts.sans,
                  fontSize: 14,
                  color: colors.text,
                  fontWeight: selectedVariant === null ? "600" : "400",
                }}
              >
                Default
              </Text>
              {selectedVariant === null && (
                <Ionicons name="checkmark" size={18} color={colors.accent} />
              )}
            </Pressable>
            {/* Variant options */}
            {activeVariants.map((variant) => {
              const isActive = selectedVariant === variant;
              return (
                <Pressable
                  key={variant}
                  onPress={() => {
                    setSelectedVariant(variant);
                    setEffortPickerVisible(false);
                  }}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    paddingHorizontal: 16,
                    paddingVertical: 14,
                    gap: 10,
                    backgroundColor: isActive
                      ? colors.surfaceSecondary
                      : "transparent",
                  }}
                >
                  <Ionicons
                    name="speedometer-outline"
                    size={16}
                    color={isActive ? colors.accent : colors.muted}
                  />
                  <Text
                    style={{
                      flex: 1,
                      fontFamily: Fonts.sans,
                      fontSize: 14,
                      color: colors.text,
                      fontWeight: isActive ? "600" : "400",
                    }}
                  >
                    {capitalize(variant)}
                  </Text>
                  {isActive && (
                    <Ionicons
                      name="checkmark"
                      size={18}
                      color={colors.accent}
                    />
                  )}
                </Pressable>
              );
            })}
          </Pressable>
        </Pressable>
      </Modal>

    </KeyboardAvoidingView>
  );
}

function PermissionCard({
  permission,
  onReply,
  colors,
}: {
  permission: PermissionRequest;
  onReply: (reply: "once" | "always" | "reject") => void;
  colors: (typeof Colors)["light"];
}) {
  return (
    <View
      className="mx-4 mb-4 rounded-xl px-4 py-3"
      style={{
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: "#f59e0b44",
      }}
    >
      {/* Header */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 8,
          marginBottom: 10,
        }}
      >
        <Ionicons name="shield-checkmark-outline" size={18} color="#f59e0b" />
        <Text
          style={{
            fontFamily: Fonts.sans,
            fontSize: 14,
            fontWeight: "600",
            color: colors.text,
            flex: 1,
          }}
        >
          Permission Required
        </Text>
      </View>

      {/* Permission type badge */}
      <View
        style={{
          backgroundColor: colors.surfaceSecondary,
          borderRadius: 6,
          paddingHorizontal: 8,
          paddingVertical: 3,
          alignSelf: "flex-start",
          marginBottom: 8,
        }}
      >
        <Text
          style={{
            fontFamily: Fonts.mono,
            fontSize: 12,
            color: colors.muted,
          }}
        >
          {permission.permission}
        </Text>
      </View>

      {/* Patterns */}
      {permission.patterns.length > 0 && (
        <View style={{ marginBottom: 10 }}>
          {permission.patterns.map((p, i) => (
            <Text
              key={i}
              style={{
                fontFamily: Fonts.mono,
                fontSize: 12,
                color: colors.text,
                marginTop: 2,
              }}
              numberOfLines={1}
            >
              {p}
            </Text>
          ))}
        </View>
      )}

      {/* Action buttons */}
      <View style={{ flexDirection: "row", gap: 8 }}>
        <Pressable
          onPress={() => onReply("reject")}
          style={{
            flex: 1,
            height: 38,
            borderRadius: 8,
            borderWidth: 1,
            borderColor: colors.border,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text
            style={{
              fontFamily: Fonts.sans,
              fontSize: 13,
              fontWeight: "600",
              color: colors.destructive,
            }}
          >
            Deny
          </Text>
        </Pressable>
        <Pressable
          onPress={() => onReply("always")}
          style={{
            flex: 1,
            height: 38,
            borderRadius: 8,
            backgroundColor: colors.surfaceSecondary,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text
            style={{
              fontFamily: Fonts.sans,
              fontSize: 13,
              fontWeight: "500",
              color: colors.text,
            }}
          >
            Always
          </Text>
        </Pressable>
        <Pressable
          onPress={() => onReply("once")}
          style={{
            flex: 1,
            height: 38,
            borderRadius: 8,
            backgroundColor: colors.accent,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text
            style={{
              fontFamily: Fonts.sans,
              fontSize: 13,
              fontWeight: "600",
              color: colors.background,
            }}
          >
            Allow
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

function QuestionCard({
  question,
  onReply,
  onReject,
  colors,
}: {
  question: QuestionRequest;
  onReply: (answers: QuestionAnswer[]) => void;
  onReject: () => void;
  colors: (typeof Colors)["light"];
}) {
  const [selections, setSelections] = useState<string[][]>(
    question.questions.map(() => []),
  );
  const [customTexts, setCustomTexts] = useState<string[]>(
    question.questions.map(() => ""),
  );

  const toggleOption = (qIdx: number, label: string) => {
    setSelections((prev) => {
      const updated = [...prev];
      const current = updated[qIdx]!;
      const isMultiple = question.questions[qIdx]?.multiple ?? false;

      if (isMultiple) {
        updated[qIdx] = current.includes(label)
          ? current.filter((l) => l !== label)
          : [...current, label];
      } else {
        updated[qIdx] = [label];
      }
      return updated;
    });
    setCustomTexts((prev) => {
      const updated = [...prev];
      updated[qIdx] = "";
      return updated;
    });
  };

  const handleSubmit = () => {
    if (!hasAnswer) return;
    const answers: QuestionAnswer[] = selections.map((sel, i) => {
      const custom = customTexts[i]?.trim();
      if (custom) return [custom];
      return sel;
    });
    onReply(answers);
  };

  const hasAnswer =
    selections.some((s) => s.length > 0) ||
    customTexts.some((t) => t.trim().length > 0);

  return (
    <View
      className="mx-4 mb-4 rounded-xl px-4 py-3"
      style={{
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
      }}
    >
      {question.questions.map((q, qIdx) => (
        <View key={qIdx} style={{ marginBottom: qIdx < question.questions.length - 1 ? 16 : 0 }}>
          {/* Header */}
          <Text
            style={{
              fontFamily: Fonts.sans,
              fontSize: 14,
              fontWeight: "600",
              color: colors.text,
              marginBottom: 4,
            }}
          >
            {q.header}
          </Text>
          {/* Question */}
          <Text
            style={{
              fontFamily: Fonts.sans,
              fontSize: 13,
              color: colors.muted,
              marginBottom: 10,
              lineHeight: 19,
            }}
          >
            {q.question}
          </Text>
          {/* Options */}
          <View style={{ gap: 6 }}>
            {q.options.map((opt) => {
              const selected = selections[qIdx]?.includes(opt.label);
              return (
                <Pressable
                  key={opt.label}
                  onPress={() => toggleOption(qIdx, opt.label)}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    paddingHorizontal: 10,
                    paddingVertical: 8,
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor: selected ? colors.accent : colors.border,
                    backgroundColor: selected
                      ? colors.surfaceSecondary
                      : "transparent",
                    gap: 8,
                  }}
                >
                  <View
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: q.multiple ? 4 : 9,
                      borderWidth: 2,
                      borderColor: selected ? colors.accent : colors.muted,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {selected && (
                      <Ionicons
                        name="checkmark"
                        size={12}
                        color={colors.accent}
                      />
                    )}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        fontFamily: Fonts.sans,
                        fontSize: 13,
                        fontWeight: "500",
                        color: colors.text,
                      }}
                    >
                      {opt.label}
                    </Text>
                    {opt.description ? (
                      <Text
                        style={{
                          fontFamily: Fonts.sans,
                          fontSize: 11,
                          color: colors.muted,
                          marginTop: 1,
                        }}
                      >
                        {opt.description}
                      </Text>
                    ) : null}
                  </View>
                </Pressable>
              );
            })}
          </View>
          {/* Custom input */}
          {q.custom !== false && (
            <TextInput
              placeholder="Or type a custom answer..."
              placeholderTextColor={colors.muted}
              value={customTexts[qIdx]}
              onChangeText={(text) => {
                setCustomTexts((prev) => {
                  const updated = [...prev];
                  updated[qIdx] = text;
                  return updated;
                });
                if (text.trim()) {
                  setSelections((prev) => {
                    const updated = [...prev];
                    updated[qIdx] = [];
                    return updated;
                  });
                }
              }}
              style={{
                marginTop: 8,
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: 8,
                paddingHorizontal: 10,
                paddingVertical: 8,
                fontFamily: Fonts.sans,
                fontSize: 13,
                color: colors.text,
              }}
            />
          )}
        </View>
      ))}

      {/* Actions */}
      <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
        <Pressable
          onPress={onReject}
          style={{
            flex: 1,
            height: 38,
            borderRadius: 8,
            borderWidth: 1,
            borderColor: colors.border,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text
            style={{
              fontFamily: Fonts.sans,
              fontSize: 13,
              fontWeight: "600",
              color: colors.muted,
            }}
          >
            Skip
          </Text>
        </Pressable>
        <Pressable
          onPress={handleSubmit}
          disabled={!hasAnswer}
          style={{
            flex: 2,
            height: 38,
            borderRadius: 8,
            backgroundColor: hasAnswer
              ? colors.accent
              : colors.surfaceSecondary,
            alignItems: "center",
            justifyContent: "center",
            opacity: hasAnswer ? 1 : 0.4,
          }}
        >
          <Text
            style={{
              fontFamily: Fonts.sans,
              fontSize: 13,
              fontWeight: "600",
              color: hasAnswer ? colors.background : colors.muted,
            }}
          >
            Submit
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

function EmptyState({
  projectInfo,
  colors,
}: {
  projectInfo: ReturnType<typeof useProjectInfo>;
  colors: (typeof Colors)["light"];
}) {
  const pathSegments = projectInfo?.path?.split("/") ?? [];
  const projectName = pathSegments.pop() ?? "";
  const parentPath = pathSegments.join("/");

  return (
    <View className="flex-1 items-center justify-center" style={{ gap: 16 }}>
      <Logomark size={36} />

      {/* Title */}
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

      {/* Project path */}
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

      {/* Branch */}
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

function useMarkdownStyles(colors: (typeof Colors)["light"]) {
  return useMemo(
    () =>
      ({
        body: {
          fontFamily: Fonts.sans,
          fontSize: 14,
          lineHeight: 22,
          color: colors.text,
        },
        heading1: {
          fontFamily: Fonts.sans,
          fontSize: 22,
          fontWeight: "700",
          color: colors.text,
          marginTop: 16,
          marginBottom: 8,
        },
        heading2: {
          fontFamily: Fonts.sans,
          fontSize: 18,
          fontWeight: "700",
          color: colors.text,
          marginTop: 14,
          marginBottom: 6,
        },
        heading3: {
          fontFamily: Fonts.sans,
          fontSize: 16,
          fontWeight: "600",
          color: colors.text,
          marginTop: 12,
          marginBottom: 4,
        },
        paragraph: {
          marginTop: 0,
          marginBottom: 8,
        },
        strong: {
          fontWeight: "700",
        },
        em: {
          fontStyle: "italic",
        },
        code_inline: {
          fontFamily: Fonts.mono,
          fontSize: 13,
          backgroundColor: colors.surfaceSecondary,
          color: colors.text,
          borderRadius: 4,
          paddingHorizontal: 5,
          paddingVertical: 1,
        },
        fence: {
          fontFamily: Fonts.mono,
          fontSize: 13,
          lineHeight: 20,
          backgroundColor: colors.surfaceSecondary,
          color: colors.text,
          borderRadius: 8,
          borderWidth: 1,
          borderColor: colors.border,
          padding: 12,
          marginVertical: 8,
        },
        code_block: {
          fontFamily: Fonts.mono,
          fontSize: 13,
          lineHeight: 20,
          backgroundColor: colors.surfaceSecondary,
          color: colors.text,
          borderRadius: 8,
          borderWidth: 1,
          borderColor: colors.border,
          padding: 12,
          marginVertical: 8,
        },
        blockquote: {
          backgroundColor: colors.surfaceSecondary,
          borderLeftWidth: 3,
          borderLeftColor: colors.muted,
          paddingLeft: 12,
          paddingVertical: 4,
          marginVertical: 8,
          borderRadius: 4,
        },
        link: {
          color: colors.accent,
          textDecorationLine: "underline",
        },
        list_item: {
          marginBottom: 4,
        },
        bullet_list: {
          marginVertical: 4,
        },
        ordered_list: {
          marginVertical: 4,
        },
        hr: {
          backgroundColor: colors.border,
          height: 1,
          marginVertical: 12,
        },
        table: {
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: 6,
          marginVertical: 8,
        },
        thead: {
          backgroundColor: colors.surfaceSecondary,
        },
        th: {
          padding: 8,
          fontWeight: "600",
          borderBottomWidth: 1,
          borderColor: colors.border,
        },
        td: {
          padding: 8,
          borderBottomWidth: 1,
          borderColor: colors.border,
        },
        tr: {
          borderBottomWidth: 1,
          borderColor: colors.border,
        },
      }) as const,
    [colors],
  );
}

function MessageBubble({
  role,
  parts,
  colors,
}: {
  role: "user" | "assistant";
  parts: Part[];
  colors: (typeof Colors)["light"];
}) {
  const isUser = role === "user";
  const text = getTextFromParts(parts);
  const tools = getToolParts(parts);
  const groups = groupTools(tools);
  const reasoningParts = getReasoningParts(parts);
  const fileParts = getFileParts(parts);
  const patchParts = getPatchParts(parts);
  const retryParts = getRetryParts(parts);
  const subtaskParts = getSubtaskParts(parts);
  const mdStyles = useMarkdownStyles(colors);

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
              ? "bg-accent-foreground border border-[#DBDBDB]"
              : "bg-transparent"
          }`}
        >
          {/* Reasoning / thinking */}
          {reasoningParts.map((p) => (
            <ReasoningPartRow key={p.id} part={p} colors={colors} />
          ))}
          {/* Text content */}
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
          {/* Tool calls — grouped by action */}
          {groups.map((group) => (
            <ToolGroupRow key={group.key} group={group} colors={colors} />
          ))}
          {/* Subtasks */}
          {subtaskParts.map((p) => (
            <SubtaskPartRow key={p.id} part={p} colors={colors} />
          ))}
          {/* File references */}
          {fileParts.map((p) => (
            <FilePartRow key={p.id} part={p} colors={colors} />
          ))}
          {/* Patches */}
          {patchParts.map((p) => (
            <PatchPartRow key={p.id} part={p} colors={colors} />
          ))}
          {/* Retries */}
          {retryParts.map((p) => (
            <RetryPartRow key={p.id} part={p} colors={colors} />
          ))}
        </View>
      </View>
    </View>
  );
}

function ToolGroupRow({
  group,
  colors,
}: {
  group: ToolGroup;
  colors: (typeof Colors)["light"];
}) {
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

function ReasoningPartRow({
  part,
  colors,
}: {
  part: ReasoningPartType;
  colors: (typeof Colors)["light"];
}) {
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

function SubtaskPartRow({
  part,
  colors,
}: {
  part: SubtaskPartType;
  colors: (typeof Colors)["light"];
}) {
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

function FilePartRow({
  part,
  colors,
}: {
  part: FilePartType;
  colors: (typeof Colors)["light"];
}) {
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

function PatchPartRow({
  part,
  colors,
}: {
  part: PatchPartType;
  colors: (typeof Colors)["light"];
}) {
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

function RetryPartRow({
  part,
  colors,
}: {
  part: RetryPartType;
  colors: (typeof Colors)["light"];
}) {
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

function ChangesTab({
  files,
  loading,
  refresh,
  colors,
}: {
  files: FileStatus[];
  loading: boolean;
  refresh: () => void;
  colors: (typeof Colors)["light"];
}) {
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

const THINKING_PHRASES = [
  "Thinking...",
  "Preparing...",
  "Baking...",
  "Brewing ideas...",
  "Cooking up something...",
  "Crunching thoughts...",
  "Spinning gears...",
  "Connecting dots...",
  "Warming up...",
  "Pondering...",
  "Assembling words...",
  "Almost there...",
];

function ThinkingShimmer({ colors }: { colors: (typeof Colors)["light"] }) {
  const [phrase, setPhrase] = useState(
    () =>
      THINKING_PHRASES[Math.floor(Math.random() * THINKING_PHRASES.length)]!,
  );
  const opacity = useSharedValue(0.4);

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 700, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.4, { duration: 700, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false,
    );
  }, [opacity]);

  useEffect(() => {
    const interval = setInterval(() => {
      setPhrase(
        THINKING_PHRASES[Math.floor(Math.random() * THINKING_PHRASES.length)]!,
      );
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <View className="px-7 mb-6 items-start">
      <Animated.Text
        style={[
          {
            fontFamily: Fonts.sans,
            fontSize: 14,
            color: colors.muted,
            lineHeight: 20,
          },
          animatedStyle,
        ]}
      >
        {phrase}
      </Animated.Text>
    </View>
  );
}
