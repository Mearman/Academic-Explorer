import { useParams, useNavigate } from "@tanstack/react-router";

export interface EntityRouteConfig {
	entityType: string;
	routePath: string;
}

export interface UseEntityRouteOptions {
	enableUrlCleanup?: boolean;
}

export interface UseEntityRouteResult {
	entityId: string;
	entityType: string;
	isLoading: boolean;
	error: string | null;
}

/**
 * Hook for handling entity routes with common functionality
 */
export function useEntityRoute(
	config: EntityRouteConfig,
	options: UseEntityRouteOptions = {}
): UseEntityRouteResult {
	const { entityType, routePath } = config;
	const { enableUrlCleanup = true } = options;

	const params = useParams({ from: routePath });
	const navigate = useNavigate();

	// Extract entity ID from params (this will need to be adapted based on actual param structure)
	const entityId = Object.values(params)[0] as string;

	return {
		entityId,
		entityType,
		isLoading: false,
		error: null,
	};
}