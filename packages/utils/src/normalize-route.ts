import { parse, stringify } from "qs";

const SENSITIVE_PARAMS = ["api_key", "cursor", "mailto"];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function normalizeRoute({
  path,
  search,
}: {
  path: string;
  search: string;
}): string {
  const query = search.startsWith("?") ? search.slice(1) : search;

  try {
    const parsedRaw = parse(query);

    // Safely handle the parsed query object
    const parsed = isRecord(parsedRaw) ? parsedRaw : {};

    for (const key of SENSITIVE_PARAMS) {
      delete parsed[key];
    }

    const sortedKeys = Object.keys(parsed).sort();
    const sortedQuery: Record<string, unknown> = {};
    for (const key of sortedKeys) {
      sortedQuery[key] = parsed[key];
    }

    const normalizedSearch = stringify(sortedQuery, { encode: false });
    return normalizedSearch ? `${path}?${normalizedSearch}` : path;
  } catch {
    // If parsing fails, return the path as-is
    return path;
  }
}
