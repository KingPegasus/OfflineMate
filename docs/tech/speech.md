# Speech Pipeline Technical Details

OfflineMate speech mode is designed for local-first operation.

## STT (Speech-to-Text)

- **Engine:** `whisper.rn` (React Native binding of whisper.cpp)
- **Tier strategy:** Lite uses tiny.en; Standard/Full can use base or larger models for better accuracy. Model files (e.g. `whisper-tiny.en.bin`, `whisper-base.en.bin`) are stored under the app document directory and loaded by path.
- **Current API:** The app uses `context.transcribeRealtime()` with a fixed-duration capture (~4s) and subscribes to events. The final transcript is taken from the event where `isCapturing === false` (whisper.rn sends the full result in that event).
- **Deprecation:** `transcribeRealtime()` is deprecated in whisper.rn. The recommended path is **RealtimeTranscriber**, which provides:
  - **VAD (Voice Activity Detection)** via Silero VAD for automatic slice boundaries and speech detection
  - **AudioPcmStreamAdapter** for microphone input (requires `@fugood/react-native-audio-pcm-stream`)
  - Optional filesystem adapter (e.g. `react-native-fs`) for WAV output
  Until migration, the deprecation warning in logcat is expected; behavior is unchanged.

## Platform Requirements (whisper.rn)

- **iOS:** Microphone permission in `Info.plist` (`NSMicrophoneUsageDescription`). Tested on iPhone 13 Pro Max; Core ML and GPU options available. Extended Virtual Addressing recommended for medium/large models.
- **Android:** `RECORD_AUDIO` in AndroidManifest **and** runtime permission request (e.g. `PermissionsAndroid.request(RECORD_AUDIO)`) before starting realtime STT; otherwise the native layer can fail with "Failed to start realtime transcribe. State: 0". ProGuard keep rules for `com.rnwhisper.**`. NDK 24.0.8215888+ recommended. Realtime STT requires a development build (not Expo Go).

## STT Strategy (Practical Plan)

This section defines what we run now, what we migrate to next, and when we should consider non-Whisper alternatives.

### Current Baseline (Now)

- Primary STT runtime: `whisper.rn` with Whisper tiny/base models.
- Reliability guardrails:
  - runtime mic permission request on Android
  - transcript merge logic for non-monotonic realtime events
  - no-input filtering (`[BLANK_AUDIO]`, empty, startup failures)
- Accuracy preference: use `base` model when available; fallback to `tiny` only when needed.

### Phase 1 (Near-term): Migrate to RealtimeTranscriber + VAD

- Replace deprecated `transcribeRealtime()` path with `RealtimeTranscriber`.
- Add dependencies:
  - `@fugood/react-native-audio-pcm-stream` (required audio adapter)
  - optional fs adapter (e.g. `react-native-fs`) if WAV artifacts are needed
- Enable VAD preset tuning:
  - start with `default`
  - test `sensitive` in low-volume environments
  - prefer conservative presets when false triggers are high

Expected impact:

- better end-of-speech detection
- less phrase truncation/misalignment around press/release timing
- cleaner segmentation for command phrases

### Phase 2 (If command accuracy remains weak): Hybrid STT

- Keep Whisper for free-form dictation.
- Add a command-focused STT fallback only for tool-intent utterances (short imperative phrases).
- Candidate engines:
  - `Vosk` (lightweight, robust on weaker devices)
  - `Sherpa-ONNX` (strong realtime offline path, more integration work)

Routing concept:

- if utterance is short and likely a tool command, run command STT path
- otherwise run Whisper path
- compare confidence/signals and pick best transcript

## Whisper vs Alternatives (Decision Criteria)

Whisper is typically best for general-purpose offline transcription quality, but it is not always best for every command UX.

Use these criteria:

- **General dictation quality:** Whisper usually wins.
- **Realtime command latency on weak phones:** Vosk/Sherpa may perform better.
- **Integration complexity (Expo/RN):** whisper.rn is currently easiest in this app.
- **Maintenance risk:** adding another STT runtime increases native build/test surface.

## Acceptance Metrics for STT Quality

For release gating, track:

- **Command Success Rate (CSR):** `%` of spoken tool commands executed correctly end-to-end.
- **Reminder Time Parse Success:** `%` of reminder utterances where duration is extracted correctly.
- **No-input Rate:** `%` sessions returning no usable transcript.
- **Median STT Latency:** press/release to transcript-ready time.
- **WER/CER sample set:** small curated phrase set for regression checks.

Suggested target baseline (device QA):

- CSR >= 90% for top 20 command phrases
- Reminder Time Parse Success >= 95% for forms like "in N minutes", "tomorrow", "after N hours"
- Median latency <= 1.5s after release on flagship, <= 2.5s on mid-tier

## Recommendation

- Keep Whisper as primary engine now (best quality/effort trade-off).
- Prioritize Phase 1 migration to RealtimeTranscriber + VAD.
- Reassess with metrics; only add a secondary command STT engine if metrics remain below target on key devices.

## TTS (Text-to-Speech)

- **Engine:** `expo-speech` (platform TTS)
- **Rationale:** Avoids Gradle/native TTS compatibility issues, fits Expo EAS builds, sufficient for MVP. Language set to `en-US`; rate and pitch configurable.

## Why This Approach Was Chosen

- Keeps the full speech loop on-device (no cloud STT/TTS).
- Aligns with tier-based model and latency constraints.
- Defers custom neural TTS until product requirements justify it.

## Runtime Considerations

- Request microphone permission before starting realtime STT.
- On iOS, audio session (e.g. PlayAndRecord, MixWithOthers) can be tuned via whisper.rn options for coexistence with playback.
- Handle subscription events for both partial and final results; final result is delivered when `isCapturing` is false.
- Keep capture duration and timeouts bounded to avoid battery and UX issues.

## Future Enhancements

- Migrate to RealtimeTranscriber + AudioPcmStreamAdapter and optional VAD for better turn-taking.
- Evaluate offline neural TTS if voice quality becomes a requirement.
- Add barge-in and end-of-speech detection for more natural dialogue.

## References

- [whisper.rn](https://github.com/mybigday/whisper.rn)
- [Whisper (OpenAI)](https://github.com/openai/whisper)
- [whisper.cpp](https://github.com/ggerganov/whisper.cpp)
- [Expo Speech](https://docs.expo.dev/versions/latest/sdk/speech/)
- [Expo AV](https://docs.expo.dev/versions/latest/sdk/audio-av/)
- [@fugood/react-native-audio-pcm-stream](https://www.npmjs.com/package/@fugood/react-native-audio-pcm-stream) (for RealtimeTranscriber migration)
- [Vosk](https://alphacephei.com/vosk/)
- [sherpa-onnx](https://github.com/k2-fsa/sherpa-onnx)
