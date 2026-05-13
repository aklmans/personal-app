import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

type Locale = "en" | "zh-cn";

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
  locale: Locale;
  content: string;
  series: string | null;
  seriesSlug: string | null;
}

interface CacheEntry {
  posts: BlogPost[];
  timestamp: number;
}

interface Frontmatter {
  title: string;
  description: string;
  date: string;
  categories: string[];
  tags: string[];
  series: string | null;
}

const REPO_ROOT = path.resolve(import.meta.dirname, "../..");
const IMPORT_DIR = path.join(REPO_ROOT, "apps/data/imported-markdown");
const IMPORTED_POSTS_FILE = path.join(REPO_ROOT, "apps/data/imported-posts.json");
const CACHE_DIR = path.join(REPO_ROOT, "apps/data/cache");
const CONTENT_CACHE_DIR = path.join(CACHE_DIR, "content");

function slugifyAscii(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function stableHash(input: string): string {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 31 + input.charCodeAt(i)) | 0;
  }
  return Math.abs(hash).toString(36);
}

function contentDiskCacheKey(url: string): string {
  return url
    .replace(/^https?:\/\//, "")
    .replace(/\/+$/, "")
    .replace(/[^a-zA-Z0-9_.-]/g, "_");
}

function estimateReadingTime(content: string): number {
  const text = content.replace(/<[^>]+>/g, " ");
  const words = text.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 200));
}

function extractCoverImage(content: string): string | null {
  const match = content.match(/<img[^>]+src="([^"]+)"/i);
  return match ? match[1] : null;
}

function parseFrontmatterValue(raw: string): unknown {
  const value = raw.trim();
  if (value.startsWith("\"") || value.startsWith("[") || value === "null") {
    return JSON.parse(value);
  }
  return value;
}

function parseMarkdownFile(raw: string): { frontmatter: Frontmatter; body: string } {
  const match = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!match) {
    throw new Error("Missing frontmatter");
  }

  const [, frontmatterRaw, body] = match;
  const frontmatterRecord: Record<string, unknown> = {};

  for (const line of frontmatterRaw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const idx = trimmed.indexOf(":");
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    const value = trimmed.slice(idx + 1);
    frontmatterRecord[key] = parseFrontmatterValue(value);
  }

  return {
    frontmatter: {
      title: String(frontmatterRecord["title"] ?? ""),
      description: String(frontmatterRecord["description"] ?? ""),
      date: String(frontmatterRecord["date"] ?? ""),
      categories: Array.isArray(frontmatterRecord["categories"]) ? frontmatterRecord["categories"].map(String) : [],
      tags: Array.isArray(frontmatterRecord["tags"]) ? frontmatterRecord["tags"].map(String) : [],
      series: frontmatterRecord["series"] == null ? null : String(frontmatterRecord["series"]),
    },
    body: body.trim(),
  };
}

function renderMarkdownToHtml(markdown: string): string {
  return execFileSync(
    "pandoc",
    ["--from=gfm", "--to=html5", "--wrap=none"],
    { input: markdown, encoding: "utf8" }
  ).trim();
}

function buildSeriesSlug(series: string | null): string | null {
  if (!series) return null;
  return slugifyAscii(series) || `series-${stableHash(series)}`;
}

function buildSlug(title: string, fileStem: string): string {
  return slugifyAscii(title) || fileStem;
}

function buildLink(locale: Locale, seriesSlug: string | null, slug: string): string {
  const localePrefix = locale === "zh-cn" ? "/zh-cn" : "";
  const seriesPart = seriesSlug ?? "imported";
  return `https://aklman.com${localePrefix}/posts/${seriesPart}/${slug}/`;
}

function buildPubDate(date: string, order: number): string {
  const hour = 8 + (order % 10);
  const minute = order % 60;
  return new Date(`${date}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00.000Z`).toUTCString();
}

function localeFromFilename(fileName: string): Locale {
  if (fileName.endsWith("-en.md")) return "en";
  if (fileName.endsWith("-zh.md")) return "zh-cn";
  throw new Error(`Unsupported locale in filename: ${fileName}`);
}

