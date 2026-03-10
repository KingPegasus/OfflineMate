import { useCallback, useMemo, useRef, useState } from "react";
import { startListeningSession, transcribeFromMicrophone } from "@/voice/stt-engine";
import { speak } from "@/voice/tts-engine";
import { useSettingsStore } from "@/stores/settings-store";

export function useVoice() {
  const [isRecording, setIsRecording] = useState(false);
  const selectedTier = useSettingsStore((s) => s.selectedTier);
  const sttModel = useMemo(() => (selectedTier === "lite" ? "tiny" : "base"), [selectedTier]);
  const sessionRef = useRef<Promise<{ stop: () => Promise<string> }> | null>(null);

  const startListening = useCallback(() => {
    if (sessionRef.current) return;
    console.log("[OfflineMate] Voice: startListening (press and hold)");
    setIsRecording(true);
    sessionRef.current = startListeningSession(sttModel);
  }, [sttModel]);

  const stopListening = useCallback(async (): Promise<string> => {
    const sessionPromise = sessionRef.current;
    sessionRef.current = null;
    setIsRecording(false);
    if (!sessionPromise) return "No speech captured.";
    try {
      const handle = await sessionPromise;
      const result = await handle.stop();
      console.log("[OfflineMate] Voice: stopListening result length:", result?.length ?? 0);
      return result;
    } catch (e) {
      console.warn("[OfflineMate] Voice: stopListening error", e);
      return "STT failed.";
    }
  }, []);

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

