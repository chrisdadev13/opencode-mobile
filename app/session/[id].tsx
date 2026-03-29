import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, ScrollView, Text, View } from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  capitalize,
  ChangesTab,
  ChatInput,
  EmptyState,
  InputToolbar,
  MessageBubble,
  PermissionCard,
  PickerModal,
  PickerOption,
  PickerSectionHeader,
  QuestionCard,
  SessionHeader,
  ThinkingShimmer,
  useColors,
} from "@/components/chat";
import {
  useFileStatus,
  useProjectInfo,
  useProviders,
  useSession,
} from "@/hooks/use-opencode";

export default function SessionScreen() {
  const { id, directory, projectName } = useLocalSearchParams<{
    id: string;
    directory?: string;
    projectName?: string;
  }>();
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const router = useRouter();
  const scrollViewRef = useRef<ScrollView>(null);
  const prevMessageCount = useRef(0);

  const [inputText, setInputText] = useState("");
  const [activeTab, setActiveTab] = useState<"session" | "changes">("session");
  const [activeAgent, setActiveAgent] = useState<"build" | "plan">("build");
  const [modelPickerVisible, setModelPickerVisible] = useState(false);
  const [agentPickerVisible, setAgentPickerVisible] = useState(false);
  const [effortPickerVisible, setEffortPickerVisible] = useState(false);
  const [selectedVariant, setSelectedVariant] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState<{
    providerID: string;
    modelID: string;
  } | null>({ providerID: "opencode", modelID: "big-pickle" });

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

  const activeModel = selectedModel ?? defaultModel;
  const isBusy = sessionStatus.type === "busy";

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

  const activeVariants = useMemo(() => {
    if (!activeModel) return [];
    const match = allModels.find(
      (m) =>
        m.providerID === activeModel.providerID &&
        m.modelID === activeModel.modelID,
    );
    return match?.variants ?? [];
  }, [activeModel, allModels]);

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
      behavior="padding"
      style={{
        flex: 1,
        backgroundColor: colors.background,
        paddingTop: insets.top,
      }}
    >
      <SessionHeader
        title={title}
        hasMessages={messages.length > 0}
        loading={loading}
        isBusy={isBusy}
        activeTab={activeTab}
        onBack={() => {
          if (directory) {
            router.replace({
              pathname: "/sessions",
              params: { directory, name: projectName },
            });
          } else {
            router.back();
          }
        }}
        onStop={abort}
        onTabChange={setActiveTab}
      />

      <View className="flex-1">
        {activeTab === "changes" ? (
          <ChangesTab files={changedFiles} loading={filesLoading} />
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
                  <EmptyState projectInfo={projectInfo} />
                )}

                {messages
                  .filter((msg) => msg.info?.role)
                  .map((msg, idx) => (
                    <MessageBubble
                      key={`${msg.info.id}-${idx}`}
                      role={msg.info.role}
                      parts={msg.parts}
                    />
                  ))}

                {pendingPermission && (
                  <PermissionCard
                    permission={pendingPermission}
                    onReply={(reply) =>
                      replyPermission(pendingPermission.id, reply)
                    }
                  />
                )}

                {pendingQuestion && (
                  <QuestionCard
                    question={pendingQuestion}
                    onReply={(answers) =>
                      replyQuestion(pendingQuestion.id, answers)
                    }
                    onReject={() => rejectQuestion(pendingQuestion.id)}
                  />
                )}

                {isBusy && !pendingPermission && !pendingQuestion && (
                  <ThinkingShimmer />
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
              className="px-3 pt-2 mb-0"
              style={{ paddingBottom: Math.max(insets.bottom, 18) }}
            >
              <ChatInput
                value={inputText}
                onChangeText={setInputText}
                onSend={handleSend}
                isBusy={isBusy}
              />
              <InputToolbar
                activeAgent={activeAgent}
                activeModelLabel={activeModelLabel}
                activeEffortLabel={activeEffortLabel}
                hasVariants={activeVariants.length > 0}
                onAgentPress={() => setAgentPickerVisible(true)}
                onModelPress={() => setModelPickerVisible(true)}
                onEffortPress={() => setEffortPickerVisible(true)}
              />
            </View>
          </>
        )}
      </View>

      {/* Model picker */}
      <PickerModal
        visible={modelPickerVisible}
        title="Select Model"
        onClose={() => setModelPickerVisible(false)}
      >
        {providers.map((provider) => (
          <View key={provider.id}>
            <PickerSectionHeader title={provider.name} />
            {provider.models.map((model) => (
              <PickerOption
                key={`${provider.id}-${model.id}`}
                label={model.name}
                icon="flash"
                isActive={
                  activeModel?.providerID === provider.id &&
                  activeModel?.modelID === model.id
                }
                onPress={() => {
                  setSelectedModel({
                    providerID: provider.id,
                    modelID: model.id,
                  });
                  setModelPickerVisible(false);
                }}
              />
            ))}
          </View>
        ))}
        {allModels.length === 0 && (
          <View style={{ padding: 32, alignItems: "center" }}>
            <ActivityIndicator color={colors.muted} />
            <Text
              style={{
                fontFamily: "system-ui",
                fontSize: 13,
                color: colors.muted,
                marginTop: 8,
              }}
            >
              Loading models...
            </Text>
          </View>
        )}
      </PickerModal>

      {/* Agent picker */}
      <PickerModal
        visible={agentPickerVisible}
        title="Select Mode"
        onClose={() => setAgentPickerVisible(false)}
      >
        {(["build", "plan"] as const).map((agent) => (
          <PickerOption
            key={agent}
            label={capitalize(agent)}
            description={
              agent === "plan"
                ? "Create a plan before writing code"
                : "Write code and make changes"
            }
            icon={agent === "plan" ? "map-outline" : "hammer-outline"}
            isActive={activeAgent === agent}
            onPress={() => {
              setActiveAgent(agent);
              setAgentPickerVisible(false);
            }}
          />
        ))}
      </PickerModal>

      {/* Effort picker */}
      <PickerModal
        visible={effortPickerVisible}
        title="Reasoning Effort"
        onClose={() => setEffortPickerVisible(false)}
      >
        <PickerOption
          label="Default"
          icon="speedometer-outline"
          isActive={selectedVariant === null}
          onPress={() => {
            setSelectedVariant(null);
            setEffortPickerVisible(false);
          }}
        />
        {activeVariants.map((variant) => (
          <PickerOption
            key={variant}
            label={capitalize(variant)}
            icon="speedometer-outline"
            isActive={selectedVariant === variant}
            onPress={() => {
              setSelectedVariant(variant);
              setEffortPickerVisible(false);
            }}
          />
        ))}
      </PickerModal>
    </KeyboardAvoidingView>
  );
}
