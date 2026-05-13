const SITE_ORIGIN = "https://aklman.com";
const DEFAULT_POST_COVER_PATH = "/og-image.png";

export const DEFAULT_POST_COVER_IMAGE = `${SITE_ORIGIN}${DEFAULT_POST_COVER_PATH}`;

export function resolvePostCoverImageUri(coverImage?: string | null): string {
  const trimmed = coverImage?.trim();
  if (!trimmed) return DEFAULT_POST_COVER_IMAGE;
  if (trimmed.startsWith("/")) return `${SITE_ORIGIN}${trimmed}`;
  return trimmed;
}
