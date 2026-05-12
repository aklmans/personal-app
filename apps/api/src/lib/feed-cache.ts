import { readFile, writeFile, mkdir } from "fs/promises";
import { resolve, dirname } from "path";
import fs from "node:fs";
import path from "node:path";

import type { BlogPost, CacheEntry } from "./feed-types";
import { logger } from "./logger";

// __dirname at runtime is <repo>/apps/api/dist (esbuild output).
// Two levels up lands at <repo>/apps/api/data/cache — the persistent store.
const DISK_CACHE_DIR = path.resolve(__dirname, "../../data/cache");

function diskCachePath(locale: string): string {
  return path.join(DISK_CACHE_DIR, `posts-${locale}.json`);
}

export const cache: Record<string, CacheEntry> = {};
export const CACHE_TTL = 5 * 60 * 1000;
export const STALE_TTL = 30 * 60 * 1000;
const FEED_DISK_TTL = 24 * 60 * 60 * 1000;

// Tracks locales whose in-memory cache was seeded from disk on this boot.
// Even if the disk snapshot is very fresh (age < CACHE_TTL), the first
// request after a restart should always schedule a background refresh so
// readers receive fully up-to-date content as soon as possible.
export const bootPrewarmedLocales = new Set<string>();

export function loadDiskCache(locales: string[]): void {
  try {
    fs.mkdirSync(DISK_CACHE_DIR, { recursive: true });
    for (const locale of locales) {
      const file = diskCachePath(locale);
      if (!fs.existsSync(file)) continue;
      try {
        const raw = fs.readFileSync(file, "utf8");
        const entry = JSON.parse(raw) as CacheEntry;
        if (entry && Array.isArray(entry.posts) && typeof entry.timestamp === "number" && Number.isFinite(entry.timestamp)) {
          const now = Date.now();
          const age = now - entry.timestamp;
          // Skip disk cache entries older than FEED_DISK_TTL (24 h).
          // Beyond that age the data is too stale to pre-warm; let the live
          // fetch run on first request instead.
          if (age > FEED_DISK_TTL) {
            logger.info({ locale, ageMs: age }, "blog: disk cache too old, skipping pre-warm");
            continue;
          }
          // Clamp the loaded timestamp so it never appears older than STALE_TTL.
          // This guarantees the first request after restart is always served
          // immediately from disk (stale-while-revalidate), no matter how long
          // the server was offline.  A background refresh is triggered whenever
          // age > CACHE_TTL, which is preserved by using Math.max.
          const minTimestamp = now - STALE_TTL + 1;
          const timestamp = Math.max(entry.timestamp, minTimestamp);
          cache[locale] = { posts: entry.posts, timestamp };
          bootPrewarmedLocales.add(locale);
          logger.info({ locale, posts: entry.posts.length, ageMs: age }, "blog: loaded disk cache");
        }
      } catch (err) {
        logger.warn({ locale, err }, "blog: failed to parse disk cache");
      }
    }
  } catch (err) {
    logger.warn({ err }, "blog: failed to initialise disk cache dir");
  }
}

export function saveDiskCache(locale: string, entry: CacheEntry): void {
  try {
    fs.mkdirSync(DISK_CACHE_DIR, { recursive: true });
    const slim: CacheEntry = {
      timestamp: entry.timestamp,
      posts: entry.posts.map(({ content: _omit, ...rest }) => ({ ...rest, content: "" })),
    };
    fs.writeFileSync(diskCachePath(locale), JSON.stringify(slim), "utf8");
  } catch (err) {
    logger.warn({ locale, err }, "blog: failed to write disk cache");
  }
}

export const contentCache: Map<string, { html: string; ts: number }> = new Map();
export const CONTENT_TTL = 15 * 60 * 1000;

const CONTENT_DISK_CACHE_DIR = path.resolve(__dirname, "../../data/cache/content");
export const CONTENT_DISK_TTL = 24 * 60 * 60 * 1000;
const CONTENT_DISK_MAX_ENTRIES = 200;
// Entries older than this threshold (but still within CONTENT_DISK_TTL) are
// silently re-fetched in the background while still being served from cache.
export const CONTENT_REVALIDATE_AGE = 12 * 60 * 60 * 1000;

