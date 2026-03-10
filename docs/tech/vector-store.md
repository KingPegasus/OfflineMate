# Vector Store Technical Details

This document describes local vector storage for retrieval in OfflineMate.

## Storage Choice

- **Database:** SQLite (expo-sqlite), local persistent store
- **Vector extension:** **sqlite-vec** — lightweight, portable C extension for K-nearest-neighbors (KNN) vector search

## Why This Was Chosen

- Local-first and offline by default; no external vector service
- Single embedded DB for both structured and vector data
- sqlite-vec runs on mobile (iOS/Android), desktops, and embedded environments with no extra infrastructure

## sqlite-vec Overview

- **vec0 virtual tables:** Primary interface; define tables with vector columns, insert rows, and query with `MATCH` and `k` (e.g. `embedding MATCH :queryVec k :k`). Supports float and int8 vectors; metadata columns can be stored alongside vectors.
- **Query method:** KNN via `MATCH` constraint; returns rows ordered by distance (e.g. L2). No built-in approximate nearest-neighbor (ANN) index (e.g. HNSW); search is exact over the table, which is acceptable for moderate-sized mobile indexes.
- **Performance:** ARM optimizations (e.g. NEON) improve distance computation; for large corpora, consider limiting index size or batching queries.
- **Availability:** Used via Expo SQLite with the sqlite-vec extension enabled in app config; stable but pre-v1, so API may evolve.

## Data Model (Conceptual)

- **vectors / vectors_idx:** Chunk text, embedding vector, source_type, source_id, chunk_order, created_at. `vectors_idx` is the vec0 virtual table for KNN; legacy `vectors` table retained for fallback.
- **index_state (if used):** source_ref, last_indexed_at, checksum/version for incremental indexing.

## Query Pattern

1. Compute query embedding (same model and dimension as stored vectors)
2. Run KNN: `SELECT ... FROM vectors_idx WHERE embedding MATCH :queryVec k :k ORDER BY distance`
3. Apply score threshold and metadata filters in app
4. Deduplicate and trim to top-k; return context slices to prompt builder

## Operational Considerations

- Embedding dimension must match the index (e.g. 384 for ALL_MINILM_L6_V2)
- Reindex when switching embedding model
- Use incremental indexing and reasonable chunk sizes to keep table size and query time bounded

## References

- [sqlite-vec (GitHub)](https://github.com/asg017/sqlite-vec)
- [sqlite-vec vec0 virtual table](https://alexgarcia.xyz/sqlite-vec/features/vec0.html)
- [sqlite-vec KNN queries](https://alexgarcia.xyz/sqlite-vec/features/knn.html)
- [Expo SQLite](https://docs.expo.dev/versions/latest/sdk/sqlite/)
- [SQLite](https://www.sqlite.org/docs.html)
