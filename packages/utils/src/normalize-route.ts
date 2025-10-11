import { parse, stringify } from 'qs';

const SENSITIVE_PARAMS = ['api_key', 'cursor', 'mailto']

export function normalizeRoute(path: string, search: string): string {
  const query = search.startsWith('?') ? search.slice(1) : search
  const parsed = parse(query)
  for (const key of SENSITIVE_PARAMS) {
    delete parsed[key]
  }
  const sortedKeys = Object.keys(parsed).sort()
  const sortedQuery: Record<string, unknown> = {}
  for (const key of sortedKeys) {
    sortedQuery[key] = parsed[key]
  }
  const normalizedSearch = stringify(sortedQuery, { encode: false })
  return normalizedSearch ? `${path}?${normalizedSearch}` : path
}
