/**
 * Cache Initializer Component
 * Handles asynchronous cache initialization with version checking before rendering the app
 */

import { type ReactNode, useEffect, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Center, Text, Stack, Progress } from "@mantine/core";
import { IconDatabase, IconRefresh } from "@tabler/icons-react";
import { logger } from "@academic-explorer/utils/logger";
import { useAutoRelationshipDetection } from "@/hooks/use-auto-relationship-detection";

interface CacheInitializerProps {
  children: ReactNode;
}

interface InitializationState {
  status: "loading" | "ready" | "error";
  queryClient?: QueryClient;
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

		function initialize() {
			try {
				logger.debug("cache", "Starting cache initialization");

				// Create a standard QueryClient with reasonable defaults
				const queryClient = new QueryClient({
					defaultOptions: {
						queries: {
							staleTime: 5 * 60 * 1000, // 5 minutes
							gcTime: 10 * 60 * 1000,   // 10 minutes (formerly cacheTime)
							retry: 2,
							refetchOnWindowFocus: false,
						},
					},
				});

				if (isMounted) {
					setState({
						status: "ready",
						queryClient
					});

					logger.debug("cache", "Cache initialization completed successfully");
				}
			} catch (error) {
				logger.error("cache", "Cache initialization failed", { error });

				if (isMounted) {
					setState({
						status: "error",
						error: error instanceof Error ? error.message : "Unknown error"
					});
				}
			}
		}

		initialize();

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
						{state.error ?? "Unable to initialize cache system"}
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

