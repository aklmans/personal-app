---
title: Show posts from the archive that aren't in the RSS feed
---
# Show posts from the archive that aren't in the RSS feed

  ## What & Why
  RSS feeds typically include only the most recent 10-20 posts. Older articles on aklman.com that fall outside the RSS window are discovered via sitemap scraping, which requires one HTTP fetch per post. As the archive grows, this gap between RSS coverage and total posts widens. Fetching full content from `content:encoded` in the RSS covers recent posts well, but there's no batch metadata source for older ones.

  ## Done looks like
  - An Atom/JSON feed or paginated sitemap approach surfaces all posts with metadata (title, date, description) without needing a per-page fetch
  - Or: the sitemap scraper caches individual page metadata to disk so repeat cold starts don't re-scrape already-known posts

  ## Relevant files
  - `artifacts/api-server/src/routes/blog.ts` — `fetchSitemapPostUrls`, `fetchPostMetadataFromPage`