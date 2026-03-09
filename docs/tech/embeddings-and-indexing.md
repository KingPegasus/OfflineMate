# Embeddings and Indexing (Technical)

This document describes the implemented semantic embedding + vector indexing path in OfflineMate.

## Implemented Stack

- Embedding runtime: `react-native-executorch` `TextEmbeddingsModule`
- Embedding model: `ALL_MINILM_L6_V2` (384 dimensions)
- Primary vector search: `sqlite-vec` (`vec0` virtual table + KNN `MATCH`)
- Fallback vector search: legacy SQLite table + JS cosine similarity

## Runtime Behavior

1. `generateEmbedding(text)` normalizes text and applies a bounded in-memory cache.
2. Embeddings runtime loads lazily on first use.
3. On runtime failure, deterministic fallback embeddings keep the app operational.
4. Indexing writes:
   - legacy table (`vectors`) for compatibility
   - native vec index (`vectors_idx`) when sqlite-vec is available

## Indexing Strategy

- Note content is chunked with overlap (`chunk size` + `overlap`).
- Each chunk is upserted asynchronously with:
  - `source_type`
  - `source_id`
  - `chunk_order`
  - chunk text
  - embedding payload

This improves retrieval recall for long notes and avoids single-large-vector dilution.

## Query Strategy

Primary path:

- compute query embedding
- run KNN SQL:
  - `embedding MATCH :queryVec`
  - `k = :k`
- order by `distance`
- convert to score and apply threshold
- dedupe snippets and clip by top-k

Fallback path:

- scan legacy vectors
- cosine score in JS
- threshold, sort, top-k

## Performance Notes

- Native KNN avoids large JS-side row scans in normal mode.
- Cache reduces repeat embedding inference.
- Perf smoke tests validate throughput/latency regressions in CI.

## Known Limits

- Fallback embeddings are deterministic but lower quality than model-based vectors.
- Current retrieval dedupe is text-normalization based; source-diversity ranking is future work.

## References

- [React Native ExecuTorch Text Embeddings](https://docs.swmansion.com/react-native-executorch/docs/hooks/natural-language-processing/useTextEmbeddings)
- [Expo SQLite Extension Loading](https://docs.expo.dev/versions/latest/sdk/sqlite/)
- [sqlite-vec vec0](https://alexgarcia.xyz/sqlite-vec/features/vec0.html)
