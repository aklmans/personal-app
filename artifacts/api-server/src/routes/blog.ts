import { Router } from "express";
import { XMLParser } from "fast-xml-parser";
import { logger } from "../lib/logger";

const router = Router();

const RSS_FEEDS: Record<string, string> = {
  en: "https://aklman.com/rss.xml",
  "zh-cn": "https://aklman.com/zh-cn/rss.xml",
};

const SITEMAP_INDEX = "https://aklman.com/sitemap-index.xml";
const SITE_BASE = "https://aklman.com";

interface BlogPost {
  slug: string;
  title: string;
  description: string;
  pubDate: string;
  link: string;
  coverImage: string | null;
  categories: string[];
  tags: string[];
  readingTime: number | null;
  locale: string;
  content: string;
  series: string | null;
  seriesSlug: string | null;
}

interface BlogTaxonomy {
  slug: string;
  name: string;
  count: number;
}

interface CacheEntry {
  posts: BlogPost[];
  timestamp: number;
}

const cache: Record<string, CacheEntry> = {};
const CACHE_TTL = 5 * 60 * 1000;
const STALE_TTL = 30 * 60 * 1000;

const refreshInProgress: Record<string, boolean> = {};
const inFlightFetches: Map<string, Promise<BlogPost[]>> = new Map();

const contentCache: Map<string, { html: string; ts: number }> = new Map();
const CONTENT_TTL = 15 * 60 * 1000;

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

function extractArticleHtml(pageHtml: string): string {
  const articleMatch = pageHtml.match(/<article[^>]*>([\s\S]*?)<\/article>/i);
  if (articleMatch) return articleMatch[1];
  const mainMatch = pageHtml.match(/<main[^>]*>([\s\S]*?)<\/main>/i);
  if (mainMatch) return mainMatch[1];
  return "";
}

async function fetchPostContent(url: string): Promise<string> {
  const cached = contentCache.get(url);
  if (cached && Date.now() - cached.ts < CONTENT_TTL) return cached.html;
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "aklman-mobile/1.0" },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return "";
    const html = await res.text();
    const extracted = extractArticleHtml(html);
    contentCache.set(url, { html: extracted, ts: Date.now() });
    return extracted;
  } catch {
    return "";
  }
}

function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

function extractSlugFromUrl(url: string): string {
  const clean = url.split("?")[0]!.split("#")[0]!.replace(/\/+$/, "");
  const lastSegment = clean.split("/").filter(Boolean).pop();
  return lastSegment ?? slugify(url);
}

function extractSeriesFromUrl(url: string): { seriesSlug: string | null; seriesName: string | null } {
  const match = url.match(/\/posts\/([^/?#]+)\/([^/?#]+)/);
  if (match) {
    const seriesSlug = match[1];
    const seriesName = seriesSlug
      .split("-")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
    return { seriesSlug, seriesName };
  }
  return { seriesSlug: null, seriesName: null };
}

function extractCoverImage(content: string): string | null {
  if (!content) return null;
  const match = content.match(/<img[^>]+src="([^"]+)"/i);
  return match ? match[1] : null;
}

function estimateReadingTime(content: string): number {
  const text = content.replace(/<[^>]+>/g, " ");
  const words = text.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 200));
}

function getText(val: unknown): string {
  if (val === null || val === undefined) return "";
  if (typeof val === "string") return val;
  if (typeof val === "object" && val !== null) {
    const obj = val as Record<string, unknown>;
    if ("__cdata" in obj) return String(obj["__cdata"] ?? "");
    if ("#text" in obj) return String(obj["#text"] ?? "");
  }
  return String(val);
}

function getMeta(html: string, property: string): string {
  const re = new RegExp(`<meta[^>]+(?:property|name)="${property}"[^>]+content="([^"]*)"`, "i");
  const m = html.match(re) ?? html.match(new RegExp(`<meta[^>]+content="([^"]*)"[^>]+(?:property|name)="${property}"`, "i"));
  return m ? m[1] : "";
}

function getAllMeta(html: string, property: string): string[] {
  const re = new RegExp(`<meta[^>]+(?:property|name)="${property}"[^>]+content="([^"]*)"`, "gi");
  const results: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    if (m[1]) results.push(m[1]);
  }
  if (results.length === 0) {
    const re2 = new RegExp(`<meta[^>]+content="([^"]*)"[^>]+(?:property|name)="${property}"`, "gi");
    while ((m = re2.exec(html)) !== null) {
      if (m[1]) results.push(m[1]);
    }
  }
  return results;
}

