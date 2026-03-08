import * as Speech from "expo-speech";

export async function speak(text: string) {
  await Speech.speak(text, {
    rate: 1.0,
    pitch: 1.0,
    language: "en-US",
  });
}

