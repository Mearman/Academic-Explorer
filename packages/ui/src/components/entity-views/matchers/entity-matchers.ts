// Matcher utilities for entity views
export interface EntityMatcher {
	test: (entity: any) => boolean;
	component: React.ComponentType<any>;
}

export function createMatcher(pattern: string | RegExp | ((entity: any) => boolean)): EntityMatcher {
	const test = typeof pattern === "string"
		? (entity: any) => entity.display_name?.includes(pattern)
		: pattern instanceof RegExp
		? (entity: any) => pattern.test(entity.display_name || "")
		: pattern;

	return {
		test,
		component: () => null, // Placeholder
	};
}

export const defaultMatchers: EntityMatcher[] = [
	createMatcher(/author/i),
	createMatcher(/work/i),
	createMatcher(/source/i),
	createMatcher(/institution/i),
	createMatcher(/topic/i),
];

/**
 * Converts an OpenAlex URL or ID to a relative URL path
 * @param urlOrId - Either a full OpenAlex URL (https://openalex.org/A123) or just an ID (A123)
 * @returns A hash-based relative URL (e.g., #/A123)
 */
export function convertToRelativeUrl(urlOrId: string): string {
	// Extract just the ID part if it's a full URL
	const id = urlOrId.replace(/^https?:\/\/[^/]+\//, '');
	return `#/${id}`;
}