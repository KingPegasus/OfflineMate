import { Alert, StyleSheet, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useVoice } from "@/hooks/useVoice";

/** Transcripts that mean "no usable input" — do not send to chat. */
function isNoInput(transcript: string): boolean {
  const t = transcript.trim().toLowerCase();
  return (
    !t ||
    t.includes("not downloaded") ||
    t.includes("microphone permission is required") ||
    t.startsWith("stt failed") ||
    t.includes("failed to start") ||
    t === "no speech captured." ||
    t === "no speech detected." ||
    t === "[blank_audio]"
  );
}

interface VoiceButtonProps {
  onTranscript?: (text: string) => void;
}

export function VoiceButton({ onTranscript }: VoiceButtonProps) {
  const { startListening, stopListening, isRecording } = useVoice();

  const handlePressIn = () => {
    startListening();
  };

  const handlePressOut = () => {
    void (async () => {
      const transcript = await stopListening();
      if (transcript && !isNoInput(transcript)) {
        console.log("[OfflineMate] Voice: transcript passed to chat:", transcript.slice(0, 60));
        onTranscript?.(transcript);
      } else {
        console.log("[OfflineMate] Voice: no valid transcript (skipped):", transcript?.slice(0, 40));
        if (transcript && (transcript.includes("No speech") || transcript.includes("[BLANK_AUDIO]"))) {
          Alert.alert("No speech detected", "Hold the mic button and speak, then release when done.");
        } else if (transcript?.toLowerCase().includes("microphone permission is required")) {
          Alert.alert("Microphone permission needed", "Allow microphone access in device settings to use voice input.");
        }
      }
    })();
  };

  return (
    <View style={[styles.wrapper, isRecording && styles.wrapperGlow]}>
      <TouchableOpacity
        style={[styles.button, isRecording && styles.buttonRecording]}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
      >
        <View style={styles.content}>
          <Ionicons
            name={isRecording ? "mic" : "mic-outline"}
            size={20}
            color={isRecording ? "#f87171" : "#e5e7eb"}
          />
        </View>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: 28,
    padding: 4,
  },
  wrapperGlow: {
    backgroundColor: "rgba(239, 68, 68, 0.25)",
    borderWidth: 2,
    borderColor: "rgba(248, 113, 113, 0.7)",
    shadowColor: "#ef4444",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 10,
    elevation: 8,
  },
  button: {
    backgroundColor: "#1f2937",
    borderRadius: 24,
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonRecording: {
    backgroundColor: "rgba(239, 68, 68, 0.2)",
  },
  content: {
    alignItems: "center",
    justifyContent: "center",
  },
});

