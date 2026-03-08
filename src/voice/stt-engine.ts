import * as FileSystem from "expo-file-system/legacy";
import { initWhisper, releaseAllWhisper } from "whisper.rn";

export type STTSize = "tiny" | "base";

const STT_MODEL_PATHS: Record<STTSize, string> = {
  tiny: `${FileSystem.documentDirectory}models/whisper-tiny.en.bin`,
  base: `${FileSystem.documentDirectory}models/whisper-base.en.bin`,
};

async function modelExists(path: string) {
  const info = await FileSystem.getInfoAsync(path);
  return info.exists;
}

export async function transcribeFromMicrophone(modelSize: STTSize) {
  const filePath = STT_MODEL_PATHS[modelSize];
  const exists = await modelExists(filePath);
  if (!exists) {
    return `STT model (${modelSize}) not downloaded yet.`;
  }

  const context = await initWhisper({
    filePath,
    isBundleAsset: false,
    useGpu: true,
  });

  const session = await context.transcribeRealtime({
    maxLen: 1,
    language: "en",
  });

  let transcript = "";
  session.subscribe((event: { isCapturing?: boolean; isTranscribing?: boolean; data?: { result?: string } }) => {
    if (event.isCapturing || event.isTranscribing) {
      const text = event.data?.result ?? "";
      transcript = text || transcript;
    }
  });

  // Capture a short utterance; later this can become explicit start/stop UX.
  await new Promise((resolve) => setTimeout(resolve, 4000));
  await session.stop();
  await context.release();
  await releaseAllWhisper();

  return transcript || "No speech captured.";
}

