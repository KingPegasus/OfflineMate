# Vector Store Technical Details

This document describes local vector storage for retrieval in OfflineMate.

## Storage Choice

- Database: SQLite (local persistent store)
- Vector extension: `sqlite-vec`

## Why This Was Chosen

- Local-first and offline by default
- Single embedded DB for structured and vector data
- Lower operational complexity than external vector infrastructure

## Data Model (Conceptual)

- `documents`
  - id, source_type, source_ref, text, created_at, updated_at
- `embeddings`
  - id, document_id, vector, dimension, model_name, created_at
- `index_state`
  - source_ref, last_indexed_at, checksum/version

## Query Pattern

- Embed user query
- Search nearest vectors (top-k)
- Apply threshold and metadata filters
- Return context slices to prompt builder

## Operational Considerations

- Keep embedding dimensions consistent per index
- Reindex when changing embedding model
- Use incremental indexing and background compaction

## References

- sqlite-vec: [https://github.com/asg017/sqlite-vec](https://github.com/asg017/sqlite-vec)
- Expo SQLite docs: [https://docs.expo.dev/versions/latest/sdk/sqlite/](https://docs.expo.dev/versions/latest/sdk/sqlite/)
- SQLite official docs: [https://www.sqlite.org/docs.html](https://www.sqlite.org/docs.html)
