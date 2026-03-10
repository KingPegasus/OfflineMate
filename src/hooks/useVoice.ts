import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AppState } from "react-native";
import { startListeningSession, transcribeFromMicrophone } from "@/voice/stt-engine";
import { speak } from "@/voice/tts-engine";
import { useSettingsStore } from "@/stores/settings-store";

type SessionHandle = Awaited<ReturnType<typeof startListeningSession>>;

export function useVoice() {
  const [isRecording, setIsRecording] = useState(false);
  const selectedTier = useSettingsStore((s) => s.selectedTier);
  const sttModel = useMemo(() => (selectedTier === "lite" ? "tiny" : "base"), [selectedTier]);
  const sessionRef = useRef<Promise<SessionHandle> | null>(null);
  const stopInFlightRef = useRef<Promise<string> | null>(null);

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
      .then(() => setIsRecording(true))
      .catch((e) => {
        console.warn("[OfflineMate] Voice: start error", e);
        sessionRef.current = null;
      });
  }, [sttModel]);

  const stopListening = useCallback(async (): Promise<string> => {
    if (stopInFlightRef.current) return stopInFlightRef.current;

    const stopPromise = (async (): Promise<string> => {
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
      if (state !== "active" && sessionRef.current) {
        console.log("[OfflineMate] Voice: app backgrounded, stopping active STT session");
        void stopListening();
      }
    });
    return () => sub.remove();
  }, [stopListening]);

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

  return { isRecording, startListening, stopListening, startVoiceInput, speakText };
}

