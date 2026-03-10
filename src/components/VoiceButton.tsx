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
    <View style={styles.container}>
      {isRecording && <View style={styles.glowUnderlay} pointerEvents="none" />}
      <View style={styles.wrapper}>
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
    </View>
  );
}

export const VOICE_BUTTON_LAYOUT = {
  BUTTON_SIZE: 44,
  WRAPPER_SIZE: 44 + 4 * 2,
} as const;

const BUTTON_SIZE = VOICE_BUTTON_LAYOUT.BUTTON_SIZE;
const BUTTON_RADIUS = BUTTON_SIZE / 2;
const WRAPPER_PADDING = 4;
const WRAPPER_SIZE = VOICE_BUTTON_LAYOUT.WRAPPER_SIZE;
const WRAPPER_RADIUS = WRAPPER_SIZE / 2;

const styles = StyleSheet.create({
  container: {
    width: WRAPPER_SIZE,
    height: WRAPPER_SIZE,
    minWidth: WRAPPER_SIZE,
    minHeight: WRAPPER_SIZE,
    flexShrink: 0,
    flexGrow: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  glowUnderlay: {
    position: "absolute",
    width: WRAPPER_SIZE,
    height: WRAPPER_SIZE,
    borderRadius: WRAPPER_RADIUS,
    backgroundColor: "rgba(239, 68, 68, 0.2)",
    borderWidth: 2,
    borderColor: "rgba(248, 113, 113, 0.6)",
  },
  wrapper: {
    width: WRAPPER_SIZE,
    height: WRAPPER_SIZE,
    minWidth: WRAPPER_SIZE,
    minHeight: WRAPPER_SIZE,
    borderRadius: WRAPPER_RADIUS,
    padding: WRAPPER_PADDING,
    alignItems: "center",
    justifyContent: "center",
  },
  button: {
    backgroundColor: "#1f2937",
    borderRadius: BUTTON_RADIUS,
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    minWidth: BUTTON_SIZE,
    minHeight: BUTTON_SIZE,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonRecording: {
    backgroundColor: "rgba(239, 68, 68, 0.2)",
    borderRadius: BUTTON_RADIUS,
  },
  content: {
    alignItems: "center",
    justifyContent: "center",
  },
});

