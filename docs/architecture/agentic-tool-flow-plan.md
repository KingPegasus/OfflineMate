# Agentic Tool Flow: Architecture Plan

**Status:** Proposal (reviewed and tightened)  
**Author:** Tech lead review (research-backed)  
**Date:** 2025-03  
**Context:** Move from plan-then-execute (keyword/planner → tool → response LLM) to an LLM-first, think-then-act flow for tools—especially web search—where the model decides whether to call tools and extracts better arguments.

---

## 1. Problem Statement

**Current flow:** Intent (keywords) → Planner (LLM or keyword fallback) → Execute tools → Response LLM (format only).

**Issues:**
- Tools run **before** any meaningful model-side decision for many requests.
- Search receives the **raw user message** as query (e.g. `"current date. Kindly check from the internet"`) instead of an optimized query (`"current date today"`).
- The model does not reliably decide *whether* search is needed; keywords do.
- UX feels mechanical and not agentic.

**Desired flow:** LLM decides whether a tool is needed → tool executes → LLM synthesizes answer.

---

## 2. Research Summary: ReAct vs Plan-and-Execute vs Hybrid

| Pattern | Flow | Strengths | Weaknesses |
|--------|------|-----------|------------|
| **ReAct** | Thought → Action → Observation (loop) | Adaptive, think-then-act, strong recovery | High token/latency cost, loop risk |
| **Plan-and-Execute (ReWOO)** | Plan (all steps) → Execute → Solver | Token-efficient, predictable, easy controls | Less adaptive to unexpected observations |
| **Hybrid** | Planned baseline + selective reactive steps | Better trade-off for mobile constraints | More orchestration complexity |

**Guidance for this app:**
- Use **ReAct-lite** for search-style requests where query optimization matters.
- Keep **plan-and-execute** for low-ambiguity device actions (alarm/reminder/calendar/contacts/notes).
- Add strict guardrails and fallback paths due to on-device constraints.

---

## 3. Constraints (OfflineMate)

- **ExecuTorch + react-native-executorch:** text-in/text-out only (no native function-call schema).
- **On-device primary path:** low memory, low latency, battery-sensitive.
- **Web search is networked:** this path is explicitly online and must remain user-toggleable.
- **Tier variance:** Lite may not follow strict action formats reliably; Standard/Full are better.
- **Existing architecture:** intent router + planner + executor + response LLM already in production.

---

## 4. Recommended Architecture: Tiered Hybrid

### 4.1 Search Intent: ReAct-lite (two-step decision + synthesis)

For `search.web`, use a two-LLM-step flow with **structured output** (JSON), not regex-first text tags:

1. **Decision step (LLM):**
   - Input: user message + policy + tool descriptors.
   - Output schema:
     ```json
     {
       "decision": "use_tool" | "answer_direct",
       "toolName": "search.web" | null,
       "query": "string | null",
       "answer": "string | null"
     }
     ```
   - Rules:
     - If `decision=use_tool`, require non-empty `query`.
     - If schema invalid, fallback to existing path.

2. **Execution step (tool):**
   - Run `search.web` with sanitized/trimmed query.
   - Keep strict arg allow-list.

3. **Synthesis step (LLM):**
   - Input: tool output + user question.
   - Output: concise final answer.

**Why this is better than `ACTION:/QUERY:` tags:**
- More robust parsing.
- Easier telemetry and failure classification.
- Clear contract for retries/fallback.

### 4.2 Other Tools: keep Plan-and-Execute

For alarm/reminder/calendar/contacts/notes:
- Keep planner + deterministic executor.
- These are low-ambiguity actions where cost/latency of full ReAct is not justified.
- Optional UX improvement: show planner progress as **planning status**, not full raw reasoning.

### 4.3 Future: bounded ReAct loop for multi-tool tasks

For requests like `"search X, then create reminder"`:
- Add bounded iterations (e.g. max 3–5).
- Maintain tool allow-list and strict schema per step.
- Full tier only initially.

### 4.4 Safety and policy guardrails (required)

- Treat web content as **untrusted data**, never as executable instructions.
- Never let tool output override system/developer policy.
- Cap tool payload length passed back to the LLM.
- Keep “web search enabled” user control as hard gate.
- Do not rely on showing raw chain-of-thought; expose concise planning/status text only.

