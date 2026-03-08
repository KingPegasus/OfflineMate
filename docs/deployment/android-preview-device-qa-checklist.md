# Android Preview Device QA Checklist

Use this checklist after installing the Android preview artifact from EAS.
Run at least one device in each tier class: Lite, Standard, Full.

## Build Metadata

- Build ID:
- Build profile: `preview`
- Commit SHA:
- Tester:
- Device model:
- Android version:

## Install and Startup

- App installs successfully
- First launch completes without crash
- Onboarding appears and recommends a tier
- Tier override is possible from onboarding and settings

## Model Download

- Download starts successfully
- Aggregate progress updates correctly
- Current asset label changes per file
- App handles background/foreground during download
- Download resume works after interrupted network

## Chat and LLM

- Send text prompt and receive response
- Streaming response appears in UI
- OOM fallback behavior triggers gracefully (if forced on weak device)
- App continues working after fallback tier switch

## Voice

- Microphone permission prompt is shown and handled
- Voice capture runs and transcript is appended to input
- STT model-missing message is user-readable
- Voice reply toggle in settings controls TTS output

## Tools

- Calendar permissions and read flow work
- Contacts permissions and search flow work
- Notes create/search flow works
- Reminder scheduling works and notification is delivered

## RAG and Memory

- Notes are saved and appear in list
- Saved notes become retrievable context in follow-up questions
- "remember ..." prompts persist to long-term memory table

## Reliability

- Backgrounding unloads model cleanly
- Relaunch after backgrounding resumes without crash
- Low storage and low memory conditions handled gracefully

## Security and Privacy

- No sensitive user text in logs
- No network calls with user prompt content during normal offline flow
- Permission usage matches declared app behavior

## Sign-off

- QA pass/fail:
- Blocking issues:
- Recommended release decision:

