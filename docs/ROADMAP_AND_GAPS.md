# OfflineMate — Roadmap and Gaps

This document tracks current implementation status against product goals, plus prioritized remaining work.

## Goals

- Full offline operation for core assistant flows
- Privacy-first local storage and execution
- Broad device coverage through model tiers
- Production-ready local/EAS build workflow

---

## Current State vs Goals

### 1) Offline-first assistant

| Area | Status | Notes |
|------|--------|--------|
| LLM inference | ✅ Implemented | Tiered ExecuTorch runtime with init timeout and fallback tier logic. |
| Model download | ✅ Implemented | Tier asset download with aggregate progress for model/tokenizer/STT/embedding assets. |
| RAG embeddings | ✅ Implemented | `TextEmbeddingsModule + ALL_MINILM_L6_V2` integrated with lazy load + cache. |
| Vector search | ✅ Implemented | Native `sqlite-vec` KNN path (`vec0`, `MATCH`, `k`) with legacy cosine fallback path. |
| Context indexing | ✅ Implemented | Chunking with overlap; async background indexing to avoid blocking note flow. |
| Intent routing | ✅ Implemented | Context-first routing priority to reduce false tool triggers for memory/history prompts. |
| Agent planning | ✅ Implemented | LLM-driven JSON plan schema with validation + deterministic execution fallback. |
| Long-term memory injection | ✅ Implemented | Prompt builder now injects recent saved memory items. |

**Remaining gaps:** model-asset preflight checks before chat send; advanced parallel tool DAG execution; better source-diversity ranking.

---

### 2) Privacy-first local data

| Area | Status | Notes |
|------|--------|--------|
| Data locality | ✅ | Data remains on-device in SQLite / secure storage. |
| Settings persistence | ✅ | Zustand persist + secure-store with hydration-safe route gate. |
| Chat persistence | ⚠️ Partial | Chat store remains in-memory only. |
| Memory storage | ✅ | Important memory persisted and used in prompt context. |

**Remaining gaps:** optional persisted chat policy (retention limit, wipe controls).

---

### 3) Device coverage and resilience

| Area | Status | Notes |
|------|--------|--------|
| Tier mapping | ✅ | Lite/Standard/Full with fallback chain and recommendation logic. |
| Tier behavior | ✅ | Tier-aware context/topK budgets and routing behavior. |
| Runtime resilience | ✅ | Timeouts around init/tool/gen, plus fallback on failures. |
| Perf observability | ✅ | Perf smoke tests for embedding throughput, retrieval latency, planner validity. |

**Remaining gaps:** thermal adaptation and dynamic token budgets by device class.

---

### 4) Delivery pipeline and quality gates

| Area | Status | Notes |
|------|--------|--------|
| CI checks | ✅ | Typecheck, lint, unit/integration/e2e/perf test suites, security audit. |
| Test stack | ✅ | Vitest-based unit/integration/e2e/perf suites added. |
| Local Android build | ✅ | Release build verified, including wrapper recovery and fallback flow. |

**Remaining gaps:** richer device-level E2E (real emulator/device automation) and release sign-off checklist expansion.

---

## Completed in This Iteration

- Replaced placeholder embeddings with ExecuTorch text embeddings runtime and cache.
- Added sqlite-vec loading in DB path and `vec0` schema creation.
- Switched retrieval to native KNN with fallback to legacy cosine scan.
- Added chunked note indexing with overlap and async upsert pipeline.
- Implemented JSON-schema planner, validation, and deterministic plan executor.
- Integrated planner execution into `useLLMChat`.
- Added project-wide tests:
  - unit (`tests/unit/**`)
  - integration (`tests/integration/**`)
  - e2e smoke (`tests/e2e/**`)
  - perf smoke (`tests/perf/**`)
- Enforced these tests in CI workflow.

---

## Prioritized Remaining Roadmap

### Near term

1. Add model-asset readiness preflight before generation and route users to onboarding when assets are missing.
2. Add optional chat persistence with retention and manual clear controls.
3. Add source-diversity ranking and metadata filters in vector retrieval results.

### Mid term

4. Upgrade planner from serial execution to dependency-aware execution graph.
5. Add richer error telemetry (local traces + user-safe diagnostics panel).
6. Expand voice UX (explicit recording controls, better capture feedback).

### Longer term

7. Migrate LLM/embeddings off the deprecated `react-native-executorch/legacy` API before RNE 1.0.0. Then track LFM3, Gemma 4 E4B, and Qwen 3.5 4B ExecuTorch exports (Qwen 3.5 0.8B/2B are exported but legacy-only and slow at prefill; see [qwen35-compatibility-research.md](tech/qwen35-compatibility-research.md)).
8. Add robust device-level E2E automation on Android emulator/device farm.
9. Expand release engineering docs and app-store readiness checklist.

---

## Proposed: an ecosystem-independent assistant (calendar, email, reminders, maps)

