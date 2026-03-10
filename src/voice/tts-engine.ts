import * as Speech from "expo-speech";

export async function speak(text: string) {
  const preview = text.length > 60 ? `${text.slice(0, 60)}…` : text;
  console.log("[OfflineMate] TTS: speaking", text.length, "chars:", preview);
  try {
    await Speech.speak(text, {
      rate: 1.0,
      pitch: 1.0,
      language: "en-US",
    });
    console.log("[OfflineMate] TTS: finished");
  } catch (e) {
    console.warn("[OfflineMate] TTS: error", e);
    throw e;
  }
}

