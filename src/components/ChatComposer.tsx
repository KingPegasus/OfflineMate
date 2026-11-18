import { Ionicons } from "@expo/vector-icons";
import {
  Image,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { VoiceButton } from "@/components/VoiceButton";

type Props = {
  value: string;
  onChangeText: (text: string) => void;
  onSend: () => void;
  onStop: () => void;
  isLoading: boolean;
  canSubmit: boolean;
  onVoiceTranscript: (text: string) => void;
  /** Gallery image waiting to be sent with the next prompt. */
  attachedImageUri?: string | null;
  onAttachImage: () => void;
  onRemoveImage: () => void;
  /** Extra row style, e.g. a max width on tablets. */
  style?: StyleProp<ViewStyle>;
};

export function ChatComposer({
  value,
  onChangeText,
  onSend,
  onStop,
  isLoading,
  canSubmit,
  onVoiceTranscript,
  attachedImageUri,
  onAttachImage,
  onRemoveImage,
  style,
}: Props) {
  return (
    <View style={[styles.container, style]}>
      {attachedImageUri ? (
        <View style={styles.preview}>
          <Image source={{ uri: attachedImageUri }} style={styles.previewImage} accessibilityLabel="Image to send" />
          <Text style={styles.previewHint} numberOfLines={2}>
            Image attached. Ask about it, or send to get a description.
          </Text>
          <TouchableOpacity
            style={styles.removeButton}
            onPress={onRemoveImage}
            accessibilityRole="button"
            accessibilityLabel="Remove image"
            hitSlop={8}
          >
            <Ionicons name="close" size={18} color="#e5e7eb" />
          </TouchableOpacity>
        </View>
      ) : null}
      <View style={styles.row}>
        <TouchableOpacity
          style={styles.attachButton}
          onPress={onAttachImage}
          disabled={isLoading}
          accessibilityRole="button"
          accessibilityLabel="Attach image from gallery"
        >
          <Ionicons name="image-outline" size={22} color={isLoading ? "#4b5563" : "#93c5fd"} />
        </TouchableOpacity>
        <TextInput
          placeholder={attachedImageUri ? "Ask about this image..." : "Ask OfflineMate..."}
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderTopWidth: 1,
    borderTopColor: "#1f2937",
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#0b1020",
    gap: 8,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  preview: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#111827",
    borderRadius: 12,
    padding: 6,
  },
  previewImage: { width: 52, height: 52, borderRadius: 8, backgroundColor: "#0f172a" },
  previewHint: { flex: 1, color: "#9ca3af", fontSize: 12 },
  removeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#374151",
    alignItems: "center",
    justifyContent: "center",
  },
  attachButton: {
    width: 40,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
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
