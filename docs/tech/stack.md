# Technology Stack (Technical)

This document lists the target stack and why each technology is selected.

## Mobile Framework

- Expo + React Native + TypeScript
- Why:
  - rapid iteration
  - strong module ecosystem
  - managed native builds with EAS

## On-Device AI Runtime

- `react-native-executorch`
- Why:
  - on-device inference support in React Native
  - model loading and generation APIs
  - alignment with planned model families

## Retrieval and Memory

- `react-native-rag`
- `expo-sqlite` + `sqlite-vec`
- Why:
  - local vector retrieval
  - offline persistence
  - modular retrieval components

## Speech

- STT: `whisper.rn`
- TTS: `expo-speech` (initial path)
- Why:
  - proven on-device STT integrations for React Native
  - pragmatic TTS baseline without custom engine complexity

## Device and App Tooling

- `expo-calendar`
- `expo-contacts`
- `expo-notifications`
- `expo-file-system`
- Why:
  - first-party Expo modules with stable APIs
  - needed for assistant tool execution and model file handling

## Runtime and State

- Zustand (state)
- MMKV (fast key-value store)
- SQLite (structured/local retrieval data)

## References

- Expo docs: [https://docs.expo.dev/](https://docs.expo.dev/)
- React Native ExecuTorch docs: [https://docs.swmansion.com/react-native-executorch/docs](https://docs.swmansion.com/react-native-executorch/docs)
- React Native RAG docs: [https://software-mansion-labs.github.io/react-native-rag/](https://software-mansion-labs.github.io/react-native-rag/)
- whisper.rn repository: [https://github.com/mybigday/whisper.rn](https://github.com/mybigday/whisper.rn)
- Expo Speech docs: [https://docs.expo.dev/versions/latest/sdk/speech/](https://docs.expo.dev/versions/latest/sdk/speech/)
