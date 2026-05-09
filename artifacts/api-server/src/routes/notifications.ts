import { Router } from "express";
import { existsSync } from "fs";
import { readFile, writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { logger } from "../lib/logger";

const router = Router();

const RSS_FEEDS: Record<string, string> = {
  en: "https://aklman.com/rss.xml",
  "zh-cn": "https://aklman.com/zh-cn/rss.xml",
};

const SITEMAP_INDEX = "https://aklman.com/sitemap-index.xml";
const SITE_BASE = "https://aklman.com";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";
const POLL_INTERVAL_MS = 10 * 60 * 1000;

const TOKENS_FILE = join(process.cwd(), "data", "push-tokens.json");

type TokenRecord = { token: string; locale: string; categories: string[] };

const registeredTokens = new Map<string, { locale: string; categories: string[] }>();

const knownPostSlugs = new Set<string>();
let initialized = false;

let _sitemapUrlsCache: { urls: string[]; ts: number } | null = null;
const SITEMAP_CACHE_TTL = 10 * 60 * 1000;

async function loadTokensFromDisk(): Promise<void> {
  try {
    await mkdir(join(process.cwd(), "data"), { recursive: true });
    if (!existsSync(TOKENS_FILE)) return;
    const raw = await readFile(TOKENS_FILE, "utf-8");
    const parsed = JSON.parse(raw) as unknown;

    if (Array.isArray(parsed)) {
      for (const item of parsed) {
        if (typeof item === "string") {
          registeredTokens.set(item, { locale: "en", categories: [] });
        } else if (item && typeof item === "object" && typeof (item as TokenRecord).token === "string") {
          const r = item as TokenRecord;
          registeredTokens.set(r.token, {
            locale: r.locale ?? "en",
            categories: Array.isArray(r.categories) ? r.categories : [],
          });
        }
      }
      logger.info({ count: registeredTokens.size }, "Loaded push tokens from disk");
    }
  } catch (err) {
    logger.warn({ err }, "Failed to load push tokens from disk");
  }
}

async function saveTokensToDisk(): Promise<void> {
  try {
    await mkdir(join(process.cwd(), "data"), { recursive: true });
    const records: TokenRecord[] = Array.from(registeredTokens.entries()).map(
      ([token, { locale, categories }]) => ({ token, locale, categories })
    );
    await writeFile(TOKENS_FILE, JSON.stringify(records), "utf-8");
  } catch (err) {
    logger.warn({ err }, "Failed to save push tokens to disk");
  }
}

function extractSlugFromUrl(url: string): string {
  const clean = url.split("?")[0]!.split("#")[0]!.replace(/\/+$/, "");
  const lastSegment = clean.split("/").filter(Boolean).pop();
  return lastSegment ?? url;
}

function filterSitemapUrlsByLocale(urls: string[], locale: string): string[] {
  if (locale === "zh-cn") {
    return urls.filter((u) => u.includes(`${SITE_BASE}/zh-cn/`));
  }
  return urls.filter((u) => !u.includes(`${SITE_BASE}/zh-cn/`));
}

function isPostUrl(url: string): boolean {
  return (
    url.match(/\/posts\/[^/]+\/[^/]+\/?$/) != null ||
    (url.match(/\/posts\/[^/]+\/?$/) != null && !url.endsWith("/posts/"))
  );
}

async function fetchSitemapPostSlugs(locale: string): Promise<{ slug: string; locale: string }[]> {
  const now = Date.now();

  if (!_sitemapUrlsCache || now - _sitemapUrlsCache.ts > SITEMAP_CACHE_TTL) {
    try {
      const indexRes = await fetch(SITEMAP_INDEX, {
        headers: { "User-Agent": "aklman-mobile/1.0" },
        signal: AbortSignal.timeout(10000),
      });
      if (!indexRes.ok) return [];

      const indexXml = await indexRes.text();
      const sitemapUrls = [...indexXml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]!.trim());

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
              .map((m) => m[1]!.trim())
              .filter(isPostUrl);
            allPostUrls.push(...urls);
          } catch {
            // ignore individual sitemap failures
          }
        })
      );

      _sitemapUrlsCache = { urls: allPostUrls, ts: now };
    } catch {
      return [];
    }
  }

  const localeUrls = filterSitemapUrlsByLocale(_sitemapUrlsCache!.urls, locale);
  return localeUrls.map((url) => ({ slug: extractSlugFromUrl(url), locale }));
}

