# RAG, Memory, and Vector Store Architecture

OfflineMate uses local retrieval to make responses context-aware without shipping user data to cloud APIs.

## Retrieval Architecture

```mermaid
graph TD
    dataSources[LocalDataSources_NotesCalendarDocs] --> chunking[ChunkingAndNormalization]
    chunking --> embeddingIndex[EmbeddingGeneration]
    embeddingIndex --> vectorStore[VectorStore_sqlite_vec]
    queryInput[UserQuery] --> queryEmbed[QueryEmbedding]
    queryEmbed --> similaritySearch[TopKSimilaritySearch]
    vectorStore --> similaritySearch
    similaritySearch --> promptContext[ContextForPrompt]
    promptContext --> llm[LocalLLMInference]
```

## Why This Was Chosen

- Context retrieval scales better than full-history prompt replay.
- SQLite-based vector search keeps storage local and operationally simple.
- A local-first pattern supports privacy and offline reliability.
- Incremental indexing supports evolving personal data over time.

## Memory Strategy

- Conversation memory:
  - sliding window for recent turns
- Long-term memory:
  - extracted facts persisted as indexed notes
- Preference memory:
  - structured settings and profile metadata

## Indexing and Retrieval Rules

- Chunk source documents into bounded token windows
- Store metadata with vectors (source type, timestamp, priority)
- Retrieve top-k chunks and apply relevance threshold
- Merge with short conversation memory before prompt build

## Data Boundaries and Safety

- Keep retrieval corpus local only
- Track source origin for each chunk
- Apply sanitization to retrieved text before prompt injection
- Add guardrails for prompt injection from user-authored notes

## References

- Expo SQLite: [https://docs.expo.dev/versions/latest/sdk/sqlite/](https://docs.expo.dev/versions/latest/sdk/sqlite/)
- sqlite-vec project: [https://github.com/asg017/sqlite-vec](https://github.com/asg017/sqlite-vec)
- React Native RAG docs: [https://software-mansion-labs.github.io/react-native-rag/](https://software-mansion-labs.github.io/react-native-rag/)
- RAG concept paper: [https://arxiv.org/abs/2005.11401](https://arxiv.org/abs/2005.11401)
