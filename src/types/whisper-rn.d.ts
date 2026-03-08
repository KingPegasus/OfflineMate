declare module "whisper.rn" {
  export function initWhisper(options: Record<string, unknown>): Promise<{
    transcribeRealtime: (options?: Record<string, unknown>) => Promise<{
      stop: () => Promise<void>;
      subscribe: (callback: (event: any) => void) => void;
    }>;
    release: () => Promise<void>;
  }>;
  export function releaseAllWhisper(): Promise<void>;
}

