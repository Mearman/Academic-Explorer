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