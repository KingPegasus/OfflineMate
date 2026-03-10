# RAG Technical Details

This document specifies the local retrieval-augmented generation implementation details.

## Pipeline

1. Collect local sources (notes, calendar metadata, selected files)
2. Normalize and chunk text
3. Generate embeddings (ExecuTorch TextEmbeddingsModule, ALL_MINILM_L6_V2)
4. Persist vectors and metadata in SQLite via sqlite-vec
5. At query time, embed user query and perform top-k KNN retrieval
6. Build prompt with retrieved context and run local inference

## Chunking Strategy

- **Size:** Target 200–500 tokens per chunk (or 256–512 for a balance of context and precision). Smaller chunks improve recall but may lack context; larger chunks can dilute relevance.
- **Overlap:** Use 10–20% overlap between consecutive chunks to avoid losing information at boundaries.
- **Semantic boundaries:** Prefer splitting at natural boundaries (paragraphs, sentences) where possible; semantic chunking can improve retrieval precision over fixed character counts.
- **Metadata per chunk:** source type, source ID, chunk_order, timestamp; used for deduplication and provenance.

## Retrieval Policy

- **Top-k** retrieval with optional score threshold
- **Ranking:** Distance-based (e.g. L2/cosine) from sqlite-vec; recency and source diversity can be merged in application layer
- **Context budget:** Enforce total context size per model tier to stay within prompt limits and latency

## Best Practices (from RAG literature)

- **Embedding model:** Task-appropriate sentence embeddings (e.g. MiniLM, SBERT) are used; dimension must match index (384 for ALL_MINILM_L6_V2).
- **Re-embed on model change:** If the embedding model is upgraded, reindex all content; dimensions and norms may differ.
- **Hybrid search:** For production RAG, combining vector search with keyword/BM25 can improve exact match and tail recall; current implementation is vector-only.
- **Monitoring:** Track retrieval latency, result count, and (if applicable) recall/quality; tune k and thresholds accordingly.

## Why This Design Was Chosen

- Improves contextual accuracy without cloud storage or external vector DBs
- Keeps prompt size and inference cost bounded on mobile
- Enables incremental indexing and long-term memory primitives

## Security Notes

- Treat retrieved data as untrusted text before inclusion in prompts
- Apply prompt-injection-aware sanitization where applicable
- Keep provenance metadata for auditability and filtering

## References

- [RAG paper (Lewis et al.)](https://arxiv.org/abs/2005.11401)
- [RAG best practices (chunking, embedding)](https://getmaxim.ai/blog/rag-best-practices)
- [Chunking strategies for RAG](https://www.firecrawl.dev/blog/best-chunking-strategies-rag)
- [SQLite](https://www.sqlite.org/docs.html)
- [sqlite-vec](https://github.com/asg017/sqlite-vec)
