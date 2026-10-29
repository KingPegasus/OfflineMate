// whisper.rn exports only React Native entry points, so Vite cannot resolve it under Node.
// Tests alias it here and override behaviour with vi.mock("whisper.rn", ...) where needed.
export const initWhisper = async () => {
  throw new Error("whisper.rn is not available in unit tests");
};
export const releaseAllWhisper = async () => {};
