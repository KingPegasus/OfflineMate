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

## References

- [Plan-and-Execute Agent Pattern](https://blog.langchain.com/planning-agents)
- [ReWOO Planning Concept](https://arxiv.org/abs/2305.18323)
