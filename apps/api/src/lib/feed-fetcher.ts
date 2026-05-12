import {
  CACHE_TTL,
  CONTENT_DISK_TTL,
  CONTENT_REVALIDATE_AGE,
  CONTENT_TTL,
  METADATA_DISK_TTL,
  STALE_TTL,
  _diskMetaCache,
  bootPrewarmedLocales,
  cache,
  collectStaleFallback,
  contentCache,
  contentDiskTs,
  evictContentCacheEntry,
  flushMetadataDiskCache,
  loadContentCacheFromDisk,
  loadDiskCache,
  loadMetadataDiskCache,
  saveContentToDisk,
  saveDiskCache,
} from "./feed-cache";
import {
  extractArticleHtml,
  parsePostMetadataFromPage,
  parseRssFeed,
} from "./feed-parser";
import {
  SITE_BASE,
  extractSitemapLocs,
  filterSitemapPostUrls,
  filterSitemapUrlsByLocale,
} from "./feed-sitemap";
import type { BlogPost, CacheEntry } from "./feed-types";
import { logger } from "./logger";

const RSS_FEEDS: Record<string, string> = {
  en: "https://aklman.com/rss.xml",
  "zh-cn": "https://aklman.com/zh-cn/rss.xml",
};

const SITEMAP_INDEX = "https://aklman.com/sitemap-index.xml";

const refreshInProgress: Record<string, boolean> = {};
const inFlightFetches: Map<string, Promise<BlogPost[]>> = new Map();

const SITEMAP_CACHE_TTL = 10 * 60 * 1000;
let _sitemapCache: { urls: string[]; ts: number } | null = null;

const SCRAPE_CONCURRENCY = 5;

async function withConcurrencyLimit<T>(
  tasks: (() => Promise<T>)[],
  limit: number
): Promise<PromiseSettledResult<T>[]> {
  const results: PromiseSettledResult<T>[] = new Array(tasks.length);
  let index = 0;

  async function worker() {
    while (index < tasks.length) {
      const i = index++;
      try {
        results[i] = { status: "fulfilled", value: await tasks[i]!() };
      } catch (e) {
        results[i] = { status: "rejected", reason: e };
      }
    }
  }

  const workers = Array.from({ length: Math.min(limit, tasks.length) }, worker);
  await Promise.all(workers);
  return results;
}

export async function fetchPostContent(url: string): Promise<string> {
  const now = Date.now();
  const cached = contentCache.get(url);
  if (cached && now - cached.ts < CONTENT_TTL) return cached.html;
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "aklman-mobile/1.0" },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      if (cached) contentCache.set(url, { html: cached.html, ts: now });
      return cached?.html ?? "";
    }
    const html = await res.text();
    const extracted = extractArticleHtml(html);
    const ts = Date.now();
    contentCache.set(url, { html: extracted, ts });
    saveContentToDisk(url, extracted, ts);
    return extracted;
  } catch {
    if (cached) contentCache.set(url, { html: cached.html, ts: now });
    return cached?.html ?? "";
  }
}

async function fetchPostMetadataFromPage(url: string, locale: string): Promise<BlogPost | null> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "aklman-mobile/1.0" },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return null;
    const html = await res.text();
    return parsePostMetadataFromPage(url, locale, html);
  } catch {
    return null;
  }
}

async function fetchSitemapPostUrls(locale: string): Promise<string[]> {
  const now = Date.now();
  if (_sitemapCache && now - _sitemapCache.ts < SITEMAP_CACHE_TTL) {
    return filterSitemapUrlsByLocale(_sitemapCache.urls, locale);
  }

  try {
    const indexRes = await fetch(SITEMAP_INDEX, {
      headers: { "User-Agent": "aklman-mobile/1.0" },
      signal: AbortSignal.timeout(8000),
    });
    if (!indexRes.ok) return [];

    const indexXml = await indexRes.text();
    const sitemapUrls = extractSitemapLocs(indexXml);

    const allPostUrls: string[] = [];

    await Promise.all(
      sitemapUrls.map(async (sitemapUrl) => {
        try {
          const res = await fetch(sitemapUrl, {
            headers: { "User-Agent": "aklman-mobile/1.0" },
            signal: AbortSignal.timeout(8000),
          });
          if (!res.ok) return;
          const xml = await res.text();
          const urls = filterSitemapPostUrls(extractSitemapLocs(xml));
          allPostUrls.push(...urls);
        } catch {
          // ignore
        }
      })
    );

    _sitemapCache = { urls: allPostUrls, ts: now };
    return filterSitemapUrlsByLocale(allPostUrls, locale);
  } catch {
    return _sitemapCache ? filterSitemapUrlsByLocale(_sitemapCache.urls, locale) : [];
  }
}

