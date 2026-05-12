export const SITE_BASE = "https://aklman.com";

export function extractSitemapLocs(xml: string): string[] {
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim());
}

export function filterSitemapPostUrls(urls: string[]): string[] {
  return urls.filter((u) => u.match(/\/posts\/[^/]+\/[^/]+\/?$/) || u.match(/\/posts\/[^/]+\/?$/) && !u.endsWith("/posts/"));
}

export function filterSitemapUrlsByLocale(urls: string[], locale: string): string[] {
  if (locale === "zh-cn") {
    return urls.filter((u) => u.includes(`${SITE_BASE}/zh-cn/`));
  }
  return urls.filter((u) => !u.includes(`${SITE_BASE}/zh-cn/`));
}