---

## 5. Implementation Plan

### Phase 1 (Recommended): Search ReAct-lite behind flag

| Step | Task | Effort |
|------|------|--------|
| 1.1 | Add feature flag: `agenticSearchEnabled` (default off) | S |
| 1.2 | Implement decision prompt with strict JSON schema output | S |
| 1.3 | Add robust parser + schema validation; fallback to legacy flow on parse failure | S |
| 1.4 | Execute `search.web` with sanitized extracted query | S |
| 1.5 | Add synthesis prompt and final answer generation | S |
| 1.6 | Add telemetry: decision source, parse failures, extracted query length, fallback reason | S |

**Files to change:**
- `src/hooks/useLLMChat.ts` — route search path to agentic flow
- New `src/ai/agentic-search-flow.ts` — decision/execution/synthesis orchestration
- New `src/ai/tool-action-schema.ts` — schema validation/types
- `src/config/feature-flags.ts` — rollout toggle
- `src/tools/search-tool.ts` — optional: query normalization helper

### Phase 2: Hardening and UX

| Step | Task | Effort |
|------|------|--------|
| 2.1 | Add prompt-injection hardening text to synthesis prompt | S |
| 2.2 | Add user-visible status events: “Planning search…”, “Searching web…”, “Summarizing…” | S |
| 2.3 | Add golden tests for parse/fallback/safety | M |

### Phase 3: Multi-tool bounded ReAct (optional future)

| Step | Task | Effort |
|------|------|--------|
| 3.1 | ReAct loop runner with max iteration budget | M |
| 3.2 | Observation compression for large tool outputs | M |
| 3.3 | Tier gating and kill switch | S |

---

## 6. Rollout Plan

1. **Dev only**: flag on, compare extracted query vs legacy query.
2. **Internal dogfood**: Standard/Full only.
3. **5% rollout**: with automatic rollback on SLO breach.
4. **50%/100% rollout** after stability window.

**Rollback triggers:**
- parse failure rate > 5%
- search success drop > 10%
- p95 latency regression > 2x baseline

---

## 7. Decision Matrix

| Scenario | Pattern | Rationale |
|----------|---------|-----------|
| “What’s today’s date? Check internet.” | ReAct-lite search | LLM chooses search + better query |
| “Set alarm for 7am” | Plan-and-execute | Deterministic action path |
| “Search Tokyo population then remind me” | Future bounded ReAct | Multi-tool adaptive flow |
| “Explain photosynthesis” | Direct answer | No tool required |

---

## 8. Risks and Mitigations

| Risk | Mitigation |
|------|------------|
| Malformed decision output | JSON schema validation + deterministic fallback |
| Prompt injection via web snippets | Treat tool results as data; strict synthesis prompt; payload caps |
| Latency increase (extra LLM call) | Search-only scope; caching; rollout SLO gates |
| Lite tier format instability | Start Standard/Full only; Lite stays legacy path |
| Increased complexity | Feature flag + staged rollout + clear telemetry |

---

## 9. Success Metrics

- **Search quality:** hit rate for answerable search intents; improved success vs legacy raw query.
- **Query quality:** extracted-query quality score (manual spot checks + heuristic checks).
- **Reliability:** parse success rate, fallback rate, tool timeout rate.
- **Latency:** p50/p95 for search path relative to baseline.
- **UX:** user-rated “assistant thinks before acting” and reduced confusing outputs.

---

## 10. References

- [ReAct vs Plan-and-Execute (DEV)](https://dev.to/jamesli/react-vs-plan-and-execute-a-practical-comparison-of-llm-agent-patterns-4gh9)
- [ReWOO vs ReAct (Nutrient)](https://www.nutrient.io/blog/rewoo-vs-react-choosing-right-agent-architecture/)
- [TinyAgent: Function Calling at the Edge](https://arxiv.org/html/2409.00608v1)
- [Google FunctionGemma on-device](https://developers.googleblog.com/on-device-function-calling-in-google-ai-edge-gallery/)
- [Agent Patterns: ReAct](https://agent-patterns.readthedocs.io/en/stable/patterns/react.html)
- [Input and Tooling Flow](./input-and-tooling-flow.md) (current architecture)