async function doFetchFeed(locale: string): Promise<BlogPost[]> {
  const t0 = Date.now();
  const url = RSS_FEEDS[locale] ?? RSS_FEEDS["en"]!;

  let rssPosts: BlogPost[] = [];

  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "aklman-mobile/1.0" },
      signal: AbortSignal.timeout(10000),
    });

    if (res.ok) {
      const xml = await res.text();
      rssPosts = parseRssFeed(xml, locale);
    }
  } catch {
    // fall through to sitemap scraping
  }

  const rssPostLinks = new Set(
    rssPosts.map((p) => p.link.replace(/\/+$/, ""))
  );

  let sitemapPosts: BlogPost[] = [];
  let sitemapScrapeCount = 0;
  let sitemapFromDisk = 0;
  let evicted = 0;
  let contentEvicted = 0;
  try {
    const sitemapUrls = await fetchSitemapPostUrls(locale);

    // Reconcile: evict disk-cache entries for this locale whose URL is no longer in the sitemap.
    // Scope to the current locale's URL namespace to avoid evicting entries that belong
    // to other locales (whose sitemap was not fetched in this call).
    const sitemapNormalized = new Set(sitemapUrls.map((u) => u.replace(/\/+$/, "")));
    for (const key of _diskMetaCache.keys()) {
      const isCurrentLocale =
        locale === "zh-cn"
          ? key.includes(`${SITE_BASE}/zh-cn/`)
          : !key.includes(`${SITE_BASE}/zh-cn/`);
      if (!isCurrentLocale) continue;
      if (!sitemapNormalized.has(key.replace(/\/+$/, ""))) {
        _diskMetaCache.delete(key);
        evicted++;
      }
    }
    if (evicted > 0) {
      flushMetadataDiskCache().catch(() => {});
    }

    // Evict content cache entries for this locale whose URL is no longer in the sitemap.
    for (const url of contentCache.keys()) {
      const isCurrentLocale =
        locale === "zh-cn"
          ? url.includes(`${SITE_BASE}/zh-cn/`)
          : !url.includes(`${SITE_BASE}/zh-cn/`);
      if (!isCurrentLocale) continue;
      if (!sitemapNormalized.has(url.replace(/\/+$/, ""))) {
        evictContentCacheEntry(url);
        contentEvicted++;
      }
    }

    const newUrls = sitemapUrls.filter(
      (u) => !rssPostLinks.has(u.replace(/\/+$/, ""))
    );

    if (newUrls.length > 0) {
      const fromDisk: BlogPost[] = [];
      const toFetch: string[] = [];
      for (const u of newUrls) {
        // Use an inline freshness check instead of getMetadataFromDiskCache so
        // that expired entries are NOT evicted here — they must survive in
        // _diskMetaCache to be available as stale fallback if all live fetches fail.
        const key = u.replace(/\/+$/, "");
        const diskEntry = _diskMetaCache.get(key) ?? _diskMetaCache.get(key + "/");
        const isFresh = diskEntry != null && Date.now() - diskEntry.savedAt <= METADATA_DISK_TTL;
        if (isFresh) {
          fromDisk.push(diskEntry!.post);
        } else {
          toFetch.push(u);
        }
      }
      sitemapFromDisk = fromDisk.length;
      sitemapScrapeCount = toFetch.length;

      let freshPosts: BlogPost[] = [];
      if (toFetch.length > 0) {
        const results = await withConcurrencyLimit(
          toFetch.map((u) => () => fetchPostMetadataFromPage(u, locale)),
          SCRAPE_CONCURRENCY
        );
        freshPosts = results
          .filter(
            (r): r is PromiseFulfilledResult<BlogPost> =>
              r.status === "fulfilled" && r.value !== null
          )
          .map((r) => r.value);

        if (freshPosts.length > 0) {
          // Only flush when we have new data to write; skipping the flush when
          // freshPosts is empty preserves expired entries in _diskMetaCache so
          // the stale fallback below can still find them.
          const savedAt = Date.now();
          for (const post of freshPosts) {
            _diskMetaCache.set(post.link.replace(/\/+$/, ""), { post, savedAt });
          }
          flushMetadataDiskCache().catch(() => {});
        }

        // toFetch failure branch: all live scrapes failed and no fresh disk hits
        // either — serve stale disk metadata (including expired entries) so readers
        // see posts rather than a blank screen during an extended site outage.
        if (freshPosts.length === 0 && fromDisk.length === 0) {
          const rssLinks = new Set(rssPosts.map((p) => p.link.replace(/\/+$/, "")));
          const staleFallback = collectStaleFallback(locale, rssLinks);
          if (staleFallback.length > 0) {
            logger.warn(
              { locale, sitemapStale: staleFallback.length },
              "blog: serving stale metadata disk cache as fallback"
            );
            sitemapPosts = staleFallback.map((p) => ({ ...p, stale: true }));
          }
        }
      }

      if (sitemapPosts.length === 0) {
        sitemapPosts = [...fromDisk, ...freshPosts];
      }
    }
  } catch (err) {
    logger.warn({ locale, err }, "blog: sitemap scraping failed");
    // fetchSitemapPostUrls threw (rare but possible); serve stale disk metadata.
    const rssLinks = new Set(rssPosts.map((p) => p.link.replace(/\/+$/, "")));
    const staleFallback = collectStaleFallback(locale, rssLinks);
    if (staleFallback.length > 0) {
      logger.warn(
        { locale, sitemapStale: staleFallback.length },
        "blog: serving stale metadata disk cache as fallback"
      );
      sitemapPosts = staleFallback.map((p) => ({ ...p, stale: true }));
    }
  }

  // Final fallback: covers the case where fetchSitemapPostUrls returned [] (e.g.
  // non-OK sitemap index) so newUrls was empty and neither branch above ran.
  // When both RSS and sitemap yield nothing, serve any stale disk metadata.
  if (rssPosts.length === 0 && sitemapPosts.length === 0) {
    const staleFallback = collectStaleFallback(locale, new Set());
    if (staleFallback.length > 0) {
      logger.warn(
        { locale, sitemapStale: staleFallback.length },
        "blog: serving stale metadata disk cache as fallback"
      );
      sitemapPosts = staleFallback.map((p) => ({ ...p, stale: true }));
    }
  }

  const allPosts = [...rssPosts, ...sitemapPosts].sort((a, b) => {
    const da = a.pubDate ? new Date(a.pubDate).getTime() : 0;
    const db = b.pubDate ? new Date(b.pubDate).getTime() : 0;
    return db - da;
  });

  const now = Date.now();
  const posts = allPosts.length > 0 ? allPosts : (cache[locale]?.posts ?? []);
  const entry: CacheEntry = { posts, timestamp: now };
  cache[locale] = entry;
  saveDiskCache(locale, entry);

  logger.info(
    {
      locale,
      rssCount: rssPosts.length,
      sitemapFromDisk,
      sitemapScrapeCount,
      sitemapFound: sitemapPosts.length,
      evicted,
      contentEvicted,
      totalPosts: posts.length,
      durationMs: now - t0,
    },
    "blog: feed refreshed"
  );

  return posts;
}

