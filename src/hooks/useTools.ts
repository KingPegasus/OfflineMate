import { TOOL_REGISTRY } from "@/tools/tool-registry";

export function useTools() {
  return {
    registeredTools: TOOL_REGISTRY,
  };
}

