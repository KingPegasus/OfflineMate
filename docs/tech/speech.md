# Speech Pipeline Technical Details

OfflineMate speech mode is designed for local-first operation.

## STT (Speech-to-Text)

- **Engine:** `whisper.rn` (React Native binding of whisper.cpp)
- **Tier strategy:** Lite uses tiny.en; Standard/Full can use base or larger models for better accuracy. Model files (e.g. `whisper-tiny.en.bin`, `whisper-base.en.bin`) are stored under the app document directory and loaded by path.
- **Current API (full-utterance, single-shot):** The app captures the **entire utterance** as raw PCM during press-and-hold and runs **one** `context.transcribeData()` call on the complete buffer at release. Whisper decodes a full utterance with surrounding context, which is significantly more accurate for short commands than streaming/slice transcription.
- **Audio capture:** `AudioPcmStreamAdapter` (requires `@fugood/react-native-audio-pcm-stream`) opens the mic at 16 kHz / mono / 16-bit PCM. On Android the audio source is `VOICE_RECOGNITION` (6), which is tuned for ASR. PCM chunks are accumulated in memory and concatenated at stop.
- **Why not RealtimeTranscriber/VAD:** The realtime streaming path (`RealtimeTranscriber` + Silero VAD auto-slicing) was evaluated and removed from the capture path: short VAD-cut slices caused looping/partial hallucinations and dropped trailing words (especially times) on short commands. The single-shot full-buffer path is simpler and more accurate for this push-to-talk UX. `transcribeRealtime()` remains deprecated upstream and is not used.

## Platform Requirements (whisper.rn)

- **iOS:** Microphone permission in `Info.plist` (`NSMicrophoneUsageDescription`). Tested on iPhone 13 Pro Max; Core ML and GPU options available. Extended Virtual Addressing recommended for medium/large models.
- **Android:** `RECORD_AUDIO` in AndroidManifest **and** runtime permission request (e.g. `PermissionsAndroid.request(RECORD_AUDIO)`) before starting realtime STT; otherwise the native layer can fail with "Failed to start realtime transcribe. State: 0". ProGuard keep rules for `com.rnwhisper.**`. NDK 24.0.8215888+ recommended. Realtime STT requires a development build (not Expo Go).

## STT Strategy (Practical Plan)

This section defines what we run now, what we migrate to next, and when we should consider non-Whisper alternatives.

### Current Baseline (Now)

- Primary STT runtime: `whisper.rn` **full-utterance single-shot** transcription (`transcribeData` on the complete PCM buffer).
- Reliability guardrails:
  - runtime mic permission request on Android
  - no-input filtering (`[BLANK_AUDIO]`, empty, startup failures) via `normalizeSttResult`
- Accuracy preference: use `base` model when available; fallback to `tiny` only when needed.

### Phase 1 (Near-term): Harden single-shot capture

- Keep dependency stack:
  - `@fugood/react-native-audio-pcm-stream` (required audio adapter; already integrated)
- Tuning levers:
  - keep `temperature: 0` + `beamSize: 5` for a stable decode
  - Android audio source `VOICE_RECOGNITION` (6) for ASR-tuned input
  - if accuracy remains weak on noisy devices, move Standard/Full tiers to a larger model (e.g. `small.en`) rather than adding text post-processing

Expected impact:

- no streaming/slice loop or partial-hallucination artifacts
- full trailing words (including times) captured before transcription
- best achievable accuracy for a given on-device model size

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
- Keep the full-utterance single-shot capture path; tune model size before adding complexity.
- Reassess with metrics; only add a secondary command STT engine if metrics remain below target on key devices.

## TTS (Text-to-Speech)

- **Engine:** `expo-speech` (platform TTS)
- **Rationale:** Avoids Gradle/native TTS compatibility issues, fits Expo EAS builds, sufficient for MVP. Language set to `en-US`; rate and pitch configurable.

## Why This Approach Was Chosen

- Keeps the full speech loop on-device (no cloud STT/TTS).
- Aligns with tier-based model and latency constraints.
- Defers custom neural TTS until product requirements justify it.

## Runtime Considerations

- Request microphone permission before starting capture.
- On iOS, audio session (e.g. PlayAndRecord, MixWithOthers) can be tuned via whisper.rn options for coexistence with playback.
- Pre-warm `startListeningSession` (model load) so press → record latency stays low; transcription runs once at release.
- Keep capture duration bounded to avoid excessive memory/battery for very long holds.

## Future Enhancements

- Move Standard/Full tiers to a larger model (e.g. `small.en`) for better noise robustness.
- Evaluate offline neural TTS if voice quality becomes a requirement.
- Consider streaming/partial display only if a long-form dictation mode is added (separate from command push-to-talk).

## References

- [whisper.rn](https://github.com/mybigday/whisper.rn)
- [Whisper (OpenAI)](https://github.com/openai/whisper)
- [whisper.cpp](https://github.com/ggerganov/whisper.cpp)
- [Expo Speech](https://docs.expo.dev/versions/latest/sdk/speech/)
- [Expo AV](https://docs.expo.dev/versions/latest/sdk/audio-av/)
- [@fugood/react-native-audio-pcm-stream](https://www.npmjs.com/package/@fugood/react-native-audio-pcm-stream) (microphone PCM capture)
- [Vosk](https://alphacephei.com/vosk/)
- [sherpa-onnx](https://github.com/k2-fsa/sherpa-onnx)
