// Matcher utilities for entity views
import type { OpenAlexEntity } from "@academic-explorer/types";
import type { ComponentType } from "react";

export interface EntityMatcher {
	test: (entity: OpenAlexEntity) => boolean;
	component: ComponentType<{ entity: OpenAlexEntity }>;
}

export function createMatcher(pattern: string | RegExp | ((entity: OpenAlexEntity) => boolean)): EntityMatcher {
	const test = typeof pattern === "string"
		? (entity: OpenAlexEntity) => entity.display_name?.includes(pattern)
		: pattern instanceof RegExp
		? (entity: OpenAlexEntity) => pattern.test(entity.display_name || "")
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