export async function fetchFeed(locale: string): Promise<BlogPost[]> {
  const now = Date.now();
  const entry = cache[locale];

  if (entry) {
    const age = now - entry.timestamp;

    // Always schedule a background refresh on the first request after a cold
    // start that was seeded from disk — even when the snapshot is very fresh
    // (age < CACHE_TTL) — so readers get fully up-to-date content ASAP.
    const needsBootRefresh = bootPrewarmedLocales.has(locale);
    if (needsBootRefresh) {
      bootPrewarmedLocales.delete(locale);
      if (!refreshInProgress[locale]) {
        refreshInProgress[locale] = true;
        doFetchFeed(locale)
          .catch((err) => logger.error({ locale, err }, "blog: boot refresh failed"))
          .finally(() => {
            refreshInProgress[locale] = false;
          });
      }
      return entry.posts;
    }

    if (age < CACHE_TTL) {
      return entry.posts;
    }

    if (age < STALE_TTL) {
      if (!refreshInProgress[locale]) {
        refreshInProgress[locale] = true;
        doFetchFeed(locale)
          .catch((err) => logger.error({ locale, err }, "blog: background refresh failed"))
          .finally(() => {
            refreshInProgress[locale] = false;
          });
      }
      return entry.posts;
    }
  }

  const inflight = inFlightFetches.get(locale);
  if (inflight) return inflight;

  const fetch$ = doFetchFeed(locale).finally(() => inFlightFetches.delete(locale));
  inFlightFetches.set(locale, fetch$);
  return fetch$;
}

