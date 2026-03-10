# Processing Pipeline: Technical Deep Dive

This document describes, in one place, how OfflineMate processes user input end-to-end: the technology, algorithms, parameters, and where each piece fits. It covers speech-to-text, context storage and retrieval, the math behind vector search, RAG, the planner LLM, validation, and execution.

---

## 1. Audio to Text (Speech-to-Text, STT)

### Technology

- **Library:** `whisper.rn` — React Native bindings to **whisper.cpp** (C++ port of OpenAI’s Whisper).
- **Model:** Encoder–decoder transformer. Audio (e.g. 16 kHz mono) is chunked into frames, encoded, then decoded to token IDs and converted to text.
- **Variants:** App uses `whisper-tiny.en.bin` (Lite tier) or `whisper-base.en.bin` (Standard/Full). Both are English-only (`.en`); smaller = faster, larger = better accuracy.

### Flow in the app

1. User **press-and-holds** the mic button → `startListeningSession(modelSize)` runs.
2. **Permission:** On Android, `RECORD_AUDIO` is requested at runtime; without it the native session fails.
3. **Load contexts:** `initWhisper({ filePath, isBundleAsset: false, useGpu })` loads the Whisper model. App also tries `initWhisperVad({ filePath: ggml-silero-v6.2.0.bin, ... })` for VAD.
4. **Start transcriber:** `new RealtimeTranscriber({ whisperContext, vadContext, audioStream })` with `AudioPcmStreamAdapter`, then `transcriber.start()`.
5. **Callbacks:** JS receives `onTranscribe` events (`data.result`) and merges partials with a non-regression merge strategy.
6. User **releases** the button → `transcriber.stop()` is called; we wait for final/quiet settle, then release transcriber + contexts and return normalized transcript.

### Parameters (and how to tune)

| Parameter | Where | Effect |
|-----------|--------|--------|
| **language** | `transcribeOptions.language` | Restricts decoding to English; improves accuracy for English-only models. |
| **temperature / bestOf / beamSize** | `transcribeOptions` | Accuracy-focused decode controls for short commands; lower temperature reduces random substitutions. |
| **audioSliceSec** | `RealtimeOptions.audioSliceSec` | Slice duration before transcription chunking (we use 8s). |
| **audioMinSec** | `RealtimeOptions.audioMinSec` | Minimum audio before processing starts (we use 1s). |
| **vadPreset** | `RealtimeOptions.vadPreset` | VAD tuning preset (`default` baseline). |
| **autoSliceOnSpeechEnd** | `RealtimeOptions.autoSliceOnSpeechEnd` | Ends slices based on speech-end events for better turn boundaries. |
| **useGpu** | `initWhisper({ useGpu })` | We set `false` on Android (CPU-only stability), allow GPU on iOS. |
| **model paths** | `initWhisper` / `initWhisperVad` | Whisper: `whisper-tiny.en.bin` / `whisper-base.en.bin`; VAD: `ggml-silero-v6.2.0.bin`. |

Optimization tips: For clearer speech, use `base` when device allows. If you see `[BLANK_AUDIO]` often, ensure the mic is active and verify VAD model availability; if VAD fails to initialize, the app continues without VAD but segmentation quality can drop.

**Voice misrecognition:** STT can mishear words (e.g. “Set reminder” → “certain minder”, “5 minutes” → “fear”). For precise commands like reminders with times, typing in chat is more reliable. The reminder tool returns a hint when it cannot parse a time, suggesting the user repeat clearly or type.

---

## 2. Context: How It Is Saved and Retrieved

### Saving (indexing)

- **Source:** Notes (title + content) are the current indexed source. When a note is created or updated, `indexNoteForRetrieval(noteId, title, content)` is called.
- **Chunking:** Text is split into **chunks** so that:
  - Each chunk has a bounded size (so embeddings are over coherent phrases).
  - Chunks overlap so that a sentence split at a boundary still appears in full in an adjacent chunk.

**Chunking algorithm** (`context-indexer.ts`):

- `CHUNK_SIZE = 420` characters, `CHUNK_OVERLAP = 80`.
- Input is normalized (collapse whitespace, trim).
- If length ≤ 420, one chunk. Otherwise:
  - Take slices `[cursor, cursor + 420]`.
  - Advance cursor by `420 - 80 = 340` so the next chunk overlaps by 80 characters with the previous.
- Each chunk is sent to **upsertVectorChunk(sourceType, sourceId, textChunk, chunkOrder)**.

