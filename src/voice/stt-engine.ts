import { Platform, PermissionsAndroid } from "react-native";
import * as FileSystem from "expo-file-system/legacy";
import { initWhisper, releaseAllWhisper } from "whisper.rn";

export type STTSize = "tiny" | "base";

const STT_MODEL_PATHS: Record<STTSize, string> = {
  tiny: `${FileSystem.documentDirectory}models/whisper-tiny.en.bin`,
  base: `${FileSystem.documentDirectory}models/whisper-base.en.bin`,
};

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

function normalizeResult(transcript: string): string {
  let result = transcript.trim() || "No speech captured.";
  if (result === "[BLANK_AUDIO]" || /^\s*\[BLANK_AUDIO\]\s*$/i.test(result)) {
    result = "No speech detected.";
  }
  return result;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Realtime events are not always monotonic (a later event can be shorter than a previous one).
 * Keep the best transcript by preferring expansions and ignoring regressions.
 */
function mergeTranscript(current: string, incoming: string): string {
  const next = incoming.replace(/\s+/g, " ").trim();
  const prev = current.replace(/\s+/g, " ").trim();
  if (!next) return prev;
  if (!prev) return next;
  if (next === prev) return prev;
  if (next.includes(prev)) return next; // expansion
  if (prev.includes(next)) return prev; // regression

  // Try overlap join: "set reminder in 5" + "5 minutes to sleep"
  const maxOverlap = Math.min(prev.length, next.length, 32);
  for (let n = maxOverlap; n >= 4; n -= 1) {
    if (prev.slice(-n).toLowerCase() === next.slice(0, n).toLowerCase()) {
      return `${prev}${next.slice(n)}`.trim();
    }
  }

  // If they are unrelated fragments, keep the longer one.
  return next.length >= prev.length ? next : prev;
}

/**
 * Start a listening session: press-and-hold to record, then call stop() when the user releases.
 * Returns a handle with stop() that stops recording and resolves with the transcript.
 */
export async function startListeningSession(
  modelSize: STTSize,
): Promise<{ stop: () => Promise<string> }> {
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
    return { stop: async () => msg };
  }

  const hasPermission = await requestMicrophonePermission();
  if (!hasPermission) {
    return {
      stop: async () =>
        "Microphone permission is required for voice input. Please allow it in Settings.",
    };
  }

  const useGpu = Platform.OS !== "android";
  const context = await initWhisper({
    filePath,
    isBundleAsset: false,
    useGpu,
  });

  let session: { stop: () => Promise<void>; subscribe: (cb: (evt: unknown) => void) => void };
  try {
    session = await context.transcribeRealtime({
      language: "en",
      // Accuracy-focused decode settings for short voice commands.
      temperature: 0,
      bestOf: 3,
      beamSize: 3,
      realtimeAudioSec: 90,
      realtimeAudioSliceSec: 8,
      realtimeAudioMinSec: 1,
    });
  } catch (e) {
    console.warn("[OfflineMate] STT: transcribeRealtime failed", e);
    await context.release();
    await releaseAllWhisper();
    return { stop: async () => "STT failed to start." };
  }

  let transcript = "";
  let lastUpdateAt = Date.now();
  let finalSeen = false;
  let resolveFinal: (value: void) => void;
  const finalPromise = new Promise<string>((resolve) => {
    resolveFinal = () => resolve("");
  });

  session.subscribe((event: unknown) => {
    const ev = event as { isCapturing?: boolean; data?: { result?: string }; error?: string };
    const text = ev.data?.result ?? "";
    if (text) {
      const merged = mergeTranscript(transcript, text);
      if (merged !== transcript) {
        transcript = merged;
        lastUpdateAt = Date.now();
        console.log("[OfflineMate] STT: merged transcript:", transcript.slice(0, 80));
      }
    }
    if (ev.error) console.warn("[OfflineMate] STT: event error", ev.error);
    if (ev.isCapturing === false && !finalSeen) {
      finalSeen = true;
      resolveFinal();
    }
  });

  return {
    stop: async (): Promise<string> => {
      try {
        await session.stop();
      } catch (e) {
        console.warn("[OfflineMate] STT: session.stop error", e);
      }
      await Promise.race([
        finalPromise,
        new Promise<string>((resolve) => setTimeout(() => resolve(""), 2500)),
      ]);
      // Wait for a quiet period after stop/final so tail tokens can land.
      const settleStart = Date.now();
      while (Date.now() - settleStart < 2000) {
        const quietMs = Date.now() - lastUpdateAt;
        if ((finalSeen && quietMs >= 300) || quietMs >= 800) break;
        await sleep(120);
      }
      try {
        await context.release();
        await releaseAllWhisper();
      } catch (e) {
        console.warn("[OfflineMate] STT: release error", e);
      }
      const normalized = normalizeResult(transcript);
      console.log("[OfflineMate] STT: done, result:", normalized.slice(0, 80));
      return normalized;
    },
  };
}

/** One-shot: listen for a fixed duration (legacy). Prefer startListeningSession + press-and-hold. */
export async function transcribeFromMicrophone(modelSize: STTSize) {
  const handle = await startListeningSession(modelSize);
  await new Promise((resolve) => setTimeout(resolve, 6000));
  return handle.stop();
}

