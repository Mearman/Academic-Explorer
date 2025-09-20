/**
 * Shared service provider for singleton service instances
 * Prevents excessive constructor calls and improves performance
 */

import type { QueryClient } from "@tanstack/react-query";
import { GraphDataService } from "@/services/graph-data-service";
import { RelationshipDetectionService, createRelationshipDetectionService } from "@/services/relationship-detection-service";

// Singleton instances
let graphDataServiceInstance: GraphDataService | null = null;
let relationshipDetectionServiceInstance: RelationshipDetectionService | null = null;
let currentQueryClient: QueryClient | null = null;

/**
 * Get or create a shared GraphDataService instance
 */
export function getGraphDataService(queryClient: QueryClient): GraphDataService {
	// If query client changed, recreate instances
	if (currentQueryClient !== queryClient) {
		currentQueryClient = queryClient;
		graphDataServiceInstance = null;
		relationshipDetectionServiceInstance = null;
	}

	if (!graphDataServiceInstance) {
		graphDataServiceInstance = new GraphDataService(queryClient);
	}

	return graphDataServiceInstance;
}

/**
 * Get or create a shared RelationshipDetectionService instance
 */
export function getRelationshipDetectionService(queryClient: QueryClient): RelationshipDetectionService {
	// If query client changed, recreate instances
	if (currentQueryClient !== queryClient) {
		currentQueryClient = queryClient;
		graphDataServiceInstance = null;
		relationshipDetectionServiceInstance = null;
	}

	if (!relationshipDetectionServiceInstance) {
		relationshipDetectionServiceInstance = createRelationshipDetectionService(queryClient);
	}

	return relationshipDetectionServiceInstance;
}

/**
 * Clear all cached service instances (useful for testing)
 */
export function clearServiceInstances(): void {
	graphDataServiceInstance = null;
	relationshipDetectionServiceInstance = null;
	currentQueryClient = null;
}