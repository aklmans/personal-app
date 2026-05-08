import { Router } from "express";
import { XMLParser } from "fast-xml-parser";

const router = Router();

const RSS_FEEDS: Record<string, string> = {
  en: "https://aklman.com/rss.xml",
  "zh-cn": "https://aklman.com/zh-cn/rss.xml",
};

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

const contentCache: Map<string, { html: string; ts: number }> = new Map();
const CONTENT_TTL = 15 * 60 * 1000;

function extractArticleHtml(pageHtml: string): string {
  // Try <article>
  const articleMatch = pageHtml.match(/<article[^>]*>([\s\S]*?)<\/article>/i);
  if (articleMatch) return articleMatch[1];
  // Fallback: try <main>
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
  // Use first path segment after /posts/ as slug (series path)
  const match = url.match(/\/posts\/([^/?#]+)/);
  return match ? match[1] : slugify(url);
}

function extractSeriesFromUrl(url: string): { seriesSlug: string | null; seriesName: string | null } {
  // Pattern: /posts/{seriesSlug}/{postSlug}/
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

async function fetchFeed(locale: string): Promise<BlogPost[]> {
  const now = Date.now();
  const entry = cache[locale];
  if (entry && now - entry.timestamp < CACHE_TTL) {
    return entry.posts;
  }

  const url = RSS_FEEDS[locale] ?? RSS_FEEDS["en"];

  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "aklman-mobile/1.0" },
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

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

    if (!channel) throw new Error("Invalid RSS feed structure");

    const items = (channel["item"] as unknown[]) ?? [];

    const posts: BlogPost[] = items.map((raw) => {
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

      // Use first category as primary category; remaining as tags
      // (Astro RSS plugin outputs tags as <category> elements too)
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

    cache[locale] = { posts, timestamp: now };
    return posts;
  } catch (err) {
    if (cache[locale]) return cache[locale].posts;
    throw err;
  }
}

router.get("/posts", async (req, res) => {
  try {
    const locale = (req.query["locale"] as string) || "en";
    const category = req.query["category"] as string | undefined;

    const tag = req.query["tag"] as string | undefined;
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

    const series = req.query["series"] as string | undefined;
    if (series) {
      posts = posts.filter((p) => p.seriesSlug === series);
    }

    res.json(posts);
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

    // Scrape full article content if not already in the feed
    let articleContent = post.content;
    if (!articleContent && post.link) {
      articleContent = await fetchPostContent(post.link);
    }

    // Related posts: same series or overlapping categories, exclude self
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

export default router;
