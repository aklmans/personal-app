---
title: Enforce per-write LRU eviction when the content cache exceeds the entry cap
---
# Enforce per-write LRU eviction when the content cache exceeds the entry cap

  ## What & Why
  CONTENT_DISK_MAX_ENTRIES (200) is now enforced at startup, but between restarts new articles are continuously added to disk via `saveContentToDisk`. On a long-running server, the directory can grow past 200 again before the next restart. Adding a lightweight check inside `saveContentToDisk` (or a periodic housekeeping timer) would keep the cap in force at all times.

  ## Done looks like
  - After each write, if the number of files in CONTENT_DISK_CACHE_DIR exceeds CONTENT_DISK_MAX_ENTRIES, the oldest excess files are deleted
  - Or alternatively, a periodic timer (e.g. every 6 h) scans the directory and applies the same sort-and-evict logic used at startup
  - CONTENT_DISK_MAX_ENTRIES remains the single configurable constant for both paths

  ## Relevant files
  - `artifacts/api-server/src/routes/blog.ts` — `saveContentToDisk`, `loadContentCacheFromDisk`, `CONTENT_DISK_MAX_ENTRIES`