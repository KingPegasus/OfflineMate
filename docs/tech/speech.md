# Speech Pipeline Technical Details

OfflineMate speech mode is designed for local-first operation.

## STT (Speech-to-Text)

- Engine: `whisper.rn` (Whisper-based)
- Tier strategy:
  - Lite: small/tiny model for low resource usage
  - Standard/Full: larger model where feasible for better accuracy

## TTS (Text-to-Speech)

- Initial engine: `expo-speech` (Expo-native TTS)
- Reason:
  - avoids Gradle 9 incompatibilities from older Android TTS packages
  - Expo-first integration and easier EAS build compatibility
  - sufficient quality for MVP

## Why This Approach Was Chosen

- Keeps speech loop on-device
- Matches tier-based constraints
- Avoids delaying MVP on custom TTS engine integration

## Runtime Considerations

- Handle microphone permission flows explicitly
- Manage audio session interruptions
- Stream partial transcript where supported
- Keep latency budget low for conversational feel

## Future Enhancements

- Evaluate custom/offline neural TTS path if voice quality becomes a product requirement
- Add VAD and barge-in controls for natural turn-taking

## References

- whisper.rn repository: [https://github.com/mybigday/whisper.rn](https://github.com/mybigday/whisper.rn)
- Whisper project: [https://github.com/openai/whisper](https://github.com/openai/whisper)
- Expo Speech: [https://docs.expo.dev/versions/latest/sdk/speech/](https://docs.expo.dev/versions/latest/sdk/speech/)
- Expo AV/audio docs: [https://docs.expo.dev/versions/latest/sdk/audio-av/](https://docs.expo.dev/versions/latest/sdk/audio-av/)
