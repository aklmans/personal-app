---
title: Automatically clear the cache when posts are removed or renamed
---
# Automatically clear the cache when posts are removed or renamed

  ## What & Why
  The disk cache persists posts indefinitely until a new refresh overwrites it. If a post is deleted or its URL changes on the site, stale entries will survive on disk until the full TTL expires. A cache invalidation or pruning step on each refresh would keep the disk cache accurate.

  ## Done looks like
  - After each successful feed refresh, posts in the disk cache that no longer appear in the live feed are removed
  - Renamed or deleted posts don't linger in the served list

  ## Relevant files
  - `artifacts/api-server/src/routes/blog.ts` — `doFetchFeed`, `saveDiskCache`