import { useState } from "react";
import { useParams, useSearch } from "@tanstack/react-router";
import type { EntityType } from "@academic-explorer/types";
import { logger } from "../logger";

export interface EntityRouteConfig {
	entityType: string;
	routePath: string;
	paramKey: string;
	fields: unknown;
	randomApiCall: (count: number) => Promise<unknown>;
	logContext: string;
}

export interface UseEntityRouteOptions {
	skipRandomEntity?: boolean;
	skipUrlDecoding?: boolean;
}

export interface UseEntityRouteResult<T = unknown> {
	// Clean entity ID and type
	cleanEntityId: string;
	entityType: string;

	// Navigation state
	viewMode: "raw" | "rich";
	setViewMode: (mode: "raw" | "rich") => void;

	// Loading states
	isLoadingRandom: boolean;

	// Data hooks - stubs for now, should be properly implemented
	graphData: { data: unknown; isLoading: boolean; error: Error | null };
	miniGraphData: { data: unknown; isLoading: boolean; error: Error | null };
	rawEntityData: { data: T | undefined; isLoading: boolean; error: Error | null };
	userInteractions: unknown;

	// Graph state
	nodeCount: number;
	loadEntity: (entity: unknown) => void;
	loadEntityIntoGraph: (entity: unknown) => void;

	// Route search params
	routeSearch: Record<string, unknown>;
}

/**
 * STUB IMPLEMENTATION
 * This hook needs to be properly implemented with real dependencies.
 * Currently stubbed to allow the utils package to build.
 *
 * TODO: Implement with proper app-specific hooks or move to apps/web
 */
export function useEntityRoute<T = unknown>(
	config: EntityRouteConfig,
	_options: UseEntityRouteOptions = {}
): UseEntityRouteResult<T> {
	const params = useParams({ strict: false }) as Record<string, string>;
	const search = useSearch({ strict: false }) as Record<string, unknown>;
	const [viewMode, setViewMode] = useState<"raw" | "rich">("rich");

	// Extract entity ID from params using the config's paramKey
	const rawId = params[config.paramKey] || "";
	// Safely clean the entity ID - handle undefined/null cases
	const cleanEntityId = rawId ? rawId.replace(/^https?:\/\/(?:.*?)openalex\.org\//, "") : "";

	return {
		cleanEntityId,
		entityType: config.entityType,
		viewMode,
		setViewMode,
		isLoadingRandom: false,
		graphData: { data: null, isLoading: false, error: null },
		miniGraphData: { data: null, isLoading: false, error: null },
		rawEntityData: { data: undefined, isLoading: false, error: null },
		userInteractions: null,
		nodeCount: 0,
		loadEntity: () => {
			logger.warn("routing", "useEntityRoute: loadEntity not implemented");
		},
		loadEntityIntoGraph: () => {
			logger.warn("routing", "useEntityRoute: loadEntityIntoGraph not implemented");
		},
		routeSearch: search,
	};
}