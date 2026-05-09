---
title: Protect readers from seeing very old cached posts if the feed goes down for a long time
---
# Protect readers from seeing very old cached posts if the feed goes down for a long time

  ## What & Why
  The disk metadata cache has a 7-day TTL per entry. If the RSS feed and sitemap both become unreachable for more than 7 days (hosting outage, domain change), expired entries are evicted and readers see an empty post list. Adding a "last-resort" fallback — serving expired disk entries if all live sources fail — prevents a complete blank screen.

  ## Done looks like
  - `getMetadataFromDiskCache` has a `{ allowExpired: boolean }` option
  - In the `catch` block of the sitemap-scraping section, expired disk entries are served as fallback when `toFetch` fails (instead of returning empty)
  - Stale fallback entries are clearly flagged in the log as `sitemapStale` 

  ## Relevant files
  - `artifacts/api-server/src/routes/blog.ts` — `getMetadataFromDiskCache`, `doFetchFeed` catch block