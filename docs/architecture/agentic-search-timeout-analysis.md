# Agentic Search Timeout: Root Cause Analysis

**Author:** Senior tech lead-style forensic analysis  
**Date:** 2026-03  
**Context:** Agentic search decision step frequently times out (~20–45s) or returns `invalid_decision_schema`. Reducing the timeout is a band-aid, not a fix. This doc dissects the logs and code to identify root causes.

---

## 1. Log Timeline (from user sessions)

```
12:00:41.511  Agentic search start
12:01:26.569  Agentic search fallback: "Agentic search decision timed out."   [~45s later]
12:01:26.716  Agentic direct-search fallback used
12:01:26.750  Synthesis failed, using tool result: "The model is currently generating..."
12:01:26.751  Tool reply: rawLen=0, cleanedLen=48, cleanedPreview='Today is Saturday...'
```

**Observations:**
- Decision step runs for the full timeout window (was 45s, now 20s) before we give up.
- Immediately after timeout, synthesis fails with "model is currently generating" — **the native layer rejects a new generate() because the previous (interrupted) run has not fully released**.
- The tool result is correct; we fall back to it. But the user waited 45+ seconds.

---

## 2. Two Distinct Failure Modes

| Failure | Log line | Meaning |
|--------|----------|---------|
| **Timeout** | `Agentic search fallback: ... timed out` | `llm.generate()` did not resolve within the timeout. We call `interrupt()` and reject. |
| **Invalid schema** | `Agentic search not used: ... invalid_decision_schema` | `llm.generate()` resolved, but `parseToolActionDecision` (and lenient fallback) returned null. Output was not usable JSON. |

Both lead to fallback (direct search or planner). The timeout path also causes the synthesis failure below.

---

## 3. Root Cause Hypotheses

### 3.1 Model outputs much more than a short JSON (primary)

The decision prompt says: *"Return ONLY a single JSON object. Do NOT include <think> tags, markdown, backticks, explanations."*

On-device models (Qwen 3 1.7B, Standard tier) often ignore such constraints:

- They may emit `<think>...reasoning...</think>` before the JSON.
- They may emit a long preamble or explanation.
- They may wrap JSON in markdown (` ```json ... ``` `) — our parser handles this, but more tokens = more time.
- Small models are less reliable at strict format adherence.

**Token math (rough):**
- Ideal output: ~80 tokens (single JSON line).
- Realistic with preamble: 200–400+ tokens.
- Standard tier: `outputTokenBatchSize: 10`, `batchTimeInterval: 30` — batching only affects callback frequency; real generation speed on mobile is often 5–15 tok/s for 1.7B.
- 300 tokens ÷ 10 tok/s ≈ **30 seconds**. 400+ tokens can exceed 45 seconds.

**Conclusion:** The model is likely producing far more than the requested “single JSON object,” which stretches generation beyond the timeout.

---

### 3.2 Interrupt leaves native layer in a busy state (secondary)

When the timeout fires:

1. We call `llmEngine.interrupt()`.
2. We reject the promise with "Agentic search decision timed out."
3. We immediately run direct search (fast, async).
4. We then call `llm.generate()` again for synthesis.

The native `generate()` may reject with "The model is currently generating. Please wait until previous model run is complete." That message is consistent with the native module enforcing a single active generation. When we `interrupt()`, the native layer may:

- Abort the current run asynchronously.
- Take some time to clear the “generating” flag.
- Reject any new `generate()` until the previous run is fully cleaned up.

We do not wait for that cleanup before starting synthesis. So we hit a **race**: we fire synthesis before the interrupted run has released the lock.

---

### 3.3 No max-tokens cap on the decision step

`llm-engine.ts` passes messages to `this.llm.generate(mapped)` with no `maxTokens` or `maxNewTokens`. The model can generate until it hits a stop condition (EOS, end of turn, etc.). For a format-heavy request, the model may keep going for a long time before producing valid JSON or stopping.

**Conclusion:** We never tell the model “produce at most N tokens” for the decision step, so long outputs directly cause timeouts.

---

### 3.4 Cold start and tier behavior

- First generation after load can be slower (warm-up).
- Standard tier (Qwen 3 1.7B) on mid-range devices may be slower than documented “best case” speeds.
- Memory pressure or thermal throttling can reduce throughput mid-generation.

---

## 4. Why `invalid_decision_schema` happens (when no timeout)

When the model *does* finish in time, we sometimes see `invalid_decision_schema`:

- Output is not valid JSON (e.g., text before/after, truncated brace).
- Output uses placeholders like `"use_tool|answer_direct"` or `"search.web|null"`.
- Output is natural language that lenient parser does not accept (e.g., `looksStructured` blocks direct-answer path).
- Output is empty or whitespace.

So we have both **slow generation** (timeout) and **wrong format** (invalid schema) as failure modes.

---

## 5. Recommended Fixes (long-term, not shortcuts)

**Design principle:** Preserve the agentic flow—LLM thinks, decides, acts, synthesizes. Avoid bypasses that skip the decision step; they undermine the architecture goal of "model thinks before acting."

### 5.1 Add `maxTokens` / `maxNewTokens` for the decision step (highest impact)

Cap the decision output so the model cannot produce 400+ tokens. Example: `maxNewTokens: 150` for the decision call. If the library supports it, pass this in the generation config for that call only. This addresses the root cause (runaway token generation) without shortcutting the flow.

---

### 5.2 Strengthen the decision prompt for brevity

- Add explicit: "Output at most 2–3 lines. No preamble, no explanation."
- Add a "bad" example: "Wrong: <think>I will use search...</think>` {\"decision\":...}`"
- Consider asking for a minimal format, e.g. `ACTION:search.web\nQUERY:...` which the lenient parser already supports. Smaller models often follow simpler formats better.

---

### 5.3 Wait for native cleanup after interrupt before next `generate()`

Before calling synthesis `generate()` after a timeout + interrupt:

- Add a short delay (e.g., 500 ms), or
- Poll / wait until the native layer signals “idle,” or
- Retry synthesis on “model currently generating” with backoff.

This avoids the immediate synthesis failure when the engine is still cleaning up.

---

### 5.4 Consider disabling agentic search for Lite tier

Lite models are weaker at structured output. Keeping agentic only for Standard/Full reduces timeout and parse-failure rates.

---

### 5.5 Avoid shortcuts (e.g. pattern-based bypass)

**Not recommended:** Short-circuiting agentic flow for "date/time" queries by pattern-matching and running search directly. That is a shortcut—it skips the LLM decision and undermines long-term, think-then-act behavior. Local date handling inside `search.web` (when the tool *is* called) remains useful; bypassing the decision step entirely does not.

---

## 6. Summary

| Root cause | Mechanism | Fix |
|------------|------------|-----|
| Model emits long output | Preamble, reasoning, markdown before JSON | maxNewTokens, stronger prompt |
| Interrupt → busy native | New generate() called before previous run released | Delay or retry before synthesis after timeout |
| No token cap | Model can generate indefinitely | Add maxNewTokens for decision step |
| Weak format adherence | Placeholders, wrong structure | Prompt improvements, simpler format (ACTION/QUERY) |

Reducing the timeout shortens the worst-case wait but does not fix why the decision step is slow or why synthesis fails right after. The above changes address the underlying causes.
