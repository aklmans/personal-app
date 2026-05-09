---
title: Stop storing article content in the feed disk cache to keep file sizes small
---
# Stop storing article content in the feed disk cache to keep file sizes small

  ## What & Why
  The feed disk cache (`.cache/posts-{locale}.json`) stores the full `content` field (raw HTML) for every RSS post. For a blog with many posts this can make the cache file very large, slow to read on cold start, and expensive to keep on disk — especially since content is already separately cached per-article in `.cache/content/`.

  ## Done looks like
  - `saveDiskCache` strips or omits the `content` field before writing to disk (the same way `flushMetadataDiskCache` omits it)
  - Cold-start pre-warm still works: posts render with their metadata; full content is loaded on-demand from the content disk cache
  - The feed cache file size is significantly reduced

  ## Relevant files
  - `artifacts/api-server/src/routes/blog.ts` — `saveDiskCache`, `loadDiskCache`, `doFetchFeed`