// Tracks the real on-disk write timestamp for each cached content URL.
// loadContentCacheFromDisk clamps contentCache[].ts to `now` so the in-memory
// cache always appears fresh after restart; this map preserves the actual disk
// age so that revalidateStaleContent() can decide what needs refreshing.
export const contentDiskTs: Map<string, number> = new Map();

function contentDiskCacheKey(url: string): string {
  return url
    .replace(/^https?:\/\//, "")
    .replace(/\/+$/, "")
    .replace(/[^a-zA-Z0-9_.-]/g, "_");
}

function contentDiskCachePath(url: string): string {
  return path.join(CONTENT_DISK_CACHE_DIR, `${contentDiskCacheKey(url)}.json`);
}

export function loadContentCacheFromDisk(): void {
  try {
    fs.mkdirSync(CONTENT_DISK_CACHE_DIR, { recursive: true });
    const files = fs.readdirSync(CONTENT_DISK_CACHE_DIR).filter((f) => f.endsWith(".json"));
    const now = Date.now();

    type ValidEntry = { url: string; html: string; ts: number; file: string };
    const valid: ValidEntry[] = [];

    for (const file of files) {
      try {
        const raw = fs.readFileSync(path.join(CONTENT_DISK_CACHE_DIR, file), "utf8");
        const entry = JSON.parse(raw) as { url: string; html: string; ts: number };
        if (
          entry &&
          typeof entry.url === "string" &&
          typeof entry.html === "string" &&
          typeof entry.ts === "number" &&
          Number.isFinite(entry.ts)
        ) {
          if (now - entry.ts < CONTENT_DISK_TTL) {
            valid.push({ url: entry.url, html: entry.html, ts: entry.ts, file });
          } else {
            fs.unlink(path.join(CONTENT_DISK_CACHE_DIR, file), () => {});
          }
        }
      } catch (fileErr) {
        logger.warn({ file, err: fileErr }, "blog: skipping corrupt content cache file");
      }
    }

    valid.sort((a, b) => b.ts - a.ts);

    const evicted = valid.length > CONTENT_DISK_MAX_ENTRIES ? valid.length - CONTENT_DISK_MAX_ENTRIES : 0;
    if (evicted > 0) {
      const toDelete = valid.splice(CONTENT_DISK_MAX_ENTRIES);
      for (const e of toDelete) {
        fs.unlink(path.join(CONTENT_DISK_CACHE_DIR, e.file), () => {});
      }
    }

    for (const e of valid) {
      // Clamp ts to appear freshly loaded so fetchPostContent serves from
      // memory immediately after restart. A background re-fetch will happen
      // after CONTENT_TTL (same pattern as the post-list disk cache).
      contentCache.set(e.url, { html: e.html, ts: now });
      // Preserve the real disk timestamp so revalidateStaleContent() can
      // decide whether this entry needs a background refresh.
      contentDiskTs.set(e.url, e.ts);
    }

    if (valid.length > 0) {
      logger.info({ loaded: valid.length, evicted }, "blog: content cache pre-warmed from disk");
    }
  } catch (err) {
    logger.warn({ err }, "blog: failed to load content disk cache");
  }
}

function evictOldestContentIfNeeded(): void {
  if (contentDiskTs.size <= CONTENT_DISK_MAX_ENTRIES) return;
  // Sort ascending by timestamp so oldest entries are first.
  const entries = Array.from(contentDiskTs.entries()).sort((a, b) => a[1] - b[1]);
  const toEvict = entries.slice(0, entries.length - CONTENT_DISK_MAX_ENTRIES);
  for (const [evictUrl] of toEvict) {
    contentDiskTs.delete(evictUrl);
    contentCache.delete(evictUrl);
    fs.unlink(contentDiskCachePath(evictUrl), (err) => {
      if (err) logger.warn({ url: evictUrl, err }, "blog: content cache LRU eviction unlink failed");
    });
  }
  logger.warn({ evicted: toEvict.length, cap: CONTENT_DISK_MAX_ENTRIES }, "blog: content cache LRU eviction triggered");
}

export function saveContentToDisk(url: string, html: string, ts: number): void {
  try {
    fs.mkdirSync(CONTENT_DISK_CACHE_DIR, { recursive: true });
    fs.writeFileSync(contentDiskCachePath(url), JSON.stringify({ url, html, ts }), "utf8");
    contentDiskTs.set(url, ts);
    evictOldestContentIfNeeded();
  } catch {
    // fire-and-forget, ignore write errors
  }
}

export function evictContentCacheEntry(url: string): void {
  contentCache.delete(url);
  contentDiskTs.delete(url);
  fs.unlink(contentDiskCachePath(url), () => {});
}

const METADATA_DISK_CACHE_FILE = resolve(process.cwd(), ".cache", "metadata.json");
export const METADATA_DISK_TTL = 7 * 24 * 60 * 60 * 1000;

export type DiskMetadataEntry = { post: BlogPost; savedAt: number };
export const _diskMetaCache = new Map<string, DiskMetadataEntry>();

export async function loadMetadataDiskCache(): Promise<void> {
  try {
    const raw = await readFile(METADATA_DISK_CACHE_FILE, "utf8");
    const parsed = JSON.parse(raw) as Record<string, DiskMetadataEntry>;
    const now = Date.now();
    let loaded = 0;
    let stale = 0;
    for (const [url, entry] of Object.entries(parsed)) {
      // Load ALL entries — including expired ones — so they remain available
      // in _diskMetaCache as a last-resort stale fallback during extended outages
      // (e.g. after a server restart while RSS + sitemap are still unreachable).
      // Normal lookups via getMetadataFromDiskCache() still evict and skip expired
      // entries; only the allowExpired:true path serves them.
      _diskMetaCache.set(url, entry);
      if (now - entry.savedAt < METADATA_DISK_TTL) {
        loaded++;
      } else {
        stale++;
      }
    }
    logger.info({ loaded, stale }, "blog: metadata disk cache loaded");
  } catch {
    // File missing or corrupt — start fresh, not an error
  }
}

export function getMetadataFromDiskCache(
  url: string,
  opts?: { allowExpired?: boolean }
): BlogPost | null {
  const key = url.replace(/\/+$/, "");
  const entry = _diskMetaCache.get(key) ?? _diskMetaCache.get(key + "/");
  if (!entry) return null;
  if (Date.now() - entry.savedAt > METADATA_DISK_TTL) {
    if (!opts?.allowExpired) {
      _diskMetaCache.delete(key);
      _diskMetaCache.delete(key + "/");
      return null;
    }
  }
  return entry.post;
}

export async function flushMetadataDiskCache(): Promise<void> {
  const now = Date.now();
  for (const [url, entry] of _diskMetaCache.entries()) {
    if (now - entry.savedAt > METADATA_DISK_TTL) _diskMetaCache.delete(url);
  }
  try {
    await mkdir(dirname(METADATA_DISK_CACHE_FILE), { recursive: true });
    const obj: Record<string, DiskMetadataEntry> = {};
    for (const [url, entry] of _diskMetaCache.entries()) {
      const { content: _omit, ...meta } = entry.post;
      obj[url] = { post: { ...meta, content: "" }, savedAt: entry.savedAt };
    }
    await writeFile(METADATA_DISK_CACHE_FILE, JSON.stringify(obj), "utf8");
  } catch (err) {
    logger.warn({ err }, "blog: failed to flush metadata disk cache");
  }
}

/**
 * Collect stale disk metadata entries for `locale` that are not already covered
 * by `excludeLinks`. Calls `getMetadataFromDiskCache` with `allowExpired: true`
 * so expired entries are returned rather than evicted. De-duplicates by link.
 */
export function collectStaleFallback(locale: string, excludeLinks: Set<string>): BlogPost[] {
  const seen = new Set<string>();
  const fallback: BlogPost[] = [];
  for (const [url] of _diskMetaCache.entries()) {
    const post = getMetadataFromDiskCache(url, { allowExpired: true });
    if (post && post.locale === locale) {
      const normalized = post.link.replace(/\/+$/, "");
      if (!excludeLinks.has(normalized) && !seen.has(normalized)) {
        seen.add(normalized);
        fallback.push(post);
      }
    }
  }
  return fallback;
}
