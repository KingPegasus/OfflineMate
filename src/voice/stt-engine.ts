import { Platform, PermissionsAndroid, NativeModules } from "react-native";
import * as FileSystem from "expo-file-system/legacy";
import {
  initWhisper,
  initWhisperVad,
  releaseAllWhisper,
  releaseAllWhisperVad,
} from "whisper.rn";
import {
  RealtimeTranscriber,
  type RealtimeTranscribeEvent,
} from "whisper.rn/src/realtime-transcription";
import { mergeTranscript, normalizeSttResult } from "@/voice/stt-transcript-utils";

export type STTSize = "tiny" | "base";

const STT_MODEL_PATHS: Record<STTSize, string> = {
  tiny: `${FileSystem.documentDirectory}models/whisper-tiny.en.bin`,
  base: `${FileSystem.documentDirectory}models/whisper-base.en.bin`,
};
const VAD_MODEL_PATH = `${FileSystem.documentDirectory}models/ggml-silero-v6.2.0.bin`;

async function modelExists(path: string) {
  const info = await FileSystem.getInfoAsync(path);
  return info.exists;
}

async function resolveModelPath(preferred: STTSize): Promise<{ modelSize: STTSize; filePath: string }> {
  const preferredPath = STT_MODEL_PATHS[preferred];
  const preferredExists = await modelExists(preferredPath);

  // Accuracy-first: if base exists, prefer it even when tiny was requested.
  // tiny remains fallback for low-end devices or when base is not downloaded.
  const basePath = STT_MODEL_PATHS.base;
  const baseExists = await modelExists(basePath);
  if (baseExists) {
    return { modelSize: "base", filePath: basePath };
  }
  if (preferredExists) {
    return { modelSize: preferred, filePath: preferredPath };
  }
  return { modelSize: preferred, filePath: preferredPath };
}

