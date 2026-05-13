import fs from "node:fs";
import path from "node:path";

import type { BlogPost } from "./feed-types";

const IMPORTED_POSTS_FILE = path.resolve(__dirname, "../../data/imported-posts.json");

function withoutContent(post: BlogPost): BlogPost {
  return { ...post, content: "" };
}

function normalizeLink(link: string): string {
  return link.replace(/\/+$/, "");
}

function comparePostsByDateDesc(a: BlogPost, b: BlogPost): number {
  const da = a.pubDate ? new Date(a.pubDate).getTime() : 0;
  const db = b.pubDate ? new Date(b.pubDate).getTime() : 0;
  return db - da;
}

export function loadImportedPosts(locale: string): BlogPost[] {
  try {
    if (!fs.existsSync(IMPORTED_POSTS_FILE)) return [];
    const raw = fs.readFileSync(IMPORTED_POSTS_FILE, "utf8");
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((post): post is BlogPost => {
        if (!post || typeof post !== "object") return false;
        const candidate = post as Partial<BlogPost>;
        return candidate.locale === locale && typeof candidate.slug === "string" && typeof candidate.link === "string";
      })
      .sort(comparePostsByDateDesc);
  } catch {
    return [];
  }
}

export function mergeImportedPosts(posts: BlogPost[], importedPosts: BlogPost[]): BlogPost[] {
  if (importedPosts.length === 0) return posts;

  const merged: BlogPost[] = [];
  const seen = new Set<string>();

  for (const post of [...importedPosts.map(withoutContent), ...posts]) {
    const key = `${post.locale}:${post.slug}:${normalizeLink(post.link)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(post);
  }

  return merged.sort(comparePostsByDateDesc);
}

export function loadImportedPostContent(url: string): string | null {
  const normalizedUrl = normalizeLink(url);
  try {
    if (!fs.existsSync(IMPORTED_POSTS_FILE)) return null;
    const raw = fs.readFileSync(IMPORTED_POSTS_FILE, "utf8");
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return null;
    for (const post of parsed) {
      if (!post || typeof post !== "object") continue;
      const candidate = post as Partial<BlogPost>;
      if (typeof candidate.link !== "string" || typeof candidate.content !== "string") continue;
      if (normalizeLink(candidate.link) === normalizedUrl) return candidate.content;
    }
  } catch {
    return null;
  }
  return null;
}
