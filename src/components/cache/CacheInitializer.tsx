/**
 * Cache Initializer Component
 * Handles asynchronous cache initialization with version checking before rendering the app
 */

import { type ReactNode, useEffect, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Center, Text, Stack, Progress } from "@mantine/core";
import { IconDatabase, IconRefresh } from "@tabler/icons-react";
import { initializeQueryClient, createStandardQueryClient } from "@/lib/cache/cache-init";
import type { InvalidationResult } from "@/lib/cache/cache-invalidator";
import { logger } from "@/lib/logger";
import { useAutoRelationshipDetection } from "@/hooks/use-auto-relationship-detection";

interface CacheInitializerProps {
  children: ReactNode;
}

interface InitializationState {
  status: "loading" | "ready" | "error";
  queryClient?: QueryClient;
  invalidationResult?: InvalidationResult;
  error?: string;
}

/**
 * Component that enables automatic relationship detection for all entity types
 * This component just runs the hook and renders nothing
 */
function AutoRelationshipDetector() {
	useAutoRelationshipDetection();
	return null;
}

/**
 * Component that initializes cache with version checking before rendering children
 */
export function CacheInitializer({ children }: CacheInitializerProps) {
	const [state, setState] = useState<InitializationState>({ status: "loading" });

	useEffect(() => {
		let isMounted = true;

		async function initialize() {
			try {
				logger.debug("cache", "Starting cache initialization with version checking");

				const { queryClient, invalidationResult } = await initializeQueryClient();

				if (isMounted) {
					setState({
						status: "ready",
						queryClient,
						invalidationResult
					});

					if (invalidationResult.triggered) {
						logger.debug("cache", "Cache initialization completed with invalidation", {
							reason: invalidationResult.reason,
							clearedLayers: invalidationResult.clearedLayers
						});
					} else {
						logger.debug("cache", "Cache initialization completed without invalidation");
					}
				}
			} catch (error) {
				logger.error("cache", "Cache initialization failed, falling back to standard client", { error });

				if (isMounted) {
					// Fallback to standard query client without persistence
					const fallbackClient = createStandardQueryClient();
					setState({
						status: "ready",
						queryClient: fallbackClient,
						error: error instanceof Error ? error.message : "Unknown error"
					});
				}
			}
		}

		void initialize();

		return () => {
			isMounted = false;
		};
	}, []);

	// Show loading state during initialization
	if (state.status === "loading") {
		return (
			<Center style={{ height: "100vh" }}>
				<Stack align="center" gap="md">
					<IconDatabase size={48} color="var(--mantine-color-blue-6)" />
					<Text size="lg" fw={500}>Initializing Academic Explorer</Text>
					<Text size="sm" c="dimmed">Checking for updates and preparing cache...</Text>
					<Progress size="sm" value={100} animated style={{ width: 200 }} />
				</Stack>
			</Center>
		);
	}

	// Show error state if initialization failed completely
	if (state.status === "error" || !state.queryClient) {
		return (
			<Center style={{ height: "100vh" }}>
				<Stack align="center" gap="md">
					<IconRefresh size={48} color="var(--mantine-color-red-6)" />
					<Text size="lg" fw={500} c="red">Initialization Failed</Text>
					<Text size="sm" c="dimmed">
						{state.error || "Unable to initialize cache system"}
					</Text>
					<Text size="xs" c="dimmed">
            Please refresh the page to try again
					</Text>
				</Stack>
			</Center>
		);
	}

	// Render app with initialized query client
	return (
		<QueryClientProvider client={state.queryClient}>
			<AutoRelationshipDetector />
			{children}
		</QueryClientProvider>
	);
}

