# RAG Technical Details

This document specifies the local retrieval-augmented generation implementation details.

## Pipeline

1. Collect local sources (notes, calendar metadata, selected files)
2. Normalize and chunk text
3. Generate embeddings
4. Persist vectors and metadata in local store
5. At query time, embed user query and perform top-k retrieval
6. Build prompt with retrieved context and run local inference

## Chunking Strategy

- Token-aware chunk size (target band, e.g., 200-500 tokens)
- Overlap between chunks for continuity
- Metadata per chunk:
  - source type
  - source ID
  - timestamp
  - priority/scope tags

## Retrieval Policy

- top-k retrieval with threshold gating
- ranking merge for recency + relevance
- context budget enforced per model tier

## Why This Design Was Chosen

- Improves contextual accuracy without cloud storage
- Controls prompt size and inference costs on mobile
- Enables incremental indexing and long-term memory primitives

## Security Notes

- Treat retrieved data as untrusted text
- Apply prompt-injection-aware sanitization
- Keep provenance metadata for auditability

## References

- RAG paper (Lewis et al.): [https://arxiv.org/abs/2005.11401](https://arxiv.org/abs/2005.11401)
- React Native RAG docs: [https://software-mansion-labs.github.io/react-native-rag/](https://software-mansion-labs.github.io/react-native-rag/)
- SQLite docs: [https://www.sqlite.org/docs.html](https://www.sqlite.org/docs.html)
