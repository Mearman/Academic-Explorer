const SENSITIVE_PARAMS = ["api_key", "cursor", "mailto"]


function parseQueryString(query: string): Record<string, unknown> {
	const result: Record<string, unknown> = {}
	if (!query) return result

	const pairs = query.split("&")
	for (const pair of pairs) {
		const [key, value] = pair.split("=")
		if (key) {
			const decodedKey = decodeURIComponent(key)
			const decodedValue = value ? decodeURIComponent(value) : ""
			result[decodedKey] = decodedValue
		}
	}
	return result
}

function stringifyQueryString(obj: Record<string, unknown>): string {
	const pairs: string[] = []
	for (const [key, value] of Object.entries(obj)) {
		if (value !== undefined && value !== null) {
			const encodedKey = encodeURIComponent(key)
			const encodedValue = encodeURIComponent(String(value))
			pairs.push(`${encodedKey}=${encodedValue}`)
		}
	}
	return pairs.join("&")
}

export function normalizeRoute({ path, search }: { path: string; search: string }): string {
	const query = search.startsWith("?") ? search.slice(1) : search

	const parsed = parseQueryString(query)

	for (const key of SENSITIVE_PARAMS) {
		delete parsed[key]
	}

	const sortedKeys = Object.keys(parsed).sort()
	const sortedQuery: Record<string, unknown> = {}
	for (const key of sortedKeys) {
		sortedQuery[key] = parsed[key]
	}

	const normalizedSearch = stringifyQueryString(sortedQuery)
	return normalizedSearch ? `${path}?${normalizedSearch}` : path
}
