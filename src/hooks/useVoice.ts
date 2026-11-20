import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AppState } from "react-native";
import { downloadTierVoiceModel } from "@/ai/model-manager";
import { startListeningSession, transcribeFromMicrophone } from "@/voice/stt-engine";
import { speak } from "@/voice/tts-engine";
import { useSettingsStore } from "@/stores/settings-store";

type SessionHandle = Awaited<ReturnType<typeof startListeningSession>>;

export function useVoice() {
  const [isRecording, setIsRecording] = useState(false);
  // 0..1 while the tier's Whisper model downloads; null otherwise.
  const [modelDownloadProgress, setModelDownloadProgress] = useState<number | null>(null);
  const selectedTier = useSettingsStore((s) => s.selectedTier);
  const sttModel = useMemo(() => (selectedTier === "lite" ? "tiny" : "base"), [selectedTier]);
  const sessionRef = useRef<Promise<SessionHandle> | null>(null);
  const stopInFlightRef = useRef<Promise<string> | null>(null);
  // True while the mic is actually recording. Unlike sessionRef (also set while a session is only
  // pre-warmed, or while a press waits for the permission answer), this says the mic is in use.
  const recordingRef = useRef(false);

  // Pre-warm session when hook mounts so mic starts as soon as user presses (no model-load delay).
  useEffect(() => {
    if (!sessionRef.current) {
      sessionRef.current = startListeningSession(sttModel);
    }
    return () => {
      sessionRef.current?.then((handle) => handle.release().catch(() => {})).catch(() => {});
      sessionRef.current = null;
    };
  }, [sttModel]);

  const startListening = useCallback(() => {
    console.log("[OfflineMate] Voice: startListening (press and hold)");
    if (!sessionRef.current) {
      sessionRef.current = startListeningSession(sttModel);
    }
    const sessionPromise = sessionRef.current;
    sessionPromise
      .then((handle) => handle.start())
      .then(() => {
        // A release that came first (e.g. the permission dialog ended the press) wins.
        if (!stopInFlightRef.current) recordingRef.current = true;
        setIsRecording(true);
      })
      .catch((e) => {
        console.warn("[OfflineMate] Voice: start error", e);
        recordingRef.current = false;
        sessionRef.current = null;
      });
  }, [sttModel]);

  const stopListening = useCallback(async (): Promise<string> => {
    if (stopInFlightRef.current) return stopInFlightRef.current;

    const stopPromise = (async (): Promise<string> => {
      recordingRef.current = false;
      const sessionPromise = sessionRef.current;
      sessionRef.current = null;
      if (!sessionPromise) {
        setIsRecording(false);
        return "No speech captured.";
      }

      try {
        const handle = await sessionPromise;
        const result = await handle.stop();
        console.log("[OfflineMate] Voice: stopListening result length:", result?.length ?? 0);
        return result;
      } catch (e) {
        console.warn("[OfflineMate] Voice: stopListening error", e);
        return "STT failed.";
      } finally {
        recordingRef.current = false;
        setIsRecording(false);
        // Pre-warm next session only if user hasn't already started a new one.
        if (sessionRef.current === null) {
          sessionRef.current = startListeningSession(sttModel);
        }
      }
    })();

    stopInFlightRef.current = stopPromise;
    try {
      return await stopPromise;
    } finally {
      stopInFlightRef.current = null;
    }
  }, [sttModel]);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      // Only stop a recording in progress. A pre-warmed session is left alone: stopping it
      // pre-warms a new one, and the permission screen (opened from a mic press) also counts as
      // leaving the app, which used to restart the session in a loop while the mic was denied.
      if (state !== "active" && recordingRef.current) {
        console.log("[OfflineMate] Voice: app backgrounded, stopping active STT session");
        void stopListening();
      }
    });
    return () => sub.remove();
  }, [stopListening]);

  const downloadVoiceModel = useCallback(async () => {
    setModelDownloadProgress(0);
    try {
      await downloadTierVoiceModel(selectedTier, (progress) => {
        // Only re-render on whole-percent changes; download callbacks fire many times per second.
        const pct = Math.floor(progress * 100) / 100;
        setModelDownloadProgress((prev) => (prev === pct ? prev : pct));
      });
      // The pre-warmed session may predate the download; replace it so the next press uses the new
      // model. Release first: release() calls releaseAllWhisper(), which would also free a new context.
      const stale = sessionRef.current;
      sessionRef.current = null;
      await stale?.then((handle) => handle.release()).catch(() => {});
      sessionRef.current ??= startListeningSession(sttModel);
    } finally {
      setModelDownloadProgress(null);
    }
  }, [selectedTier, sttModel]);

  async function startVoiceInput() {
    console.log("[OfflineMate] Voice: startVoiceInput (mic), STT model:", sttModel);
    setIsRecording(true);
    try {
      const result = await transcribeFromMicrophone(sttModel);
      console.log("[OfflineMate] Voice: startVoiceInput result length:", result?.length ?? 0);
      return result;
    } finally {
      setIsRecording(false);
    }
  }

  async function speakText(text: string) {
    console.log("[OfflineMate] Voice: speakText called, length:", text?.length ?? 0);
    await speak(text);
  }

  return {
    isRecording,
    modelDownloadProgress,
    selectedTier,
    startListening,
    stopListening,
    downloadVoiceModel,
    startVoiceInput,
    speakText,
  };
}