**Upsert (vector-store.ts):**

1. **Embed** the chunk: `generateEmbedding(textChunk)` → 384-dimensional vector (see §3).
2. **Legacy table `vectors`:** Row with `id`, `source_type`, `source_id`, `chunk_order`, `text_chunk`, `embedding` (JSON array). Used for fallback search.
3. **Vec0 table `vectors_idx`:** If sqlite-vec is loaded, a row with `chunk_id`, `source_type`, `source_id`, `chunk_order`, `embedding` (float[384]), `text_chunk`. Used for fast KNN (see §4).

So “context” is stored as **text chunks + their vector embeddings** in SQLite; retrieval is by vector similarity.

### Retrieval (at query time)

- Used when **intent = context** (e.g. “what did I say about X”, “summarize my notes”).
- **RAG pipeline** (`rag-pipeline.ts`): `retrieveContextForQuery(query, tier)`:
  - **topK:** 6 (Standard) or 10 (Full); we request `topK * 2` from the vector store and then dedupe.
  - **minSimilarity:** 0.42 (Standard) or 0.38 (Full). Chunks with similarity below this are dropped.
- **Vector store** returns a list of text snippets; they are deduplicated (normalize text, skip duplicates), then trimmed to topK and passed to the **prompt builder** as context for the main LLM.

So “getting context” = embed the query → vector search → filter by similarity → dedupe → top-k snippets → inject into the prompt.

---

## 3. Embeddings and the Vector Space (Math / Science)

### What an embedding is

- An **embedding** is a fixed-size vector (list of numbers) that represents the *meaning* of a text in a continuous space.
- Same or similar meanings map to nearby points; unrelated meanings map to distant points. So we can use **distance** in this space as a proxy for **semantic similarity**.

### Model and dimensions

- **Model:** `ALL_MINILM_L6_V2` via ExecuTorch `TextEmbeddingsModule` (sentence-transformers style).
- **Dimension:** 384. Every chunk and every query is mapped to a vector in **R^384**.

### How similarity is measured

- We use **cosine similarity** (or equivalently cosine distance).
- For vectors **a**, **b**:
  - **Cosine similarity** = (a · b) / (‖a‖ ‖b‖). Range [-1, 1]; 1 = same direction (most similar), 0 = orthogonal.
  - **Cosine distance** = 1 - similarity. Range [0, 2]; 0 = identical. sqlite-vec uses a cosine distance metric; we compare `score = 1 - distance` to `minSimilarity`.

So “context retrieval” is: map query and all stored chunks to R^384, find chunks whose vectors are closest to the query (smallest cosine distance), and keep those above a similarity threshold.

### Implementation details

- **Normalization:** Input text is trimmed, whitespace collapsed, and truncated to 1024 characters before embedding.
- **Cache:** Up to 256 recent (normalized text → embedding) pairs are cached in memory to avoid re-embedding the same query or repeated chunks.
- **Fallback:** If the embedding model fails to load, a deterministic hash-based 384-d vector is used so the app still runs (retrieval quality degrades).

---

## 4. Vector Search: What It Is, Where It’s Used, How It Works

### What vector search is

- **Vector search** (or similarity search) means: given a **query vector** and a set of **stored vectors**, return the **k** stored vectors that are **closest** to the query under some distance (here, cosine distance).
- So we are solving a **k-nearest neighbors (KNN)** problem in R^384.

### Where it’s used in the flow

- **After** the user message is classified as **context** intent.
- **Before** the main LLM: the query is embedded, vector search returns the top-k chunk texts, and those snippets are added to the prompt. So the LLM is “grounded” in retrieved context — that’s the RAG part (see §5).

### How it works in code

**Primary path (sqlite-vec):**

- **vec0** is a virtual table in SQLite with a column of type `FLOAT[384]` and `distance_metric=cosine`.
- Query: `SELECT text_chunk, distance FROM vectors_idx WHERE embedding MATCH ? AND k = ? ORDER BY distance ASC`.
- `?` is the query vector in the format sqlite-vec expects; `k` is the number of neighbors (we request a bit more than topK for post-filtering).
- The extension returns rows with `distance` (cosine distance). We convert to **score = 1 - distance** and filter by `score >= minSimilarity`, then take the first topK.

**Fallback path (no sqlite-vec):**

