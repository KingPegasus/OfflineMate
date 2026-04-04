import { Modal, StyleSheet, Text, View } from "react-native";
import { ProgressBar } from "@/components/ProgressBar";
import { useModelStore } from "@/stores/model-store";

/**
 * Shown when the user sends a chat message and ExecuTorch starts downloading the LLM
 * from a remote URL (first-time / missing cache). Progress comes from LLMModule.load.
 */
export function LlmInitDownloadModal() {
  const llmInitDownload = useModelStore((s) => s.llmInitDownload);
  const visible = llmInitDownload !== null;
  const progress = llmInitDownload?.progress ?? 0;
  const modelName = llmInitDownload?.modelName;
  const fileLabel = llmInitDownload?.fileLabel;
  const pct = Math.round(progress * 100);

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>Downloading model</Text>
          {modelName ? (
            <Text style={styles.modelName} numberOfLines={2}>
              {modelName}
            </Text>
          ) : null}
          {fileLabel ? (
            <Text style={styles.fileName} numberOfLines={2}>
              {fileLabel}
            </Text>
          ) : null}
          <Text style={styles.body}>
            Fetching model files. You can leave this screen open—this only happens when assets are not on device yet.
          </Text>
          <ProgressBar progress={progress} />
          <Text style={styles.pct}>{pct}%</Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  card: {
    backgroundColor: "#111827",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#1f2937",
    padding: 20,
  },
  title: {
    color: "#e5e7eb",
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 8,
  },
  modelName: {
    color: "#e5e7eb",
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 6,
  },
  fileName: {
    color: "#93c5fd",
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 10,
  },
  body: {
    color: "#9ca3af",
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  pct: {
    color: "#93c5fd",
    fontSize: 13,
    fontWeight: "600",
    marginTop: 10,
    textAlign: "right",
  },
});
