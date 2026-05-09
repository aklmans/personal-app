---
title: Evict stale article content from disk when a post is removed
---
# Evict stale article content from disk when a post is removed

  ## What & Why
  The metadata reconciliation (task-34) evicts entries from `_diskMetaCache` when a post disappears from the sitemap, but the corresponding full-article HTML files stored in the content disk cache (`CONTENT_DISK_CACHE_DIR`) are not removed. Stale content files accumulate indefinitely for deleted/renamed posts.

  ## Done looks like
  - After sitemap reconciliation in `doFetchFeed`, any content disk cache file whose URL is no longer in the sitemap is deleted from disk
  - The feed refresh log includes a `contentEvicted` counter alongside the existing `evicted` counter

  ## Relevant files
  - `artifacts/api-server/src/routes/blog.ts` — `doFetchFeed`, `contentDiskCachePath`, `CONTENT_DISK_CACHE_DIR`, `contentCache`