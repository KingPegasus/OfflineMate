# Technology Stack (Technical)

This document lists the target stack and why each technology is selected.

## Mobile Framework

- **Expo SDK 55** + React Native 0.83 + React 19.2 + TypeScript
- Why:
  - rapid iteration and strong module ecosystem
  - managed native builds with **EAS** (Expo Application Services)
  - **Development builds** (custom dev client) required for native modules like ExecuTorch and whisper.rn—Expo Go is not sufficient for this stack
- Note: SDK 55 requires the New Architecture; Legacy Architecture support ended in SDK 54. Use `expo-dev-client` for local and EAS development builds.

## On-Device AI Runtime

- `react-native-executorch` (ExecuTorch bindings for React Native)
- Why:
  - on-device inference with minimal runtime footprint (~50KB base)
  - model loading (`.pte` format) and generation APIs
  - alignment with Llama, Qwen, SmolLM and other exportable families
- ExecuTorch supports delegation to XNNPack (CPU), Core ML (Apple), MPS, and Qualcomm AI Stack for acceleration.

## Retrieval and Memory

- `expo-sqlite` + **sqlite-vec** (vector extension)
- Why:
  - local vector retrieval via `vec0` virtual tables and KNN `MATCH`
  - single embedded DB for structured and vector data
  - no dependency on `react-native-rag` for core retrieval; custom pipeline with ExecuTorch embeddings

## Speech

- **STT:** `whisper.rn` (whisper.cpp binding)
- **TTS:** `expo-speech`
- Why:
  - on-device STT with optional VAD and RealtimeTranscriber path
  - pragmatic TTS baseline; no custom neural TTS in MVP
- Microphone permission required on both iOS and Android for realtime STT.

## Device and App Tooling

- `expo-calendar`, `expo-contacts`, `expo-notifications`, `expo-file-system`
- Why: first-party Expo modules with stable APIs for assistant tools and model file handling.

## Runtime and State

- **Zustand** (state) with **expo-secure-store** (persisted settings)
- **SQLite** (via expo-sqlite) for structured and vector data
- No MMKV in current implementation; SecureStore used for tier, voice, and onboarding flags.

## References

- [Expo Documentation](https://docs.expo.dev/)
- [Expo SDK 55 Changelog](https://expo.dev/changelog/sdk-55)
- [EAS Development Builds](https://docs.expo.dev/develop/development-builds/create-a-build)
- [React Native ExecuTorch](https://docs.swmansion.com/react-native-executorch/docs)
- [ExecuTorch (PyTorch)](https://executorch.ai/)
- [whisper.rn](https://github.com/mybigday/whisper.rn)
- [Expo Speech](https://docs.expo.dev/versions/latest/sdk/speech/)
- [sqlite-vec](https://github.com/asg017/sqlite-vec)
