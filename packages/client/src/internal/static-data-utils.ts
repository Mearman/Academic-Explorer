/**
 * Static data utilities for OpenAlex client
 * Internal utilities without external dependencies
 */

export type StaticEntityType = 'author' | 'work' | 'source' | 'institution' | 'topic' | 'publisher' | 'funder';

/**
 * Convert OpenAlex entity type to static entity type
 */
export function toStaticEntityType(entityType: string): StaticEntityType {
	switch (entityType) {
		case 'authors':
			return 'author';
		case 'works':
			return 'work';
		case 'sources':
			return 'source';
		case 'institutions':
			return 'institution';
		case 'topics':
			return 'topic';
		case 'publishers':
			return 'publisher';
		case 'funders':
			return 'funder';
		default:
			throw new Error(`Unknown entity type: ${entityType}`);
	}
}

/**
 * Clean OpenAlex ID by removing URL prefix if present
 */
export function cleanOpenAlexId(id: string): string {
	// Handle null/undefined/empty - return as-is to preserve for error handling
	if (!id || typeof id !== 'string') {
		return id;
	}
	// Remove https://openalex.org/ prefix if present
	if (id.startsWith('https://openalex.org/')) {
		return id.replace('https://openalex.org/', '');
	}
	return id;
}