async function fetchPostMetadataFromPage(url: string, locale: string): Promise<BlogPost | null> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "aklman-mobile/1.0" },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return null;
    const html = await res.text();

    const rawTitle = getMeta(html, "og:title") || getMeta(html, "title") || "";
    const title = rawTitle.replace(/\s*·\s*Aklman Blog\s*$/i, "").trim();
    if (!title) return null;

    const description = getMeta(html, "description") || getMeta(html, "og:description") || "";
    const pubDateRaw = getMeta(html, "article:published_time");
    const pubDate = pubDateRaw ? new Date(pubDateRaw).toUTCString() : "";
    const tags = getAllMeta(html, "article:tag");
    const content = extractArticleHtml(html);
    const coverImage = extractCoverImage(content) || getMeta(html, "og:image") || null;
    const readingTime = content ? estimateReadingTime(content) : null;

    const normalizedUrl = url.replace(/\/+$/, "");
    const slug = extractSlugFromUrl(normalizedUrl);
    const { seriesSlug, seriesName } = extractSeriesFromUrl(normalizedUrl);

    const linkWithSlash = normalizedUrl + "/";

    return {
      slug,
      title,
      description,
      pubDate,
      link: linkWithSlash,
      coverImage,
      categories: [],
      tags,
      readingTime,
      locale,
      content,
      series: seriesName,
      seriesSlug,
    };
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
    const sitemapUrls = [...indexXml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim());

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
          const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)]
            .map((m) => m[1].trim())
            .filter((u) => u.match(/\/posts\/[^/]+\/[^/]+\/?$/) || u.match(/\/posts\/[^/]+\/?$/) && !u.endsWith("/posts/"));
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

function filterSitemapUrlsByLocale(urls: string[], locale: string): string[] {
  if (locale === "zh-cn") {
    return urls.filter((u) => u.includes(`${SITE_BASE}/zh-cn/`));
  }
  return urls.filter((u) => !u.includes(`${SITE_BASE}/zh-cn/`));
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

      const parser = new XMLParser({
        ignoreAttributes: false,
        attributeNamePrefix: "@_",
        cdataPropName: "__cdata",
        isArray: (name) => name === "item" || name === "category",
      });

      const parsed = parser.parse(xml) as Record<string, unknown>;
      const rss = parsed["rss"] as Record<string, unknown> | undefined;
      const channel = rss?.["channel"] as Record<string, unknown> | undefined;

      if (channel) {
        const items = (channel["item"] as unknown[]) ?? [];

        rssPosts = items.map((raw) => {
          const item = raw as Record<string, unknown>;
          const title = getText(item["title"]);
          const link = getText(item["link"]);
          const description = getText(item["description"]);
          const pubDate = getText(item["pubDate"]);
          const content = getText(item["content:encoded"]);

          const rawCats = item["category"] as unknown[] | undefined;
          const allCats: string[] = rawCats
            ? rawCats.map((c) => getText(c)).filter(Boolean)
            : [];

          const categories: string[] = allCats.slice(0, 1);
          const tags: string[] = allCats.length > 1 ? allCats.slice(1) : allCats;

          const slug = extractSlugFromUrl(link);
          const coverImage = extractCoverImage(content);
          const readingTime = content ? estimateReadingTime(content) : null;
          const { seriesSlug, seriesName } = extractSeriesFromUrl(link);

          return {
            slug,
            title,
            description,
            pubDate,
            link,
            coverImage,
            categories,
            tags,
            readingTime,
            locale,
            content,
            series: seriesName,
            seriesSlug,
          };
        });
      }
    }
  } catch {
    // fall through to sitemap scraping
  }

  const rssPostLinks = new Set(
    rssPosts.map((p) => p.link.replace(/\/+$/, ""))
  );

  let sitemapPosts: BlogPost[] = [];
  let sitemapScrapeCount = 0;
  try {
    const sitemapUrls = await fetchSitemapPostUrls(locale);
    const newUrls = sitemapUrls.filter(
      (u) => !rssPostLinks.has(u.replace(/\/+$/, ""))
    );
    sitemapScrapeCount = newUrls.length;

    if (newUrls.length > 0) {
      const results = await withConcurrencyLimit(
        newUrls.map((u) => () => fetchPostMetadataFromPage(u, locale)),
        SCRAPE_CONCURRENCY
      );
      sitemapPosts = results
        .filter(
          (r): r is PromiseFulfilledResult<BlogPost> =>
            r.status === "fulfilled" && r.value !== null
        )
        .map((r) => r.value);
    }
  } catch (err) {
    logger.warn({ locale, err }, "blog: sitemap scraping failed");
  }

  const allPosts = [...rssPosts, ...sitemapPosts].sort((a, b) => {
    const da = a.pubDate ? new Date(a.pubDate).getTime() : 0;
    const db = b.pubDate ? new Date(b.pubDate).getTime() : 0;
    return db - da;
  });

  const now = Date.now();
  const posts = allPosts.length > 0 ? allPosts : (cache[locale]?.posts ?? []);
  cache[locale] = { posts, timestamp: now };

  logger.info(
    {
      locale,
      rssCount: rssPosts.length,
      sitemapScrapeCount,
      sitemapFound: sitemapPosts.length,
      totalPosts: posts.length,
      durationMs: now - t0,
    },
    "blog: feed refreshed"
  );

  return posts;
}

