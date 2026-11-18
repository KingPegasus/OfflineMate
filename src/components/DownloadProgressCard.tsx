import { StyleSheet, Text, TouchableOpacity, View, type StyleProp, type ViewStyle } from "react-native";
import { ProgressBar } from "@/components/ProgressBar";
import type { ModelDownloadState } from "@/hooks/useModelDownload";

type Props = {
  state: ModelDownloadState;
  /** "Gemma 4 E2B" */
  title: string;
  onCancel: () => void;
  style?: StyleProp<ViewStyle>;
};

/** Progress for a model download: bar, percent, bytes/speed/time left, and a Cancel button. */
export function DownloadProgressCard({ state, title, onCancel, style }: Props) {
  const pct = Math.round(state.progress * 100);
  return (
    <View style={[styles.card, style]} accessibilityLiveRegion="polite">
      <View style={styles.header}>
        <Text style={styles.title} numberOfLines={1}>
          Downloading {title}
        </Text>
        <Text style={styles.pct}>{pct}%</Text>
      </View>
      <ProgressBar progress={state.progress} />
      {state.detail ? <Text style={styles.detail}>{state.detail}</Text> : null}
      {state.label ? <Text style={styles.file}>Now: {state.label}</Text> : null}
      <Text style={styles.hint}>
        {"Keep OfflineMate open until this finishes; the screen stays on. If it's interrupted, it starts over."}
      </Text>
      <TouchableOpacity
        style={styles.cancel}
        onPress={onCancel}
        accessibilityRole="button"
        accessibilityLabel="Cancel download"
      >
        <Text style={styles.cancelText}>Cancel download</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: "#0b1222", borderRadius: 12, borderWidth: 1, borderColor: "#1f2937", padding: 12, gap: 8 },
  header: { flexDirection: "row", alignItems: "center", gap: 8 },
  title: { flex: 1, color: "#e5e7eb", fontWeight: "700" },
  pct: { color: "#93c5fd", fontWeight: "700" },
  detail: { color: "#cbd5e1", fontSize: 13 },
  file: { color: "#9ca3af", fontSize: 12 },
  hint: { color: "#6b7280", fontSize: 12, lineHeight: 17 },
  cancel: { alignSelf: "flex-start", paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8, backgroundColor: "#1f2937" },
  cancelText: { color: "#fca5a5", fontWeight: "700" },
});
