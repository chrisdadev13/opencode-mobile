import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Avatar } from "heroui-native";
import { useRef, useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Colors, Fonts } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

const MOCK_MESSAGES: Message[] = [
  {
    id: "1",
    role: "user",
    content: "Can you help me refactor the authentication module?",
  },
  {
    id: "2",
    role: "assistant",
    content:
      "Sure! I'll take a look at the auth module. Let me analyze the current structure first.\n\nThe main issues I see are:\n- The token refresh logic is duplicated across three files\n- Error handling is inconsistent\n- The session store mixes concerns\n\nI'd suggest extracting a shared `useAuth` hook that centralizes token management.",
  },
  {
    id: "3",
    role: "user",
    content: "That sounds good. Can you start with the token refresh logic?",
  },
  {
    id: "4",
    role: "assistant",
    content:
      "I've created a unified `refreshToken` function in `lib/auth.ts` that handles:\n\n```typescript\nexport async function refreshToken(token: string) {\n  const response = await fetch('/api/auth/refresh', {\n    method: 'POST',\n    headers: { Authorization: `Bearer ${token}` },\n  });\n  return response.json();\n}\n```\n\nThis replaces the three separate implementations. Want me to update the components that were using the old approach?",
  },
  {
    id: "5",
    role: "user",
    content: "Yes, please update them all.",
  },
];

export default function ChatScreen() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];
  const router = useRouter();
  const scrollViewRef = useRef<ScrollView>(null);

  const [messages, setMessages] = useState<Message[]>(MOCK_MESSAGES);
  const [inputText, setInputText] = useState("");
  const [recording, setRecording] = useState(false);

  const handleSend = () => {
    if (!inputText.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: inputText.trim(),
    };

    const assistantMessage: Message = {
      id: (Date.now() + 1).toString(),
      role: "assistant",
      content:
        "I'll look into that for you. Give me a moment to analyze the codebase and come up with the best approach.",
    };

    setMessages((prev) => [...prev, userMessage, assistantMessage]);
    setInputText("");

    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  return (
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
      {/* Header */}
      <View
        className="flex-row items-center px-4 py-3 border-b border-border"
        style={{ gap: 12 }}
      >
        <View className="flex-1">
          <Text
            className="text-foreground text-base"
            style={{ fontFamily: Fonts.sans, fontWeight: "600" }}
          >
            Assistant
          </Text>
          <Text
            className="text-muted text-xs"
            style={{ fontFamily: Fonts.mono }}
          >
            ~/Developer/fyner
          </Text>
        </View>
        <Pressable hitSlop={8}>
          <Ionicons name="ellipsis-vertical" size={20} color={colors.muted} />
        </Pressable>
      </View>

      {/* Messages */}
      <View className="flex-1">
        <ScrollView
          ref={scrollViewRef}
          className="flex-1"
          contentContainerClassName="py-4"
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() =>
            scrollViewRef.current?.scrollToEnd({ animated: false })
          }
        >
          {messages.map((message) => (
            <MessageBubble key={message.id} message={message} colors={colors} />
          ))}
        </ScrollView>

        {/* Input area */}
        <View
          className="px-3 pt-2 mb-2"
          style={{
            paddingBottom: Math.max(insets.bottom, 18),
          }}
        >
          {/* Input card */}
          <View className="bg-surface rounded-4xl border border-[#C1C0C0] z-50">
            {/* Text input */}
            <TextInput
              placeholder="Ask anything..."
              placeholderTextColor={colors.muted}
              value={inputText}
              onChangeText={setInputText}
              multiline
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
            {/* Send / Mic button — absolute bottom-right */}
            {inputText.trim() ? (
              <Pressable
                onPress={handleSend}
                style={{
                  position: "absolute",
                  bottom: 8,
                  right: 8,
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: colors.accent,
                }}
              >
                <Ionicons name="arrow-up" size={18} color={colors.background} />
              </Pressable>
            ) : (
              <Pressable
                onPress={() => setRecording(!recording)}
                style={{
                  position: "absolute",
                  bottom: 8,
                  right: 8,
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: recording ? "#ef4444" : "transparent",
                }}
              >
                <Ionicons
                  name="mic"
                  size={18}
                  color={recording ? "#ffffff" : colors.muted}
                />
              </Pressable>
            )}
          </View>

          {/* Toolbar tray */}
          <View
            className="flex-row items-center px-1 pb-2 bg-[#F8F8F8] rounded-b-2xl border-x border-b border-[#DBDBDB] -mt-3 z-0"
            style={{ gap: 6, paddingTop: 18 }}
          >
            <Pressable
              className="flex-row items-center rounded-md"
              style={{ height: 28, paddingHorizontal: 8, gap: 4 }}
            >
              <Text
                className="text-muted"
                style={{ fontFamily: Fonts.sans, fontSize: 13 }}
              >
                Build
              </Text>
              <Ionicons name="chevron-down" size={11} color={colors.muted} />
            </Pressable>
            <Pressable
              className="flex-row items-center rounded-md"
              style={{ height: 28, paddingHorizontal: 4, gap: 4 }}
            >
              <Ionicons name="flash" size={13} color={colors.muted} />
              <Text
                className="text-muted"
                style={{ fontFamily: Fonts.sans, fontSize: 13 }}
              >
                Claude Sonnet
              </Text>
              <Ionicons name="chevron-down" size={11} color={colors.muted} />
            </Pressable>
            <Pressable
              className="flex-row items-center rounded-md"
              style={{ height: 28, paddingHorizontal: 8, gap: 4 }}
            >
              <Text
                className="text-muted"
                style={{ fontFamily: Fonts.sans, fontSize: 13 }}
              >
                Default
              </Text>
              <Ionicons name="chevron-down" size={11} color={colors.muted} />
            </Pressable>
          </View>
        </View>
      </View>
    </View>
  );
}

function MessageBubble({
  message,
  colors,
}: {
  message: Message;
  colors: (typeof Colors)["light"];
}) {
  const isUser = message.role === "user";

  return (
    <View className={`px-4 mb-6 ${isUser ? "items-end" : "items-start"}`}>
      <View
        className="flex-row items-start"
        style={{ gap: 8, maxWidth: "85%" }}
      >
        <View
          className={`flex-1 rounded-xl px-3 py-2 ${
            isUser
              ? "bg-accent-foreground border border-[#DBDBDB]"
              : "bg-transparent"
          }`}
        >
          <Text
            className={`text-sm ${
              isUser ? "text-foreground" : "text-foreground"
            }`}
            style={{ fontFamily: Fonts.sans, lineHeight: 20 }}
          >
            {message.content}
          </Text>
        </View>
      </View>
    </View>
  );
}