function sortImportedFileNames(fileNames: string[]): string[] {
  return [...fileNames].sort((a, b) => {
    const ai = Number((a.match(/post(\d+)-/) ?? [])[1] ?? "0");
    const bi = Number((b.match(/post(\d+)-/) ?? [])[1] ?? "0");
    return ai - bi;
  });
}

function toCachePost(post: BlogPost): BlogPost {
  return { ...post, content: "" };
}

function readCacheEntry(locale: Locale): CacheEntry {
  const file = path.join(CACHE_DIR, `posts-${locale}.json`);
  if (!fs.existsSync(file)) return { posts: [], timestamp: Date.now() };
  const raw = fs.readFileSync(file, "utf8");
  return JSON.parse(raw) as CacheEntry;
}

function mergePosts(existing: BlogPost[], imported: BlogPost[]): BlogPost[] {
  const merged: BlogPost[] = [];
  const seen = new Set<string>();
  for (const post of [...imported, ...existing]) {
    const key = `${post.locale}:${post.slug}`;
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(post);
  }
  return merged.sort((a, b) => {
    const da = a.pubDate ? new Date(a.pubDate).getTime() : 0;
    const db = b.pubDate ? new Date(b.pubDate).getTime() : 0;
    return db - da;
  });
}

function writeContentCache(post: BlogPost, ts: number): void {
  const cacheKey = contentDiskCacheKey(post.link);
  const file = path.join(CONTENT_CACHE_DIR, `${cacheKey}.json`);
  fs.writeFileSync(file, JSON.stringify({ url: post.link, html: post.content, ts }), "utf8");
}

function main(): void {
  if (!fs.existsSync(IMPORT_DIR)) {
    throw new Error(`Missing import dir: ${IMPORT_DIR}`);
  }

  fs.mkdirSync(CONTENT_CACHE_DIR, { recursive: true });

  const fileNames = sortImportedFileNames(
    fs.readdirSync(IMPORT_DIR).filter((file) => /^post\d+-(en|zh)\.md$/.test(file))
  );
  if (fileNames.length === 0) {
    throw new Error("No importable markdown files found");
  }

  const importedPosts: BlogPost[] = fileNames.map((fileName, index) => {
    const locale = localeFromFilename(fileName);
    const filePath = path.join(IMPORT_DIR, fileName);
    const fileStem = fileName.replace(/\.md$/, "");
    const raw = fs.readFileSync(filePath, "utf8");
    const { frontmatter, body } = parseMarkdownFile(raw);
    const html = renderMarkdownToHtml(body);
    const seriesSlug = buildSeriesSlug(frontmatter.series);
    const slug = buildSlug(frontmatter.title, fileStem);
    const pubDate = buildPubDate(frontmatter.date, index + 1);
    return {
      slug,
      title: frontmatter.title,
      description: frontmatter.description,
      pubDate,
      link: buildLink(locale, seriesSlug, slug),
      coverImage: extractCoverImage(html),
      categories: frontmatter.categories,
      tags: frontmatter.tags,
      readingTime: estimateReadingTime(html),
      locale,
      content: html,
      series: frontmatter.series,
      seriesSlug,
    };
  });

  fs.writeFileSync(IMPORTED_POSTS_FILE, JSON.stringify(importedPosts, null, 2) + "\n", "utf8");

  const now = Date.now();
  for (const locale of ["en", "zh-cn"] as const) {
    const localeImported = importedPosts.filter((post) => post.locale === locale);
    const existing = readCacheEntry(locale);
    const merged = mergePosts(existing.posts, localeImported.map(toCachePost));
    fs.writeFileSync(
      path.join(CACHE_DIR, `posts-${locale}.json`),
      JSON.stringify({ timestamp: now, posts: merged }),
      "utf8"
    );
  }

  for (const post of importedPosts) {
    writeContentCache(post, now);
  }

  console.log(`Imported ${importedPosts.length} posts (${importedPosts.filter((p) => p.locale === "en").length} en, ${importedPosts.filter((p) => p.locale === "zh-cn").length} zh-cn)`);
}

main();
