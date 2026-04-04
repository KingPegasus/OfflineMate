import { StyleSheet, View, type ViewStyle } from "react-native";

type Props = {
  /** 0–1 */
  progress: number;
  trackStyle?: ViewStyle;
  fillStyle?: ViewStyle;
};

export function ProgressBar({ progress, trackStyle, fillStyle }: Props) {
  const pct = Math.min(100, Math.max(0, Math.round(progress * 100)));
  return (
    <View style={[styles.track, trackStyle]}>
      <View style={[styles.fill, { width: `${pct}%` }, fillStyle]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: 8,
    borderRadius: 4,
    backgroundColor: "#1f2937",
    overflow: "hidden",
  },
  fill: {
    height: "100%",
    backgroundColor: "#60a5fa",
    borderRadius: 4,
  },
});
