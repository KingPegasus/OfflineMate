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

7. Qwen 3.5 tier migration once stable mobile exports are available.
8. Add robust device-level E2E automation on Android emulator/device farm.
9. Expand release engineering docs and app-store readiness checklist.

---

## Summary

| Goal | Status |
|------|--------|
| Offline assistant quality | Strongly improved (semantic embeddings + native vector KNN + planner runtime) |
| Privacy-first behavior | Maintained (local storage/execution) |
| Multi-device coverage | Solid baseline with tier fallback and budgets |
| Release quality | Improved with CI + comprehensive automated tests |

This document is expected to be updated after each major implementation milestone.