export function isFeedRefreshInProgress(locale: string): boolean {
  return refreshInProgress[locale] === true;
}

// Re-fetches content for any disk-cached entry that is older than
// CONTENT_REVALIDATE_AGE but still within CONTENT_DISK_TTL.  Runs under the
// shared SCRAPE_CONCURRENCY limit so it never saturates outbound connections.
// Both the in-memory contentCache and the on-disk JSON file are updated on success.
async function revalidateStaleContent(): Promise<void> {
  const now = Date.now();
  const staleUrls: string[] = [];
  for (const [url, diskTs] of contentDiskTs.entries()) {
    const age = now - diskTs;
    if (age > CONTENT_REVALIDATE_AGE && age < CONTENT_DISK_TTL) {
      staleUrls.push(url);
    }
  }
  if (staleUrls.length === 0) return;

  logger.info({ count: staleUrls.length }, "blog: revalidating stale content cache entries");

  let changed = 0;
  let unchanged = 0;

  const tasks = staleUrls.map((url) => async () => {
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": "aklman-mobile/1.0" },
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) return;
      const html = await res.text();
      const extracted = extractArticleHtml(html);
      const previous = contentCache.get(url)?.html ?? "";
      const ts = Date.now();
      contentCache.set(url, { html: extracted, ts });
      saveContentToDisk(url, extracted, ts);
      if (extracted !== previous) {
        changed++;
      } else {
        unchanged++;
      }
    } catch {
      // fire-and-forget; failures are silent to keep log noise low
    }
  });

  await withConcurrencyLimit(tasks, SCRAPE_CONCURRENCY);
  logger.info(
    { revalidated: staleUrls.length, changed, unchanged },
    "blog: content revalidation complete"
  );
}

// Recurring revalidation interval handle — stored so it can be cleared on
// module teardown and never leaks if the module is ever reloaded.
let _revalidateInterval: ReturnType<typeof setInterval> | null = null;

const CONTENT_REVALIDATE_INTERVAL = 12 * 60 * 60 * 1000; // 12 hours

function warmCache(): void {
  for (const locale of Object.keys(RSS_FEEDS)) {
    doFetchFeed(locale).catch(() => {});
  }
  // Kick off content revalidation after a short delay so it doesn't compete
  // with the initial feed fetch on startup.
  setTimeout(() => {
    revalidateStaleContent().catch((err) =>
      logger.warn({ err }, "blog: content revalidation failed")
    );
  }, 5000);

  // Clear any existing interval before registering a new one so this function
  // is safe to call more than once without leaking handles.
  if (_revalidateInterval !== null) {
    clearInterval(_revalidateInterval);
    logger.info("blog: cleared previous content revalidation interval");
  }
  _revalidateInterval = setInterval(() => {
    revalidateStaleContent().catch((err) =>
      logger.warn({ err }, "blog: periodic content revalidation failed")
    );
  }, CONTENT_REVALIDATE_INTERVAL);
  logger.info({ intervalMs: CONTENT_REVALIDATE_INTERVAL }, "blog: content revalidation interval registered");
}

export function initializeBlogFeed(): void {
  loadDiskCache(Object.keys(RSS_FEEDS));
  loadContentCacheFromDisk();
  loadMetadataDiskCache().then(() => warmCache()).catch(() => warmCache());
}

/**
 * Cancel the recurring content-revalidation timer. Call this during server
 * shutdown or hot-module teardown to prevent handle leaks.
 */
export function disposeBlogCacheTimers(): void {
  if (_revalidateInterval !== null) {
    clearInterval(_revalidateInterval);
    _revalidateInterval = null;
    logger.info("blog: content revalidation interval cleared (dispose)");
  }
}