async function requestMicrophonePermission(): Promise<boolean> {
  if (Platform.OS !== "android") return true;
  try {
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
      {
        title: "Microphone for voice input",
        message: "OfflineMate needs microphone access to transcribe your speech.",
        buttonNeutral: "Ask Later",
        buttonNegative: "Deny",
        buttonPositive: "OK",
      },
    );
    const isGranted = granted === PermissionsAndroid.RESULTS.GRANTED;
    console.log("[OfflineMate] STT: RECORD_AUDIO permission:", granted, "granted:", isGranted);
    return isGranted;
  } catch (e) {
    console.warn("[OfflineMate] STT: permission request failed", e);
    return false;
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function logSttQualityHints(transcript: string, elapsedMs: number) {
  const lowered = transcript.toLowerCase();
  const looksLikeReminder = /\b(remind|reminder|set reminder)\b/.test(lowered);
  const hasDuration = /\b(in|after)\s+\d+\s*(min|mins|minute|minutes|hour|hours|sec|second|seconds)\b/.test(
    lowered,
  );
  console.log("[OfflineMate] STT metrics:", {
    elapsedMs,
    length: transcript.length,
    words: transcript.split(/\s+/).filter(Boolean).length,
    looksLikeReminder,
    hasDuration,
  });
}

function ensureLiveAudioStreamEmitterCompat() {
  const modules = NativeModules as {
    RNLiveAudioStream?: {
      addListener?: (eventName: string) => void;
      removeListeners?: (count: number) => void;
    };
  };
  const streamModule = modules.RNLiveAudioStream;
  if (!streamModule) return;
  if (typeof streamModule.addListener !== "function") {
    streamModule.addListener = () => {};
  }
  if (typeof streamModule.removeListeners !== "function") {
    streamModule.removeListeners = () => {};
  }
}

/**
 * Create a listening session (model load, init). Call start() to begin capturing, stop() when done.
 * Pre-warm by calling this early; then start() is fast and captures from the beginning of press.
 */
export async function startListeningSession(
  modelSize: STTSize,
): Promise<{ start: () => Promise<void>; stop: () => Promise<string>; release: () => Promise<void> }> {
  const resolved = await resolveModelPath(modelSize);
  const effectiveModel = resolved.modelSize;
  const filePath = resolved.filePath;
  console.log(
    "[OfflineMate] STT: startListeningSession, requested model:",
    modelSize,
    "effective model:",
    effectiveModel,
  );
  const exists = await modelExists(filePath);
  if (!exists) {
    const msg = `STT model (${modelSize}) not downloaded yet.`;
    return {
      start: async () => {},
      stop: async () => msg,
      release: async () => {},
    };
  }

  const hasPermission = await requestMicrophonePermission();
  if (!hasPermission) {
    return {
      start: async () => {},
      stop: async () =>
        "Microphone permission is required for voice input. Please allow it in Settings.",
      release: async () => {},
    };
  }

  const useGpu = Platform.OS !== "android";
  const context = await initWhisper({ filePath, isBundleAsset: false, useGpu });

  const vadModelExists = await modelExists(VAD_MODEL_PATH);
  const vadContext = vadModelExists
    ? await initWhisperVad({
        filePath: VAD_MODEL_PATH,
        isBundleAsset: false,
        useGpu: Platform.OS === "ios",
        nThreads: Platform.OS === "ios" ? 2 : 4,
      }).catch((error) => {
        console.warn("[OfflineMate] STT: initWhisperVad failed, continuing without VAD:", error);
        return null;
      })
    : null;
  if (!vadModelExists) {
    console.warn(
      "[OfflineMate] STT: VAD model missing, continuing without VAD. Download model assets from onboarding.",
    );
  }

  ensureLiveAudioStreamEmitterCompat();
  const { AudioPcmStreamAdapter } = await import(
    "whisper.rn/src/realtime-transcription/adapters/AudioPcmStreamAdapter"
  );
  const audioStream = new AudioPcmStreamAdapter();
  let transcriber: RealtimeTranscriber;
  try {
    transcriber = new RealtimeTranscriber(
      {
        whisperContext: context,
        vadContext: vadContext ?? undefined,
        audioStream,
      },
      {
        audioSliceSec: 8,
        audioMinSec: 0.35,
        maxSlicesInMemory: 6,
        vadPreset: vadContext ? "default" : undefined,
        vadOptions: vadContext ? { speechPadMs: 280 } : undefined,
        autoSliceOnSpeechEnd: !!vadContext,
        autoSliceThreshold: 300,
        transcribeOptions: {
          language: "en",
          temperature: 0,
          bestOf: 3,
          beamSize: 3,
        },
      },
    );
  } catch (e) {
    console.warn("[OfflineMate] STT: RealtimeTranscriber init failed", e);
    await audioStream.release().catch((releaseError) => {
      console.warn("[OfflineMate] STT: audioStream.release error (init path)", releaseError);
    });
    await context.release();
    await releaseAllWhisper();
    if (vadContext) {
      await vadContext.release().catch(() => {});
      await releaseAllWhisperVad().catch(() => {});
    }
    return {
      start: async () => {},
      stop: async () => "STT failed to start.",
      release: async () => {},
    };
  }

  let transcript = "";
  let lastUpdateAt = Date.now();
  let finalSeen = false;
  const startAt = Date.now();
  let resolveFinal: (value: void) => void;
  const finalPromise = new Promise<string>((resolve) => {
    resolveFinal = () => resolve("");
  });

  transcriber.updateCallbacks({
    onTranscribe: (event: RealtimeTranscribeEvent) => {
      const text = event.data?.result ?? "";
      if (text) {
        const merged = mergeTranscript(transcript, text);
        if (merged !== transcript) {
          transcript = merged;
          lastUpdateAt = Date.now();
          console.log("[OfflineMate] STT: merged transcript:", transcript.slice(0, 80));
        }
      }
      if ((event.type === "end" || event.isCapturing === false) && !finalSeen) {
        finalSeen = true;
        resolveFinal();
      }
    },
    onError: (error) => {
      console.warn("[OfflineMate] STT: transcriber callback error", error);
    },
    onStatusChange: (isActive) => {
      console.log("[OfflineMate] STT: transcriber status:", isActive ? "ACTIVE" : "INACTIVE");
    },
  });

  async function doRelease() {
    try {
      await transcriber.release();
    } catch (e) {
      console.warn("[OfflineMate] STT: transcriber.release error", e);
    }
    try {
      await context.release();
      await releaseAllWhisper();
    } catch (e) {
      console.warn("[OfflineMate] STT: release error", e);
    }
    if (vadContext) {
      try {
        await vadContext.release();
        await releaseAllWhisperVad();
      } catch (e) {
        console.warn("[OfflineMate] STT: releaseAllWhisperVad error", e);
      }
    }
  }

  return {
    start: async (): Promise<void> => {
      try {
        await transcriber.start();
      } catch (error) {
        console.warn("[OfflineMate] STT: transcriber.start failed", error);
        await doRelease();
        throw error;
      }
    },
    stop: async (): Promise<string> => {
      // Keep capturing a bit longer so the end of the utterance isn't cut off.
      await sleep(450);
      try {
        await transcriber.stop();
      } catch (e) {
        console.warn("[OfflineMate] STT: transcriber.stop error", e);
      }
      await Promise.race([
        finalPromise,
        new Promise<string>((resolve) => setTimeout(() => resolve(""), 2500)),
      ]);
      // Wait for a quiet period after stop/final so tail tokens can land.
      const settleStart = Date.now();
      while (Date.now() - settleStart < 2500) {
        const quietMs = Date.now() - lastUpdateAt;
        if ((finalSeen && quietMs >= 450) || quietMs >= 900) break;
        await sleep(100);
      }
      await doRelease();
      const normalized = normalizeSttResult(transcript);
      logSttQualityHints(normalized, Date.now() - startAt);
      console.log("[OfflineMate] STT: done, result:", normalized.slice(0, 80));
      return normalized;
    },
    release: doRelease,
  };
}

/** One-shot: listen for a fixed duration (legacy). Prefer startListeningSession + press-and-hold. */
export async function transcribeFromMicrophone(modelSize: STTSize) {
  const handle = await startListeningSession(modelSize);
  await handle.start();
  await new Promise((resolve) => setTimeout(resolve, 6000));
  return handle.stop();
}

