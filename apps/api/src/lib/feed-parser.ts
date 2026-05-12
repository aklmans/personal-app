import { XMLParser } from "fast-xml-parser";

import type { BlogPost } from "./feed-types";

export function extractArticleHtml(pageHtml: string): string {
  const articleMatch = pageHtml.match(/<article[^>]*>([\s\S]*?)<\/article>/i);
  if (articleMatch) return articleMatch[1];
  const mainMatch = pageHtml.match(/<main[^>]*>([\s\S]*?)<\/main>/i);
  if (mainMatch) return mainMatch[1];
  return "";
}

export function slugify(str: string): string {
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

export function parsePostMetadataFromPage(url: string, locale: string, html: string): BlogPost | null {
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
}

export function parseRssFeed(xml: string, locale: string): BlogPost[] {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    cdataPropName: "__cdata",
    isArray: (name) => name === "item" || name === "category",
  });

  const parsed = parser.parse(xml) as Record<string, unknown>;
  const rss = parsed["rss"] as Record<string, unknown> | undefined;
  const channel = rss?.["channel"] as Record<string, unknown> | undefined;

  if (!channel) return [];

  const items = (channel["item"] as unknown[]) ?? [];

  return items.map((raw) => {
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