- Read up to 2000 rows from the legacy `vectors` table (embedding stored as JSON).
- In JS: for each row, compute **cosine similarity** between query embedding and row embedding; filter by `minSimilarity`, sort by score descending, take topK. So the same math, just in application code.

### Why it’s needed

- Without vector search we’d have to scan all text (or use keyword search). Keyword search misses paraphrases and similar meaning. Embeddings + vector search let us find “what the user meant” by **semantic** proximity, which is exactly what we need for “retrieve relevant notes/memory” before the LLM answers.

---

## 5. RAG: Where It Fits and the Science Behind It

### What RAG is

- **Retrieval-Augmented Generation:** Before the language model generates an answer, we **retrieve** relevant documents (here: chunks of notes) and **inject** them into the prompt. The model is asked to answer **using** that context, which reduces hallucination and ties answers to the user’s actual data.

### Where RAG fits in our flow

- **Trigger:** Intent = **context** (e.g. “what did I write about project X?”, “summarize my notes”).
- **Steps:**
  1. User query → **embed** (same 384-d model).
  2. **Vector search** (KNN) on stored chunk embeddings → top-k snippets with score ≥ minSimilarity.
  3. Snippets are **deduplicated** and trimmed to topK.
  4. **Prompt builder** adds these snippets to the system/user context (e.g. “Relevant context: …”).
  5. **Main LLM** generates a response conditioned on that context.

So RAG = “retrieve by vector search” + “augment the prompt with retrieved text” + “generate.” No separate “RAG box”; RAG is this context path plus the prompt construction.

### Science / benefits

- **Grounding:** The model has explicit text to cite or paraphrase, so it’s less likely to invent facts.
- **Efficiency:** We don’t feed all notes into the prompt; we only feed the **retrieved** chunks, which keeps prompt size and cost bounded.
- **Semantic match:** Embeddings capture meaning, so “meeting with John” can match “discussion with John” even without shared keywords.

---

## 6. Planner LLM: How It Works

### Role

- When the user intent is **tool** (or multi-step on Full tier), we don’t call tools blindly: we first ask a **planner** LLM to output a **plan** — a list of steps, each with an optional tool name and arguments. That plan is then **validated** and **executed** by deterministic code.

### Input to the planner

- **Messages** (see `buildPlannerMessages` in `agent-planner.ts`):
  1. **System:** Instructions to return *only* valid JSON with shape  
     `{"steps":[{"id":"1","description":"...","toolName":"...","args":{...},"dependsOn":["1"]}]}`, up to 4 steps, toolNames only from the provided list, minimal args.
  2. **System:** “Available tools” — JSON of tool descriptors (name, description, params) from `listToolDescriptors()`.
  3. **User:** The user’s prompt (e.g. “Remind me in 10 minutes to drink water”).

- Same LLM runtime as the main chat (ExecuTorch); we just call `generate(plannerMessages)` with no tool result or long conversation.

### Output

- Free-form text that we expect to **contain** a JSON object with a **steps** array. Each step can have:
  - **id:** string (e.g. "1", "2").
  - **description:** short human-readable description.
  - **toolName:** string matching a tool in the registry (e.g. `reminders.set`).
  - **args:** object of string (or number/boolean coerced to string) arguments for that tool.
  - **dependsOn:** optional array of step ids (currently not used for execution order; steps are run serially).

### Parameters

- **maxSteps:** From chat hook: 2 for Standard, 4 for Full. Planner is told “up to 4 steps”; we cap at 6 internally.
- **Timeout:** 20 s for the planner call; on timeout we interrupt and fall back to a deterministic single-tool plan.

---

## 7. Validation: How the Plan Is Checked

### Parse

- **parsePlanPayload(raw):**  
  - Look for a fenced JSON block (e.g. ```json ... ```); if not found, use the whole string.  
  - Find the first `{` and last `}`; extract that substring and `JSON.parse` it.  
  - Expect an object with a **steps** property that is an array. If parsing fails or no steps, return null.

### Validate

- **validatePlan(payload, maxSteps):**  
  - If payload is null or `payload.steps` is not an array, return `[]`.  
  - For each element of `payload.steps` (up to maxSteps):
    - **toolName:** If present, must be a string and must exist in the **tool registry** (`getToolByName(toolName)`). If the tool is unknown, that step is **skipped** (not added to the valid list).
    - **description:** If missing or empty, use a default like “Step i”.
    - **id:** Must be string; else use index+1.
    - **args:** **sanitizeArgs(args)** — only keys whose values are string, number, or boolean are kept; values are coerced to string. So no nested objects or arrays in args.
    - **dependsOn:** If present, must be an array of strings; otherwise dropped.
  - Result: array of **PlannedStep** objects, each with a known toolName (or no toolName for “answer directly” steps).

