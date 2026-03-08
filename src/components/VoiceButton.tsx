import { useState } from "react";
import { StyleSheet, Text, TouchableOpacity } from "react-native";
import { useVoice } from "@/hooks/useVoice";

interface VoiceButtonProps {
  onTranscript?: (text: string) => void;
}

export function VoiceButton({ onTranscript }: VoiceButtonProps) {
  const { startVoiceInput } = useVoice();
  const [busy, setBusy] = useState(false);

  return (
    <TouchableOpacity
      style={styles.button}
      onPress={async () => {
        setBusy(true);
        try {
          const transcript = await startVoiceInput();
          if (transcript && !transcript.toLowerCase().includes("not downloaded")) {
            onTranscript?.(transcript);
          }
        } finally {
          setBusy(false);
        }
      }}
    >
      <Text style={styles.label}>{busy ? "..." : "Mic"}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: "#1f2937",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  label: { color: "#e5e7eb", fontWeight: "700" },
});

