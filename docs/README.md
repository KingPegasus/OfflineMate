# OfflineMate Documentation

This directory contains implementation-ready documentation for architecture, deployment, and
technical decisions.

## Architecture

- `architecture/overview.md` — System topology and goals
- **`architecture/input-and-tooling-flow.md`** — **How processing is done**: step-by-step from user message to response (intent, RAG, tools, LLM, output)
- **`architecture/agentic-tool-flow-plan.md`** — **Plan:** ReAct-lite for search (LLM thinks → decides tool + query → executes → responds), hybrid with plan-and-execute for other tools
- `architecture/expo-decision.md`
- `architecture/model-and-capability-tiers.md`
- **`architecture/model-comparison-and-selection.md`** — Model options per tier, pros, and tier-wise selection
- `architecture/rag-memory-and-vector-store.md`

## Deployment

- `deployment/expo-build-and-release.md`
- `deployment/android-release-playstore.md`
- `deployment/ota-updates.md`
- `deployment/ci-cd-pipeline.md`
- `deployment/android-preview-device-qa-checklist.md`

## Technical Details

- **`tech/processing-pipeline-in-depth.md`** — **Single in-depth technical doc:** audio→text (STT tech and parameters), how context is saved and retrieved, embeddings and vector-space math, vector search (what it is, where used, how it works), RAG (where it fits and science), planner LLM, validation, and execution. Read this for a full technical understanding of the pipeline.
- `tech/stack.md`
- `tech/models.md`
- **`tech/qwen35-compatibility-research.md`** — Qwen 3.5 ExecuTorch/mobile compatibility research
- `tech/rag.md`
- `tech/speech.md`
- `tech/vector-store.md`
- `tech/embeddings-and-indexing.md`
- `tech/agent-planning-and-execution.md`

## Development

- **`pre-commit.md`** — Git **pre-commit** hook (Husky): runs `typecheck`, `lint`, tests, and `npm audit` like [CI](../.github/workflows/ci.yml)

## Planning and Analysis

- `ROADMAP_AND_GAPS.md` — Feature status vs goals, gaps, and prioritized roadmap
- `TECHNICAL_ANALYSIS.md` — Technical review and improvement suggestions

## How to Use This Docs Set

- Start with **architecture overview** for system topology and on-device constraints (privacy, memory, battery).
- Review **model tiering**, **model comparison and selection**, and **input/tooling flow** for how requests are routed and executed.
- Use **deployment** docs for EAS builds, release, OTA, and CI/CD.
- Use **tech** docs for runtime and algorithm details: stack (Expo SDK 55, ExecuTorch, sqlite-vec), models (quantization, delegation), RAG (chunking, retrieval), speech (STT/TTS, VAD, RealtimeTranscriber), vector store (vec0, KNN), embeddings, and agent planning (plan-and-execute, ReWOO).

Each tech doc includes references to official docs, papers, and best-practice articles where applicable.