### Fallback

- If the planner returns invalid JSON, or validation yields zero steps, we call **fallbackPlanFromPrompt(prompt)**:
  - **selectToolFromInput(prompt)** picks one tool by keyword match from the registry.
  - If none: one step with no toolName (description “Answer directly using available context”).
  - Else: one step with that tool’s name and `args: { query: prompt, text: prompt }`, plus a second step “Compose a concise response from tool output.”

So validation ensures we only execute **allow-listed** tools with **sanitized** arguments; the planner can’t inject arbitrary tool names or complex args.

---

## 8. Execution: How Tools Are Run

### Entry point

- **executePlanSteps(steps, executeTool)** in `agent-planner.ts`.  
- `executeTool` is a callback provided by the chat hook: `(toolName, args) => Promise<string>`.

### Algorithm

1. **planSummary:** Concatenate each step’s `description` with “ -> ” (for logging and for inclusion in the prompt).
2. For each **step** in order:
   - If the step has no **toolName**, skip (no tool to run).
   - Otherwise call **executeTool(step.toolName, step.args ?? {})**.
   - The chat hook resolves **getToolByName(toolName)** and runs **tool.execute({ query, text, ...args })** with a 15 s timeout. The returned string is the tool’s message (e.g. “Reminder scheduled.”).
3. Collect each result as `"toolName: message"` and join with newlines → **toolSummary**.
4. Return **{ toolSummary, planSummary }**.

### Tool registry and execution

- **Registry:** `TOOL_REGISTRY` is a fixed array of tools. Each tool has `name`, `description`, `keywords`, optional `params`, and **execute(params)** returning `Promise<{ ok, message }>`.
- **Lookup:** `getToolByName(name)` returns the tool with that `name` (e.g. `reminders.set`). If the planner outputs an unknown name, that step was already dropped in validation.
- **Invocation:** The hook passes `{ query: cleanedUserMessage, text: cleanedUserMessage, ...args }` so tools can use either the raw user text or the planner’s args; tools like reminders use both (e.g. parse “in 10 minutes” from query and use `args.text` if provided).

So execution is **sequential**, **deterministic** (no LLM in the loop), and **time-bounded** per tool. The result is then fed back into the prompt so the main LLM can say “I’ve set your reminder” instead of outputting raw JSON.

---

## 9. End-to-End Flow Summary

| Stage | What happens | Where (conceptually) |
|-------|----------------------|----------------------|
| Input | Text or voice (STT) → one user message | Chat UI, STT engine |
| Intent | Keyword-based: tool vs context vs direct | intent-router |
| Context path | Embed query → vector search → top-k chunks → prompt | RAG pipeline, vector-store, embeddings |
| Tool path | Planner LLM → JSON plan → validate → execute tools → tool summary → prompt | agent-planner, tool registry |
| Prompt | System + history + context snippets + tool result → messages | prompt-builder |
| Main LLM | ExecuTorch generate, stream, <think> parse, cleanup, repetition guard | llm-engine, useLLMChat |
| Output | Final text → chat store, optional TTS | Chat UI, TTS engine |

All of this runs on-device: STT (Whisper), embeddings (ExecuTorch), vector search (SQLite + sqlite-vec), planner and main LLM (ExecuTorch), and tools (Expo modules). No user content is sent to the cloud for processing.

---

## References

- Whisper: [https://github.com/openai/whisper](https://github.com/openai/whisper)  
- whisper.cpp: [https://github.com/ggerganov/whisper.cpp](https://github.com/ggerganov/whisper.cpp)  
- whisper.rn: [https://github.com/mybigday/whisper.rn](https://github.com/mybigday/whisper.rn)  
- RAG (Lewis et al.): [https://arxiv.org/abs/2005.11401](https://arxiv.org/abs/2005.11401)  
- Sentence-BERT / MiniLM: [https://www.sbert.net/](https://www.sbert.net/)  
- sqlite-vec: [https://github.com/asg017/sqlite-vec](https://github.com/asg017/sqlite-vec)  
- React Native ExecuTorch (LLM + embeddings): [https://docs.swmansion.com/react-native-executorch/docs](https://docs.swmansion.com/react-native-executorch/docs)