async function fetchRssPostSlugs(locale: string): Promise<{ slug: string; title: string; locale: string; categories: string[] }[]> {
  const feedUrl = RSS_FEEDS[locale];
  if (!feedUrl) return [];
  try {
    const res = await fetch(feedUrl, {
      headers: { "User-Agent": "aklman-mobile/1.0" },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return [];
    const xml = await res.text();

    const itemMatches = xml.matchAll(/<item>([\s\S]*?)<\/item>/gi);
    const items: { slug: string; title: string; locale: string; categories: string[] }[] = [];
    for (const match of itemMatches) {
      const block = match[1] ?? "";
      const titleM = block.match(/<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/i);
      const linkM = block.match(/<link>([\s\S]*?)<\/link>/i);
      const title = (titleM?.[1] ?? "").trim();
      const link = (linkM?.[1] ?? "").trim();
      const catMatches = [...block.matchAll(/<category>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/category>/gi)];
      const categories = catMatches.map((m) => (m[1] ?? "").trim()).filter(Boolean);
      if (link) {
        items.push({ slug: extractSlugFromUrl(link), title, locale, categories });
      }
    }
    return items;
  } catch {
    return [];
  }
}

async function sendExpoPushNotifications(messages: object[]): Promise<void> {
  if (messages.length === 0) return;
  let tokensInvalidated = false;
  try {
    const chunks: object[][] = [];
    for (let i = 0; i < messages.length; i += 100) {
      chunks.push(messages.slice(i, i + 100));
    }
    for (const chunk of chunks) {
      const res = await fetch(EXPO_PUSH_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(chunk),
        signal: AbortSignal.timeout(15000),
      });
      if (res.ok) {
        const body = await res.json() as {
          data?: Array<{ status: string; details?: { error?: string } }>;
        };
        if (Array.isArray(body.data)) {
          const tokensInChunk = (chunk as Array<{ to: string }>).map((m) => m.to);
          body.data.forEach((result, i) => {
            if (
              result.status === "error" &&
              result.details?.error === "DeviceNotRegistered"
            ) {
              const token = tokensInChunk[i];
              if (token && registeredTokens.has(token)) {
                registeredTokens.delete(token);
                tokensInvalidated = true;
                logger.info({ tokenPrefix: token.slice(0, 16) }, "Removed invalid push token");
              }
            }
          });
        }
      }
    }
  } catch (err) {
    logger.error({ err }, "Failed to send Expo push notifications");
  }
  if (tokensInvalidated) {
    saveTokensToDisk().catch(() => {});
  }
}

async function pollAndNotify(): Promise<void> {
  if (registeredTokens.size === 0 && initialized) return;

  const newPosts: { slug: string; title: string; locale: string; categories: string[] }[] = [];

  for (const locale of Object.keys(RSS_FEEDS)) {
    const rssItems = await fetchRssPostSlugs(locale);
    const sitemapItems = await fetchSitemapPostSlugs(locale);

    const allSlugs = new Map<string, { slug: string; title: string; locale: string; categories: string[] }>();
    for (const item of rssItems) {
      allSlugs.set(item.slug, { slug: item.slug, title: item.title, locale, categories: item.categories });
    }
    for (const item of sitemapItems) {
      if (!allSlugs.has(item.slug)) {
        allSlugs.set(item.slug, { slug: item.slug, title: "", locale, categories: [] });
      }
    }

    for (const item of allSlugs.values()) {
      const key = `${locale}:${item.slug}`;
      if (!knownPostSlugs.has(key)) {
        knownPostSlugs.add(key);
        if (initialized) {
          newPosts.push(item);
        }
      }
    }
  }

  if (!initialized) {
    initialized = true;
    logger.info({ count: knownPostSlugs.size }, "Notification poller initialized with existing posts");
    return;
  }

  if (newPosts.length === 0 || registeredTokens.size === 0) return;

  logger.info({ count: newPosts.length, tokens: registeredTokens.size }, "Sending push notifications for new posts");

  for (const post of newPosts) {
    const matchingTokens = Array.from(registeredTokens.entries())
      .filter(([, rec]) => {
        if (rec.locale !== post.locale) return false;
        if (rec.categories.length === 0) return true;
        if (post.categories.length === 0) return true;
        return post.categories.some((c) => rec.categories.includes(c));
      })
      .map(([token]) => token);

    if (matchingTokens.length === 0) continue;

    const messages = matchingTokens.map((token) => ({
      to: token,
      title: "New post on aklman",
      body: post.title || "A new article has been published",
      data: { slug: post.slug, locale: post.locale },
      sound: "default",
    }));
    await sendExpoPushNotifications(messages);
  }
}

async function bootstrap(): Promise<void> {
  await loadTokensFromDisk();
  await pollAndNotify();
  setInterval(() => {
    pollAndNotify().catch((err) => {
      logger.error({ err }, "Notification poll cycle failed");
    });
  }, POLL_INTERVAL_MS);
}

bootstrap().catch((err) => {
  logger.error({ err }, "Failed to initialize notification poller");
});

function isValidExpoToken(token: string): boolean {
  return /^ExponentPushToken\[.+\]$/.test(token) || /^[a-zA-Z0-9_-]{20,}$/.test(token);
}

const VALID_LOCALES = new Set(Object.keys(RSS_FEEDS));

router.post("/register", async (req, res) => {
  const { token, locale, categories } = req.body as { token?: string; locale?: string; categories?: unknown };
  if (!token || typeof token !== "string" || !isValidExpoToken(token)) {
    res.status(400).json({ error: "valid Expo push token is required" });
    return;
  }
  const resolvedLocale = locale && VALID_LOCALES.has(locale) ? locale : "en";
  const resolvedCategories: string[] = Array.isArray(categories)
    ? (categories as unknown[]).filter((c): c is string => typeof c === "string")
    : [];
  registeredTokens.set(token, { locale: resolvedLocale, categories: resolvedCategories });
  await saveTokensToDisk();
  logger.info({ tokenCount: registeredTokens.size, locale: resolvedLocale, categoryCount: resolvedCategories.length }, "Push token registered");
  res.json({ ok: true });
});

router.post("/unregister", async (req, res) => {
  const { token } = req.body as { token?: string };
  if (!token || typeof token !== "string") {
    res.status(400).json({ error: "token is required" });
    return;
  }
  registeredTokens.delete(token);
  await saveTokensToDisk();
  logger.info({ tokenCount: registeredTokens.size }, "Push token unregistered");
  res.json({ ok: true });
});

export default router;
