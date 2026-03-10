declare module "whisper.rn" {
  export interface TranscribeResult {
    result: string;
    language: string;
    segments: { text: string; t0: number; t1: number }[];
    isAborted: boolean;
  }

  export interface TranscribeOptions {
    language?: string;
    temperature?: number;
    beamSize?: number;
    bestOf?: number;
  }

  export interface VadOptions {
    threshold?: number;
    minSpeechDurationMs?: number;
    minSilenceDurationMs?: number;
    maxSpeechDurationS?: number;
    speechPadMs?: number;
    samplesOverlap?: number;
  }

  export function initWhisper(options: Record<string, unknown>): Promise<{
    transcribeRealtime: (options?: Record<string, unknown>) => Promise<{
      stop: () => Promise<void>;
      subscribe: (callback: (event: any) => void) => void;
    }>;
    release: () => Promise<void>;
    transcribeData: (
      data: ArrayBuffer,
      options?: TranscribeOptions,
    ) => { stop: () => Promise<void>; promise: Promise<TranscribeResult> };
  }>;

  export function initWhisperVad(options: {
    filePath: string | number;
    isBundleAsset?: boolean;
    useGpu?: boolean;
    nThreads?: number;
  }): Promise<{
    detectSpeechData: (
      data: ArrayBuffer,
      options?: VadOptions,
    ) => Promise<{ t0: number; t1: number }[]>;
    release: () => Promise<void>;
  }>;

  export function releaseAllWhisper(): Promise<void>;
  export function releaseAllWhisperVad(): Promise<void>;
}

declare module "whisper.rn/realtime-transcription" {
  import type { TranscribeOptions, VadOptions } from "whisper.rn";

  export interface RealtimeTranscribeEvent {
    type: "start" | "transcribe" | "end" | "error";
    sliceIndex: number;
    data?: { result?: string };
    isCapturing: boolean;
    processTime: number;
    recordingTime: number;
  }

  export interface RealtimeVadEvent {
    type: "speech_start" | "speech_end" | "speech_continue" | "silence";
    timestamp: number;
    confidence: number;
    duration: number;
    sliceIndex: number;
  }

  export interface RealtimeTranscriberCallbacks {
    onTranscribe?: (event: RealtimeTranscribeEvent) => void;
    onVad?: (event: RealtimeVadEvent) => void;
    onError?: (error: string) => void;
    onStatusChange?: (isActive: boolean) => void;
  }

  export interface RealtimeOptions {
    audioSliceSec?: number;
    audioMinSec?: number;
    maxSlicesInMemory?: number;
    vadOptions?: VadOptions;
    vadPreset?: string;
    autoSliceOnSpeechEnd?: boolean;
    autoSliceThreshold?: number;
    vadThrottleMs?: number;
    vadSkipRatio?: number;
    transcribeOptions?: TranscribeOptions;
    initialPrompt?: string;
    promptPreviousSlices?: boolean;
    audioOutputPath?: string;
    logger?: (message: string) => void;
  }

  export class RealtimeTranscriber {
    constructor(
      dependencies: {
        whisperContext: {
          transcribeData: (
            data: ArrayBuffer,
            options?: TranscribeOptions,
          ) => { stop: () => Promise<void>; promise: Promise<{ result: string }> };
        };
        vadContext?: {
          detectSpeechData: (
            data: ArrayBuffer,
            options?: VadOptions,
          ) => Promise<{ t0: number; t1: number }[]>;
        };
        audioStream: {
          initialize: (config: Record<string, unknown>) => Promise<void>;
          start: () => Promise<void>;
          stop: () => Promise<void>;
          isRecording: () => boolean;
          onData: (callback: (data: unknown) => void) => void;
          onError: (callback: (error: string) => void) => void;
          onStatusChange: (callback: (isRecording: boolean) => void) => void;
          release: () => Promise<void>;
        };
        fs?: unknown;
      },
      options?: RealtimeOptions,
      callbacks?: RealtimeTranscriberCallbacks,
    );
    start(): Promise<void>;
    stop(): Promise<void>;
    release(): Promise<void>;
    updateCallbacks(callbacks: Partial<RealtimeTranscriberCallbacks>): void;
    updateVadOptions(options: Partial<VadOptions>): void;
  }
}

declare module "whisper.rn/realtime-transcription/adapters/AudioPcmStreamAdapter" {
  export class AudioPcmStreamAdapter {
    initialize(config: Record<string, unknown>): Promise<void>;
    start(): Promise<void>;
    stop(): Promise<void>;
    isRecording(): boolean;
    onData(callback: (data: unknown) => void): void;
    onError(callback: (error: string) => void): void;
    onStatusChange(callback: (isRecording: boolean) => void): void;
    release(): Promise<void>;
  }
}

declare module "whisper.rn/src/realtime-transcription" {
  export * from "whisper.rn/realtime-transcription";
}

declare module "whisper.rn/src/realtime-transcription/adapters/AudioPcmStreamAdapter" {
  export * from "whisper.rn/realtime-transcription/adapters/AudioPcmStreamAdapter";
}

