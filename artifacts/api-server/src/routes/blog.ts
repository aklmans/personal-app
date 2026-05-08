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

function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

function extractSlugFromUrl(url: string): string {
  const match = url.match(/\/posts\/([^/?#]+)/);
  return match ? match[1] : slugify(url);
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
      const categories: string[] = rawCats
        ? rawCats.map((c) => getText(c)).filter(Boolean)
        : [];

      const slug = extractSlugFromUrl(link);
      const coverImage = extractCoverImage(content);
      const readingTime = content ? estimateReadingTime(content) : null;

      return {
        slug,
        title,
        description,
        pubDate,
        link,
        coverImage,
        categories,
        tags: [],
        readingTime,
        locale,
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

    let posts = await fetchFeed(locale);

    if (category) {
      posts = posts.filter((p) =>
        p.categories.some(
          (c) =>
            slugify(c) === category || c.toLowerCase() === category.toLowerCase()
        )
      );
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

    res.json(post);
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
