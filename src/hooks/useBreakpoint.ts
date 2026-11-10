import { useMemo } from "react";
import { useWindowDimensions } from "react-native";
import { getBreakpoint, type Breakpoint } from "@/utils/layout";

/** Current window size class; updates on rotation, split screen and window resizes. */
export function useBreakpoint(): Breakpoint {
  const { width } = useWindowDimensions();
  return useMemo(() => getBreakpoint(width), [width]);
}