A user suggestion (November 2026): an assistant that connects emails, calendars, reminders and maps the same way whether someone uses Apple, Google or other apps. Siri and Gemini each work best inside their own ecosystem, and someone on an iPhone with Gmail gets the gaps of both. In short:

- Find events in emails (meeting invitations, doctor's appointments) and add them to the calendar.
- Remind people before events, and before they need to leave.
- Show context when an event is opened: the meeting link (Zoom, Google Meet, Teams), directions and travel time, and other details from the invitation.
- Work with any calendar, reminders, email and maps app, not one ecosystem's.
- Use offline maps: travel time from downloaded map data, and navigation without a connection.

### What fits OfflineMate, and what doesn't

The principles stay: on the phone, no account, offline by default, and the user confirms before anything is added.

| Idea | Fits? | How |
|------|-------|-----|
| Find events in emails automatically | ⚠️ Not as asked | Phones don't let apps read the inbox. iOS has no API at all; on Android the only route is Gmail's API, a restricted scope that needs Google's paid yearly security assessment, a sign-in and internet. **Instead:** **Share → OfflineMate** from any mail app (Gmail, Outlook, Apple Mail…), message or screenshot, and open `.ics` invitation files with OfflineMate. The phone reads it and asks "Add *Dentist, Fri 3 PM, Main St Clinic*?". This works the same in every mail app, which is the ecosystem-independence the idea asks for. |
| Reminders before events | ✅ | Calendar alarms on the events OfflineMate adds (they ring even if the app is closed), and "remind me before my next meeting". |
| Meeting links | ✅ Offline | Find Zoom, Meet and Teams links in the shared text or in an event's location and notes; show a **Join** button and answer "when's my next meeting?" with the link. |
| Details from the invitation | ✅ | Keep the useful lines (address, what to bring, booking number) in the event's notes and show them with the event. |
| Any calendar app | ✅ Mostly already | `expo-calendar` reads and writes every calendar synced to the phone: Google, Outlook/Exchange, iCloud, Samsung. Add a choice of which calendar new events go to. |
| Any reminders app | 🟡 | iOS: Apple Reminders through EventKit (`expo-calendar` reminders). Android has no shared reminders store; Google Tasks needs its online API and a sign-in, so OfflineMate keeps its own phone notifications there. |
| Any maps app | ✅ Hand-off | **Directions** opens the user's maps app at the event's address (Google Maps, Apple Maps, or offline apps like Organic Maps and OsmAnd), with nothing sent by OfflineMate. |
| Travel time and "leave by" | 🟡 | Online: an optional routing service behind its own switch, like weather, sending only the two places. Offline: needs downloaded map data and a routing engine (see the offline maps row). Until then, a fixed "leave 30 minutes early" reminder. |
| Offline maps and navigation inside the app | ⚠️ Large | Means shipping OpenStreetMap region downloads (hundreds of MB per region), offline address lookup and a routing engine. Handing off to an offline maps app gets the same result for the user at a fraction of the work. |
| Work beside Siri and Gemini | 🟡 | iOS: App Intents / Shortcuts ("Ask OfflineMate…", "Add from clipboard"). Android: app shortcuts and the share target. Both need small native modules. |

### Phases

Sizes are rough, for one developer, including tests and checks on emulators and the iOS simulator.

| Phase | What | Size |
|-------|------|------|
| 0. Quick wins | A reminder on every event OfflineMate adds (calendar alarm, 30 minutes before by default). **Join** links and **Directions** (opens the maps app) in calendar answers. | ~3–5 days |
| 1. Share it to OfflineMate | Android share target and iOS share extension for text, images and `.ics` files; an event reader (rules for dates, times, places and links, the on-device model for the rest, photo models for screenshots); a confirm card that adds the event with its reminder, link and details; choose the target calendar. | ~2.5–3 weeks (iOS share extension ~1 week of that) |
| 2. Event details and leave-by | An Upcoming view with Join, Directions and saved details; Apple Reminders on iOS; leave-by reminders with a fixed buffer, plus optional online travel time behind a switch (privacy policy update). | ~1.5–2 weeks |
| 3. Works with Siri and shortcuts | iOS App Intents / Shortcuts and Android app shortcuts. | ~1–1.5 weeks |
| 4. Not recommended | Automatic inbox reading (Gmail API, yearly security assessment, still no iOS) and offline maps inside the app. Revisit only if users ask for them after phases 0–2. | Several weeks each |

**Easiest first:** the reminder on events OfflineMate adds. `createCalendarTool` (`src/tools/calendar-tool.ts`) already calls `Calendar.createEventAsync`; it needs an `alarms` entry and a sentence in the reply ("…with a reminder 30 minutes before"). About a day with tests.

---

## Summary

| Goal | Status |
|------|--------|
| Offline assistant quality | Strongly improved (semantic embeddings + native vector KNN + planner runtime) |
| Privacy-first behavior | Maintained (local storage/execution) |
| Multi-device coverage | Solid baseline with tier fallback and budgets |
| Release quality | Improved with CI + comprehensive automated tests |

This document is expected to be updated after each major implementation milestone.
