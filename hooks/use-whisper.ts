import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, PermissionsAndroid, Platform } from "react-native";
import { File, Paths } from "expo-file-system";
import type { WhisperContext, TranscribeRealtimeEvent } from "whisper.rn";

async function requestMicPermission(): Promise<boolean> {
  if (Platform.OS === "android") {
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
      {
        title: "Microphone Permission",
        message: "This app needs microphone access to transcribe speech.",
        buttonPositive: "Allow",
      },
    );
    return granted === PermissionsAndroid.RESULTS.GRANTED;
  }
  return true;
}

const MODEL_URL =
  "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-tiny.en.bin";
const MODEL_FILENAME = "ggml-tiny.en.bin";

// Filter out Whisper noise/silence markers
function cleanTranscription(raw: string): string {
  return raw
    .replace(/\[.*?\]/g, "")     // [BLANK_AUDIO], [silence], etc.
    .replace(/\(.*?\)/g, "")     // (buzzing), (silence), (music), etc.
    .trim();
}

function loadWhisperModule() {
  try {
    return require("whisper.rn") as typeof import("whisper.rn");
  } catch {
    throw new Error(
      "whisper.rn native module not found. Run `npx expo prebuild` then `npx expo run:ios` (or run:android) to build a development client.",
    );
  }
}

type WhisperState =
  | { status: "idle" }
  | { status: "downloading"; progress: number }
  | { status: "initializing" }
  | { status: "ready" }
  | { status: "recording"; transcription: string }
  | { status: "error"; message: string };

export function useWhisper() {
  const [state, setState] = useState<WhisperState>({ status: "idle" });
  const contextRef = useRef<WhisperContext | null>(null);
  const stopRef = useRef<(() => Promise<void>) | null>(null);
  const transcriptRef = useRef("");
  const isRecordingRef = useRef(false);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopRef.current?.();
      contextRef.current?.release();
    };
  }, []);

  const ensureModel = useCallback(async (): Promise<string> => {
    const modelFile = new File(Paths.document, MODEL_FILENAME);
    if (modelFile.exists) return modelFile.uri;

    setState({ status: "downloading", progress: 0 });

    const downloadedFile = await File.downloadFileAsync(MODEL_URL, modelFile);

    setState({ status: "downloading", progress: 100 });
    return downloadedFile.uri;
  }, []);

  const ensureContext = useCallback(async (): Promise<WhisperContext> => {
    if (contextRef.current) return contextRef.current;

    const modelUri = await ensureModel();
    setState({ status: "initializing" });

    const whisper = loadWhisperModule();
    const ctx = await whisper.initWhisper({
      filePath: modelUri,
      useGpu: Platform.OS === "ios",
    });

    contextRef.current = ctx;
    setState({ status: "ready" });
    return ctx;
  }, [ensureModel]);

  const startRecording = useCallback(async (): Promise<void> => {
    try {
      const hasPermission = await requestMicPermission();
      if (!hasPermission) {
        Alert.alert("Permission Denied", "Microphone access is required for speech-to-text.");
        return;
      }

      const ctx = await ensureContext();

      transcriptRef.current = "";
      isRecordingRef.current = true;
      setState({ status: "recording", transcription: "" });

      const { stop, subscribe } = await ctx.transcribeRealtime({
        language: "en",
        maxThreads: Platform.OS === "ios" ? 4 : 2,
        audioSessionOnStartIos: {
          category: "PlayAndRecord",
          options: ["MixWithOthers"],
          mode: "Default",
        },
        audioSessionOnStopIos: "Ambient",
      });

      stopRef.current = stop;

      subscribe((evt: TranscribeRealtimeEvent) => {
        const { isCapturing, data } = evt;
        if (data?.result) {
          const text = cleanTranscription(data.result);
          if (text) {
            transcriptRef.current = text;
            setState({ status: "recording", transcription: text });
          }
        }
        if (!isCapturing) {
          isRecordingRef.current = false;
          stopRef.current = null;
          setState({ status: "ready" });
        }
      });
    } catch (err: any) {
      isRecordingRef.current = false;
      stopRef.current = null;
      const message = err?.message ?? "Failed to start recording";
      setState({ status: "error", message });
      Alert.alert("Speech-to-Text Error", message);
    }
  }, [ensureContext]);

  const stopRecording = useCallback(async (): Promise<string> => {
    if (stopRef.current) {
      try {
        await stopRef.current();
      } catch {
        // ignore stop errors
      }
      stopRef.current = null;
    }
    isRecordingRef.current = false;
    const text = transcriptRef.current;
    transcriptRef.current = "";
    setState({ status: "ready" });
    return text;
  }, []);

  const toggleRecording = useCallback(async (): Promise<string | null> => {
    if (isRecordingRef.current) {
      return stopRecording();
    }
    await startRecording();
    return null;
  }, [startRecording, stopRecording]);

  const isRecording = state.status === "recording";
  const isLoading =
    state.status === "downloading" || state.status === "initializing";
  const downloadProgress =
    state.status === "downloading" ? state.progress : null;
  const transcription =
    state.status === "recording" ? state.transcription : "";

  return {
    state,
    isRecording,
    isLoading,
    downloadProgress,
    transcription,
    toggleRecording,
    stopRecording,
  };
}
