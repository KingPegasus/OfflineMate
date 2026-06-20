import { Platform, PermissionsAndroid, NativeModules } from "react-native";
import * as FileSystem from "expo-file-system/legacy";
import { initWhisper, releaseAllWhisper, type TranscribeOptions } from "whisper.rn";
import { normalizeSttResult } from "@/voice/stt-transcript-utils";

export type STTSize = "tiny" | "base";

const STT_MODEL_PATHS: Record<STTSize, string> = {
  tiny: `${FileSystem.documentDirectory}models/whisper-tiny.en.bin`,
  base: `${FileSystem.documentDirectory}models/whisper-base.en.bin`,
};

// 16 kHz, mono, 16-bit PCM is what whisper.cpp expects.
const SAMPLE_RATE = 16000;
const CHANNELS = 1;
const BITS_PER_SAMPLE = 16;
// Android AudioSource: 6 = VOICE_RECOGNITION (tuned for ASR; avoids aggressive AGC/voice-comms processing).
const ANDROID_AUDIO_SOURCE_VOICE_RECOGNITION = 6;

async function modelExists(path: string) {
  const info = await FileSystem.getInfoAsync(path);
  return info.exists;
}

async function resolveModelPath(preferred: STTSize): Promise<{ modelSize: STTSize; filePath: string }> {
  const preferredPath = STT_MODEL_PATHS[preferred];
  const preferredExists = await modelExists(preferredPath);

  // Accuracy-first: if base exists, prefer it even when tiny was requested.
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

function logSttQualityHints(transcript: string, elapsedMs: number, audioMs: number) {
  const lowered = transcript.toLowerCase();
  const looksLikeReminder = /\b(remind|reminder|set reminder)\b/.test(lowered);
  const hasDuration = /\b(in|after)\s+\d+\s*(min|mins|minute|minutes|hour|hours|sec|second|seconds)\b/.test(
    lowered,
  );
  console.log("[OfflineMate] STT metrics:", {
    elapsedMs,
    audioMs,
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

type AudioStreamData = { data: Uint8Array };

function concatChunks(chunks: Uint8Array[], totalBytes: number): Uint8Array {
  const merged = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.length;
  }
  return merged;
}

/**
 * Create a listening session. Loading the model (initWhisper) is the slow part, so pre-warm by
 * calling this early; start() then just opens the microphone stream.
 *
 * Capture strategy: we record the ENTIRE utterance as raw PCM and run a single whisper transcription
 * on the full buffer at stop(). Whisper is far more accurate on a complete utterance than on the
 * short VAD-cut slices produced by realtime streaming, which is critical for short voice commands.
 */
export async function startListeningSession(
  modelSize: STTSize,
): Promise<{ start: () => Promise<void>; stop: () => Promise<string>; release: () => Promise<void> }> {
  const resolved = await resolveModelPath(modelSize);
  const filePath = resolved.filePath;
  console.log(
    "[OfflineMate] STT: startListeningSession, requested model:",
    modelSize,
    "effective model:",
    resolved.modelSize,
  );
  const exists = await modelExists(filePath);
  if (!exists) {
    const msg = `STT model (${modelSize}) not downloaded yet.`;
    return { start: async () => {}, stop: async () => msg, release: async () => {} };
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

  ensureLiveAudioStreamEmitterCompat();
  const { AudioPcmStreamAdapter } = await import(
    "whisper.rn/src/realtime-transcription/adapters/AudioPcmStreamAdapter"
  );
  const audioStream = new AudioPcmStreamAdapter();

  let chunks: Uint8Array[] = [];
  let totalBytes = 0;
  let capturing = false;
  let startAt = 0;

  audioStream.onData((raw: unknown) => {
    if (!capturing) return;
    const data = (raw as AudioStreamData)?.data;
    if (data && data.length > 0) {
      chunks.push(data);
      totalBytes += data.length;
    }
  });
  audioStream.onError((error: string) => {
    console.warn("[OfflineMate] STT: audio stream error", error);
  });

  async function doRelease() {
    try {
      if (audioStream.isRecording()) {
        await audioStream.stop();
      }
    } catch (e) {
      console.warn("[OfflineMate] STT: audioStream.stop error", e);
    }
    try {
      await audioStream.release();
    } catch (e) {
      console.warn("[OfflineMate] STT: audioStream.release error", e);
    }
    try {
      await context.release();
      await releaseAllWhisper();
    } catch (e) {
      console.warn("[OfflineMate] STT: release error", e);
    }
    chunks = [];
    totalBytes = 0;
  }

  return {
    start: async (): Promise<void> => {
      chunks = [];
      totalBytes = 0;
      try {
        await audioStream.initialize({
          sampleRate: SAMPLE_RATE,
          channels: CHANNELS,
          bitsPerSample: BITS_PER_SAMPLE,
          audioSource: ANDROID_AUDIO_SOURCE_VOICE_RECOGNITION,
          bufferSize: 16 * 1024,
        });
        capturing = true;
        startAt = Date.now();
        await audioStream.start();
      } catch (error) {
        capturing = false;
        console.warn("[OfflineMate] STT: audio start failed", error);
        await doRelease();
        throw error;
      }
    },
    stop: async (): Promise<string> => {
      capturing = false;
      try {
        if (audioStream.isRecording()) {
          await audioStream.stop();
        }
      } catch (e) {
        console.warn("[OfflineMate] STT: audioStream.stop error", e);
      }

      const audioMs = Math.round((totalBytes / (BITS_PER_SAMPLE / 8) / SAMPLE_RATE) * 1000);
      if (totalBytes === 0) {
        await doRelease();
        return normalizeSttResult("");
      }

      const pcm = concatChunks(chunks, totalBytes);
      const transcribeOptions: TranscribeOptions = {
        language: "en",
        temperature: 0,
        beamSize: 5,
        bestOf: 5,
      };

      let result = "";
      try {
        const request = context.transcribeData(pcm.buffer as ArrayBuffer, transcribeOptions);
        const transcribeResult = await request.promise;
        result = transcribeResult?.result ?? "";
      } catch (e) {
        console.warn("[OfflineMate] STT: transcribeData failed", e);
        await doRelease();
        return "STT failed.";
      }

      await doRelease();
      const normalized = normalizeSttResult(result);
      logSttQualityHints(normalized, Date.now() - startAt, audioMs);
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
