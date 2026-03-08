import { useMemo, useState } from "react";
import { transcribeFromMicrophone } from "@/voice/stt-engine";
import { speak } from "@/voice/tts-engine";
import { useSettingsStore } from "@/stores/settings-store";

export function useVoice() {
  const [isRecording, setIsRecording] = useState(false);
  const selectedTier = useSettingsStore((s) => s.selectedTier);
  const sttModel = useMemo(() => (selectedTier === "lite" ? "tiny" : "base"), [selectedTier]);

  async function startVoiceInput() {
    setIsRecording(true);
    try {
      return await transcribeFromMicrophone(sttModel);
    } finally {
      setIsRecording(false);
    }
  }

  async function speakText(text: string) {
    await speak(text);
  }

  return { isRecording, startVoiceInput, speakText };
}

