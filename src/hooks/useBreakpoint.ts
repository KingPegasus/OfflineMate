import { useCallback, useMemo, useState, type ComponentRef } from "react";
import { useWindowDimensions, type LayoutChangeEvent, type View } from "react-native";
import { useFoldFeatures } from "@/native/window-posture";
import {
  getBreakpoint,
  getSeparatingHinge,
  splitAroundHinge,
  type Breakpoint,
  type Hinge,
  type HingeSplit,
  type Rect,
} from "@/utils/layout";

/**
 * Current window size class and fold posture. Updates live on rotation, split screen, window
 * resizes and folding/unfolding (the activity isn't recreated, so screen state is kept).
 */
export function useBreakpoint(): Breakpoint {
  const { width, height } = useWindowDimensions();
  const features = useFoldFeatures();
  const hinge = useMemo(() => getSeparatingHinge(features, width, height), [features, width, height]);
  return useMemo(() => getBreakpoint(width, hinge), [width, hinge]);
}

/**
 * Measures a container in window space and splits it around `hinge`. Attach `ref` and
 * `onLayout` to the container; `split` is null when there's no hinge to avoid.
 */
export function useHingeSplit(hinge: Hinge | null, minPane?: number) {
  // A callback ref kept in state (not useRef), so reading the result during render is fine.
  const [node, ref] = useState<ComponentRef<typeof View> | null>(null);
  const [rect, setRect] = useState<Rect | null>(null);
  const onLayout = useCallback(
    (_e: LayoutChangeEvent) => {
      node?.measureInWindow((x, y, width, height) => {
        setRect((prev) =>
          prev && prev.x === x && prev.y === y && prev.width === width && prev.height === height
            ? prev
            : { x, y, width, height },
        );
      });
    },
    [node],
  );
  const split: HingeSplit | null = useMemo(
    () => splitAroundHinge(hinge, rect, minPane),
    [hinge, rect, minPane],
  );
  return { ref, onLayout, split };
}
