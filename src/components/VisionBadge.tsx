import { Ionicons } from "@expo/vector-icons";

/** Marks a model that accepts a gallery image with the prompt. */
export function VisionBadge({ size = 16 }: { size?: number }) {
  return (
    <Ionicons
      name="image-outline"
      size={size}
      color="#93c5fd"
      accessible
      accessibilityLabel="Supports images"
    />
  );
}
