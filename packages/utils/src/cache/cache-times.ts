/**
 * Cache timing configurations for different entity types
 */

export const ENTITY_CACHE_TIMES = {
	works: {
		stale: 1000 * 60 * 60 * 24, // 1 day
		gc: 1000 * 60 * 60 * 24 * 7, // 7 days
	},
	authors: {
		stale: 1000 * 60 * 60 * 12, // 12 hours
		gc: 1000 * 60 * 60 * 24 * 3, // 3 days
	},
	sources: {
		stale: 1000 * 60 * 60 * 24 * 7, // 7 days
		gc: 1000 * 60 * 60 * 24 * 30, // 30 days
	},
	institutions: {
		stale: 1000 * 60 * 60 * 24 * 30, // 30 days
		gc: 1000 * 60 * 60 * 24 * 90, // 90 days
	},
	topics: {
		stale: 1000 * 60 * 60 * 24 * 7, // 7 days
		gc: 1000 * 60 * 60 * 24 * 30, // 30 days
	},
	publishers: {
		stale: 1000 * 60 * 60 * 24 * 30, // 30 days
		gc: 1000 * 60 * 60 * 24 * 90, // 90 days
	},
	funders: {
		stale: 1000 * 60 * 60 * 24 * 30, // 30 days
		gc: 1000 * 60 * 60 * 24 * 90, // 90 days
	},
	keywords: {
		stale: 1000 * 60 * 60 * 24 * 7, // 7 days
		gc: 1000 * 60 * 60 * 24 * 30, // 30 days
	},
	concepts: {
		stale: 1000 * 60 * 60 * 24 * 7, // 7 days
		gc: 1000 * 60 * 60 * 24 * 30, // 30 days
	},
	search: {
		stale: 1000 * 60 * 5, // 5 minutes
		gc: 1000 * 60 * 60, // 1 hour
	},
	related: {
		stale: 1000 * 60 * 60 * 6, // 6 hours
		gc: 1000 * 60 * 60 * 24, // 1 day
	},
} as const;
