# Agent Planning and Execution (Technical)

This document describes the implemented planner-executor path for tool and multi-step requests.

## Design Goals

- keep tool execution deterministic
- use LLM planning only where it adds value
- validate plan output before executing any tool
- preserve fallback behavior when planner output is invalid

## Planner Model Contract

Planner receives:

- user prompt
- available tools (name/description/params)
- JSON-only response instruction

Planner returns JSON with:

- `steps[]`
  - `id`
  - `description`
  - `toolName` (optional)
  - `args` (optional)
  - `dependsOn` (optional)

## Validation Layer

Before execution:

- parse fenced/raw JSON
- validate structure and max step count
- validate `toolName` against allow-listed registry
- sanitize step args to primitive string values

If invalid:

- fallback deterministic plan is generated from keyword tool selection

## Execution Layer

- serial deterministic executor runs tool steps in order
- each tool call uses timeout guardrails from chat hook
- execution result is summarized and appended to prompt context
- plan summary is also appended for transparency/debuggability

## Chat Integration

Planner path triggers for:

- tool intent
- full-tier multi-step phrasing (e.g. chained actions)

Flow:

1. plan generation
2. schema validation/fallback
3. tool execution
4. prompt build with tool summary + plan summary
5. final assistant generation

## Safety and Reliability

- strict allow-list tool registry
- schema validation before any tool run
- execution timeout per tool call
- fallback direct-tool behavior when planner generation fails

## Future Enhancements

- dependency-aware DAG execution instead of serial-only execution
- richer arg schemas and coercion rules
- confidence scoring and step-level retries
- per-tool policy gating and dry-run mode

## Relation to Plan-and-Execute and ReWOO

- **Plan-and-execute:** The pipeline separates planning (LLM produces a structured plan) from execution (deterministic tool runner). This avoids interleaving tool calls with repeated LLM rounds and keeps execution predictable.
- **ReWOO (Reasoning WithOut Observation):** ReWOO-style agents decouple reasoning from tool observations: the model emits a full plan (with placeholders for tool results), then the executor runs tools and fills placeholders, and a final step integrates results. Our planner produces a step list with `toolName` and `args`; the executor runs steps serially and passes results into the prompt for the final answer. This can use significantly fewer tokens than ReAct-style (observe–act–observe) loops and can be faster for multi-step workflows.
- **When to use:** Plan-and-execute fits multi-tool, multi-step requests with relatively predictable dependencies. For highly dynamic or exploratory tasks, iterative (ReAct-style) flows may be more appropriate; our fallback to direct tool selection when planning fails keeps the app usable.

## References

- [Plan-and-Execute Agents (LangChain)](https://blog.langchain.com/planning-agents)
- [ReWOO (arxiv)](https://arxiv.org/abs/2305.18323)
- [ReWOO Agent Pattern (agent-patterns)](https://agent-patterns.readthedocs.io/en/stable/patterns/rewoo.html)
- [IBM: What is ReWOO?](https://www.ibm.com/think/topics/rewoo)
