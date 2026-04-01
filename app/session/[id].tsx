import { FlashList, type FlashListRef } from "@shopify/flash-list";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  capitalize,
  ChangesTab,
  Confirmation,
  ConfirmationAction,
  ConfirmationActions,
  ConfirmationContent,
  ConfirmationHeader,
  ConversationEmptyState,
  Message,
  MessageContent,
  MessageParts,
  Picker,
  PickerOption,
  PickerSection,
  PromptInput,
  PromptInputAction,
  PromptInputActions,
  PromptInputTextarea,
  PromptInputToolbar,
  PromptInputToolbarItem,
  Question,
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
  const listRef = useRef<FlashListRef<(typeof messages)[number]>>(null);
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

  const handleSend = async (text: string) => {
    await sendMessage(
      text,
      activeModel ?? undefined,
      activeAgent,
      selectedVariant ?? undefined,
    );
    setTimeout(() => {
      listRef.current?.scrollToEnd({ animated: true });
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
              <FlashList
                ref={listRef}
                data={messages.filter((msg) => msg.info?.role)}
                keyExtractor={(item) => item.info.id}
                renderItem={({ item }) => (
                  <Message from={item.info.role}>
                    <MessageContent>
                      <MessageParts parts={item.parts} />
                    </MessageContent>
                  </Message>
                )}
                contentContainerStyle={{ paddingVertical: 16 }}
                showsVerticalScrollIndicator={false}
                onContentSizeChange={() => {
                  const count = messages.length;
                  if (count !== prevMessageCount.current) {
                    prevMessageCount.current = count;
                    listRef.current?.scrollToEnd({ animated: false });
                  }
                }}
                ListEmptyComponent={
                  <ConversationEmptyState projectInfo={projectInfo} />
                }
                ListFooterComponent={
                  <>
                    {pendingPermission && (
                      <Confirmation permission={pendingPermission}>
                        <ConfirmationHeader />
                        <ConfirmationContent />
                        <ConfirmationActions>
                          <ConfirmationAction
                            label="Deny"
                            variant="outline"
                            onPress={() =>
                              replyPermission(pendingPermission.id, "reject")
                            }
                          />
                          <ConfirmationAction
                            label="Always"
                            variant="secondary"
                            onPress={() =>
                              replyPermission(pendingPermission.id, "always")
                            }
                          />
                          <ConfirmationAction
                            label="Allow"
                            variant="primary"
                            onPress={() =>
                              replyPermission(pendingPermission.id, "once")
                            }
                          />
                        </ConfirmationActions>
                      </Confirmation>
                    )}

                    {pendingQuestion && (
                      <Question
                        question={pendingQuestion}
                        onSubmit={(answers) =>
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
                  </>
                }
              />
            )}

            {/* Input area */}
            <View
              className="px-3 pt-2 mb-0"
              style={{ paddingBottom: Math.max(insets.bottom, 18) }}
            >
              <PromptInput
                className="bg-surface rounded-4xl border border-border z-50"
                value={inputText}
                onValueChange={setInputText}
                onSubmit={handleSend}
                isBusy={isBusy}
              >
                <PromptInputTextarea />
                <PromptInputActions>
                  <PromptInputAction type="attach" />
                  <PromptInputAction type="send" />
                </PromptInputActions>
              </PromptInput>
              <PromptInputToolbar>
                <PromptInputToolbarItem
                  label={activeAgent === "plan" ? "Plan" : "Build"}
                  onPress={() => setAgentPickerVisible(true)}
                />
                <PromptInputToolbarItem
                  label={activeModelLabel}
                  icon="flash"
                  onPress={() => setModelPickerVisible(true)}
                />
                <PromptInputToolbarItem
                  label={activeEffortLabel}
                  icon="speedometer-outline"
                  onPress={() => setEffortPickerVisible(true)}
                  hasChevron={activeVariants.length > 0}
                  disabled={activeVariants.length === 0}
                />
              </PromptInputToolbar>
            </View>
          </>
        )}
      </View>

      {/* Model picker */}
      <Picker
        visible={modelPickerVisible}
        title="Select Model"
        onClose={() => setModelPickerVisible(false)}
      >
        {providers.map((provider) => (
          <View key={provider.id}>
            <PickerSection title={provider.name} />
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
      </Picker>

      {/* Agent picker */}
      <Picker
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
      </Picker>

      {/* Effort picker */}
      <Picker
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
      </Picker>
    </KeyboardAvoidingView>
  );
}
