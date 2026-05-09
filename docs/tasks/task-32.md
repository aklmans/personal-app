---
title: Speed up startup even further by pre-warming the content cache from disk
---
# Speed up startup even further by pre-warming the content cache from disk

  ## What & Why
  Post metadata is now persisted to disk, but the full article HTML (fetched per-post) lives only in the in-memory `contentCache`. Persisting article content to disk as well would mean that individual article requests are also instant after a restart, not just the post list.

  ## Done looks like
  - Article HTML is written to disk (e.g. `data/cache/content-<slug>.html`) after each fetch
  - On startup the content cache is pre-populated from disk so article detail requests don't require a cold scrape

  ## Relevant files
  - `artifacts/api-server/src/routes/blog.ts` — `fetchPostContent`, `contentCache`