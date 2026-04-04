declare module "whisper.rn" {
  export interface TranscribeResult {
    result: string;
    segments: Array<{ text: string; t0: number; t1: number }>;
    isAborted: boolean;
  }

  export interface AudioSessionSettingIos {
    category: string;
    options?: string[];
    mode?: string;
    active?: boolean;
  }

  export interface TranscribeRealtimeOptions {
    language?: string;
    maxThreads?: number;
    realtimeAudioSec?: number;
    realtimeAudioSliceSec?: number;
    realtimeAudioMinSec?: number;
    audioOutputPath?: string;
    useVad?: boolean;
    vadMs?: number;
    vadThold?: number;
    vadFreqThold?: number;
    audioSessionOnStartIos?: AudioSessionSettingIos;
    audioSessionOnStopIos?: string | AudioSessionSettingIos;
  }

  export interface TranscribeRealtimeEvent {
    contextId: number;
    jobId: number;
    isCapturing: boolean;
    isStoppedByAction?: boolean;
    code: number;
    data?: TranscribeResult;
    error?: string;
    processTime: number;
    recordingTime: number;
    slices?: Array<{
      code: number;
      error?: string;
      data?: TranscribeResult;
      processTime: number;
      recordingTime: number;
    }>;
  }

  export interface ContextOptions {
    filePath: string | number;
    coreMLModelAsset?: {
      filename: string;
      assets: string[] | number[];
    };
    isBundleAsset?: boolean;
    useCoreMLIos?: boolean;
    useGpu?: boolean;
    useFlashAttn?: boolean;
  }

  export class WhisperContext {
    id: number;
    gpu: boolean;
    reasonNoGPU: string;
    transcribeRealtime(
      options?: TranscribeRealtimeOptions,
    ): Promise<{
      stop: () => Promise<void>;
      subscribe: (callback: (event: TranscribeRealtimeEvent) => void) => void;
    }>;
    release(): Promise<void>;
  }

  export function initWhisper(options: ContextOptions): Promise<WhisperContext>;
  export function releaseAllWhisper(): Promise<void>;
}
