const DEFAULT_DOMAIN = "localhost:5001";

const LOCAL_HOST_PATTERN = /^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/;

function resolveScheme(domain: string): "http" | "https" {
  if (process.env.EXPO_PUBLIC_SCHEME === "http") return "http";
  if (process.env.EXPO_PUBLIC_SCHEME === "https") return "https";
  return LOCAL_HOST_PATTERN.test(domain) ? "http" : "https";
}

const domain = process.env.EXPO_PUBLIC_DOMAIN ?? DEFAULT_DOMAIN;
const scheme = resolveScheme(domain);

export const API_ORIGIN = `${scheme}://${domain}`;
export const API_BASE = `${API_ORIGIN}/api`;
