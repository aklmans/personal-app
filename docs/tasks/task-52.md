---
title: Limit the total size of the on-disk content cache to avoid unbounded growth
---
# Limit the total size of the on-disk content cache to avoid unbounded growth

  ## What & Why
  Each article's HTML is written to `data/cache/content/<key>.json` on first fetch and
  kept for 24 hours. As the blog grows, the number of cache files grows too, and there is
  currently no upper bound on total disk usage. Adding an LRU eviction step to the
  `loadContentCacheFromDisk` startup sweep (e.g. keep at most 200 most-recently-accessed
  entries) would prevent the directory from growing indefinitely on long-running servers.

  ## Done looks like
  - During startup load, if more than N valid entries are found, only the N most recently
    saved entries are loaded into memory; the excess files are deleted
  - N is a configurable constant (e.g. `CONTENT_DISK_MAX_ENTRIES = 200`)
  - Existing TTL-based eviction is preserved alongside the count-based cap

  ## Relevant files
  - `artifacts/api-server/src/routes/blog.ts` — `loadContentCacheFromDisk`