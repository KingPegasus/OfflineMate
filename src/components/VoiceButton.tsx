import { useState } from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useVoice } from "@/hooks/useVoice";

interface VoiceButtonProps {
  onTranscript?: (text: string) => void;
}

export function VoiceButton({ onTranscript }: VoiceButtonProps) {
  const { startVoiceInput } = useVoice();
  const [busy, setBusy] = useState(false);

  return (
    <TouchableOpacity
      style={[styles.button, busy && styles.buttonBusy]}
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
      disabled={busy}
    >
      <View style={styles.content}>
        <Ionicons name={busy ? "hourglass-outline" : "mic-outline"} size={18} color="#e5e7eb" />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: "#1f2937",
    borderRadius: 12,
    width: 44,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonBusy: {
    opacity: 0.75,
  },
  content: {
    alignItems: "center",
    justifyContent: "center",
  },
});

