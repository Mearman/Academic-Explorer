/**
 * Static data provider for OpenAlex client
 * Stub implementation without external dependencies
 */

import type { StaticEntityType } from './static-data-utils';

interface StaticDataResult {
	found: boolean;
	data?: unknown;
}

/**
 * Stub static data provider
 * In the main app, this would connect to IndexedDB or other storage
 * For the package, we provide a no-op implementation
 */
class StaticDataProvider {
	async getStaticData(_entityType: StaticEntityType, _id: string): Promise<StaticDataResult> {
		// Stub implementation - always returns not found
		return { found: false };
	}

	async hasStaticData(_entityType: StaticEntityType, _id: string): Promise<boolean> {
		// Stub implementation - always returns false
		return false;
	}
}

export const staticDataProvider = new StaticDataProvider();