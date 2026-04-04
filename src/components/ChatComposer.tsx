import { StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { VoiceButton } from "@/components/VoiceButton";

type Props = {
  value: string;
  onChangeText: (text: string) => void;
  onSend: () => void;
  onStop: () => void;
  isLoading: boolean;
  canSubmit: boolean;
  onVoiceTranscript: (text: string) => void;
};

export function ChatComposer({
  value,
  onChangeText,
  onSend,
  onStop,
  isLoading,
  canSubmit,
  onVoiceTranscript,
}: Props) {
  return (
    <View style={styles.row}>
      <TextInput
        placeholder="Ask OfflineMate..."
        placeholderTextColor="#6b7280"
        value={value}
        onChangeText={onChangeText}
        style={styles.input}
        multiline
      />
      <View style={styles.voiceSlot}>
        <VoiceButton onTranscript={onVoiceTranscript} />
      </View>
      {isLoading ? (
        <TouchableOpacity style={styles.stopButton} onPress={onStop}>
          <Text style={styles.stopText}>Stop</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          style={[styles.sendButton, !canSubmit && styles.sendButtonDisabled]}
          onPress={onSend}
          disabled={!canSubmit}
        >
          <Text style={[styles.sendText, !canSubmit && styles.disabled]}>Send</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: "#1f2937",
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#0b1020",
  },
  input: {
    flex: 1,
    minWidth: 0,
    color: "#e5e7eb",
    backgroundColor: "#111827",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    maxHeight: 100,
  },
  voiceSlot: {
    width: 52,
    minWidth: 52,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  sendButton: {
    backgroundColor: "#1f2937",
    borderRadius: 12,
    minWidth: 56,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  sendButtonDisabled: {
    opacity: 0.6,
  },
  stopButton: {
    backgroundColor: "#7f1d1d",
    borderRadius: 12,
    minWidth: 56,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  stopText: { color: "#fecaca", fontWeight: "700" },
  sendText: { color: "#60a5fa", fontWeight: "700" },
  disabled: { color: "#6b7280" },
});