async function fetchFeed(locale: string): Promise<BlogPost[]> {
  const now = Date.now();
  const entry = cache[locale];

  if (entry) {
    const age = now - entry.timestamp;

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

function warmCache(): void {
  for (const locale of Object.keys(RSS_FEEDS)) {
    doFetchFeed(locale).catch(() => {});
  }
}

router.get("/posts", async (req, res) => {
  try {
    const locale = (req.query["locale"] as string) || "en";
    const category = req.query["category"] as string | undefined;
    const tag = req.query["tag"] as string | undefined;
    const series = req.query["series"] as string | undefined;
    const page = Math.max(1, parseInt((req.query["page"] as string) || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt((req.query["limit"] as string) || "20", 10)));

    let posts = await fetchFeed(locale);

    if (category) {
      posts = posts.filter((p) =>
        p.categories.some(
          (c) =>
            slugify(c) === category || c.toLowerCase() === category.toLowerCase()
        )
      );
    }

    if (tag) {
      posts = posts.filter((p) =>
        p.tags.some(
          (t) => slugify(t) === tag || t.toLowerCase() === tag.toLowerCase()
        )
      );
    }

    if (series) {
      posts = posts.filter((p) => p.seriesSlug === series);
    }

    const total = posts.length;
    const totalPages = Math.ceil(total / limit);
    const offset = (page - 1) * limit;
    const paginated = posts.slice(offset, offset + limit);

    res.json({
      posts: paginated,
      page,
      limit,
      total,
      totalPages,
      hasMore: page < totalPages,
    });
  } catch {
    res.status(500).json({ error: "Failed to fetch posts" });
  }
});

router.get("/posts/:slug", async (req, res) => {
  try {
    const locale = (req.query["locale"] as string) || "en";
    const posts = await fetchFeed(locale);
    const post = posts.find((p) => p.slug === req.params["slug"]);

    if (!post) {
      res.status(404).json({ error: "Post not found" });
      return;
    }

    let articleContent = post.content;
    if (!articleContent && post.link) {
      articleContent = await fetchPostContent(post.link);
    }

    const allPosts = await fetchFeed(locale);
    const related = allPosts
      .filter((p) => p.slug !== post.slug)
      .filter(
        (p) =>
          (post.seriesSlug && p.seriesSlug === post.seriesSlug) ||
          p.categories.some((c) => post.categories.includes(c)) ||
          p.tags.some((t) => post.tags.includes(t))
      )
      .slice(0, 3);

    res.json({ ...post, content: articleContent, related });
  } catch {
    res.status(500).json({ error: "Failed to fetch post" });
  }
});

router.get("/categories", async (req, res) => {
  try {
    const locale = (req.query["locale"] as string) || "en";
    const posts = await fetchFeed(locale);

    const counts = new Map<string, number>();
    for (const post of posts) {
      for (const cat of post.categories) {
        counts.set(cat, (counts.get(cat) || 0) + 1);
      }
    }

    const categories: BlogTaxonomy[] = Array.from(counts.entries())
      .map(([name, count]) => ({ slug: slugify(name), name, count }))
      .sort((a, b) => b.count - a.count);

    res.json(categories);
  } catch {
    res.status(500).json({ error: "Failed to fetch categories" });
  }
});

router.get("/tags", async (req, res) => {
  try {
    const locale = (req.query["locale"] as string) || "en";
    const posts = await fetchFeed(locale);

    const counts = new Map<string, number>();
    for (const post of posts) {
      for (const tag of post.tags) {
        counts.set(tag, (counts.get(tag) || 0) + 1);
      }
    }

    const tags: BlogTaxonomy[] = Array.from(counts.entries())
      .map(([name, count]) => ({ slug: slugify(name), name, count }))
      .sort((a, b) => b.count - a.count);

    res.json(tags);
  } catch {
    res.status(500).json({ error: "Failed to fetch tags" });
  }
});

router.get("/series", async (req, res) => {
  try {
    const locale = (req.query["locale"] as string) || "en";
    const posts = await fetchFeed(locale);

    const counts = new Map<string, { name: string; count: number }>();
    for (const post of posts) {
      if (post.seriesSlug && post.series) {
        const entry = counts.get(post.seriesSlug) ?? { name: post.series, count: 0 };
        entry.count++;
        counts.set(post.seriesSlug, entry);
      }
    }

    const series: BlogTaxonomy[] = Array.from(counts.entries())
      .map(([slug, { name, count }]) => ({ slug, name, count }))
      .sort((a, b) => b.count - a.count);

    res.json(series);
  } catch {
    res.status(500).json({ error: "Failed to fetch series" });
  }
});

router.get("/search", async (req, res) => {
  try {
    const locale = (req.query["locale"] as string) || "en";
    const q = ((req.query["q"] as string) || "").toLowerCase().trim();

    if (!q) {
      res.json([]);
      return;
    }

    const posts = await fetchFeed(locale);
    const results = posts.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.categories.some((c) => c.toLowerCase().includes(q))
    );

    res.json(results);
  } catch {
    res.status(500).json({ error: "Search failed" });
  }
});

warmCache();

export default router;
