import { Ionicons } from "@expo/vector-icons";
import { Redirect, router } from "expo-router";
import { Button, Input, Label, TextField } from "heroui-native";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  View,
} from "react-native";
import { withUniwind } from "uniwind";
import { Logo } from "@/components/logo";
import { Logomark } from "@/components/logomark";
import {
  addServer,
  getLastUsedServer,
  getServers,
  updateServerLastUsed,
} from "@/lib/servers";

const StyledIonicons = withUniwind(Ionicons);

export default function ConnectScreen() {
  if (getLastUsedServer()) {
    return <Redirect href="/(tabs)" />;
  }
  const [url, setUrl] = useState("");
  const [label, setLabel] = useState("");
  const [error, setError] = useState("");

  function handleConnect() {
    const trimmedUrl = url.trim();
    if (!trimmedUrl) {
      setError("Please enter a server URL");
      return;
    }

    // Basic URL validation
    try {
      new URL(trimmedUrl);
    } catch {
      setError("Please enter a valid URL (e.g. http://192.168.1.42:4096)");
      return;
    }

    setError("");

    // Check if server already exists
    const existing = getServers().find((s) => s.url === trimmedUrl);
    if (existing) {
      updateServerLastUsed(existing.id);
    } else {
      addServer(trimmedUrl, label.trim() || undefined);
    }

    router.replace("/(tabs)");
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1 bg-background"
    >
      <ScrollView
        contentContainerClassName="flex-1 justify-center px-6 pb-8"
        keyboardShouldPersistTaps="handled"
      >
        {/* Logo & Title */}
        <View className="items-center mb-10">
          {/* <Logomark size={48} /> */}
          <View className="mt-4">
            <Logo />
          </View>
          <Text className="text-muted text-base mt-5">
            Connect to your server
          </Text>
        </View>

        {/* Form */}
        <View className="gap-4 mb-6">
          <TextField isRequired isInvalid={!!error}>
            <Label>Server URL</Label>
            <Input
              placeholder="http://192.168.1.42:4096"
              value={url}
              variant="secondary"
              className="py-2.5 rounded-xl border border-border"
              onChangeText={(text) => {
                setUrl(text);
                if (error) setError("");
              }}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
            />
          </TextField>

          <TextField>
            <Label>Label (optional)</Label>
            <Input
              placeholder="e.g. Home machine"
              variant="secondary"
              className="py-2.5 rounded-xl border border-border"
              value={label}
              onChangeText={setLabel}
            />
          </TextField>

          {error ? <Text className="text-danger text-sm">{error}</Text> : null}
        </View>

        {/* Connect Button */}
        <Button variant="primary" size="md" onPress={handleConnect}>
          Connect
        </Button>

        {/* Divider */}
        <View className="flex-row items-center my-6">
          <View className="flex-1 h-px bg-border" />
          <Text className="text-muted text-sm mx-4">or</Text>
          <View className="flex-1 h-px bg-border" />
        </View>

        {/* Scan QR Button */}
        <Button variant="outline" size="md" onPress={() => {}}>
          <StyledIonicons
            name="qr-code-outline"
            size={18}
            className="text-foreground"
          />
          <Button.Label>Scan QR from terminal</Button.Label>
        </Button>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
