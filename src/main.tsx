import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { createRouter, RouterProvider, createHashHistory } from "@tanstack/react-router"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { TanStackDevtools } from "@tanstack/react-devtools"
import { ReactQueryDevtoolsPanel } from "@tanstack/react-query-devtools"
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools"
import { OpenAlexCachePanel } from "./components/devtools/OpenAlexCachePanel"
import { EntityGraphPanel } from "./components/devtools/EntityGraphPanel"
import { ApplicationLoggerPanel } from "./components/devtools/ApplicationLoggerPanel"
import { setupGlobalErrorHandling } from "./lib/logger"
import { MantineProvider, createTheme } from "@mantine/core"
import { Notifications } from "@mantine/notifications"
import { Spotlight } from "@mantine/spotlight"
import { IconSearch } from "@tabler/icons-react"
import { GlobalErrorBoundary } from "./components/error/GlobalErrorBoundary"

// Import Mantine core styles
import "@mantine/core/styles.css"
import "@mantine/notifications/styles.css"
import "@mantine/dates/styles.css"
import "@mantine/spotlight/styles.css"

// Import the generated route tree
import { routeTree } from "./routeTree.gen"

// Create Mantine theme matching design tokens
const theme = createTheme({
	primaryColor: "blue",
	fontFamily: "Inter, system-ui, Avenir, Helvetica, Arial, sans-serif",
	defaultRadius: "md",
	// Respect system color scheme preferences
	respectReducedMotion: true,
	autoContrast: true,

	// Academic entity colors matching theme.css.ts
	colors: {
		// Override default colors to match design tokens
		blue: [
			"#eff6ff", // 50
			"#dbeafe", // 100
			"#bfdbfe", // 200
			"#93c5fd", // 300
			"#60a5fa", // 400
			"#3b82f6", // 500 - primary
			"#2563eb", // 600
			"#1d4ed8", // 700
			"#1e40af", // 800
			"#1e3a8a", // 900
		],
		gray: [
			"#f9fafb", // 50
			"#f3f4f6", // 100
			"#e5e7eb", // 200
			"#d1d5db", // 300
			"#9ca3af", // 400
			"#6b7280", // 500
			"#4b5563", // 600
			"#374151", // 700
			"#1f2937", // 800
			"#111827", // 900
		],
		// Entity-specific colors
		work: [
			"#eff6ff", "#dbeafe", "#bfdbfe", "#93c5fd", "#60a5fa",
			"#3b82f6", "#2563eb", "#1d4ed8", "#1e40af", "#1e3a8a"
		],
		author: [
			"#ecfdf5", "#d1fae5", "#a7f3d0", "#6ee7b7", "#34d399",
			"#10b981", "#059669", "#047857", "#065f46", "#064e3b"
		],
		source: [
			"#f3f4ff", "#e2e8f0", "#cbd5e1", "#a855f7", "#9333ea",
			"#8b5cf6", "#7c3aed", "#6d28d9", "#5b21b6", "#4c1d95"
		],
		institution: [
			"#fefce8", "#fef3c7", "#fde68a", "#fcd34d", "#fbbf24",
			"#f59e0b", "#d97706", "#b45309", "#92400e", "#78350f"
		],
	},

	// Component-specific theme overrides
	components: {
		Card: {
			defaultProps: {
				withBorder: true,
				shadow: "sm",
			},
		},
		Button: {
			defaultProps: {
				variant: "filled",
			},
		},
	},
})

// Import cache configuration and persistence
import { persistQueryClient } from "@tanstack/react-query-persist-client"
import { createHybridPersister } from "@/lib/cache/persister"
import { CACHE_CONFIG } from "@/config/cache"
import { calculateRetryDelay, RETRY_CONFIG } from "@/config/rate-limit"

// Create enhanced query client with intelligent caching and retry logic
const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			// Default cache times
			staleTime: CACHE_CONFIG.defaultStaleTime, // 5 minutes
			gcTime: CACHE_CONFIG.maxAge, // 7 days (keep data longer for offline support)

			// Network and focus behavior
			refetchOnWindowFocus: false,    // Don't refetch on tab focus (annoying for users)
			refetchOnReconnect: "always",   // Always refetch when coming back online

			// Intelligent retry logic for different error types
			retry: (failureCount: number, error: unknown) => {
				// Type guard for error with status
				const hasStatus = (err: unknown): err is { status: number } => {
					return typeof err === "object" && err !== null && "status" in err;
				};

				// Don't retry client errors (4xx) except 429 rate limits
				if (hasStatus(error) && error.status >= 400 && error.status < 500) {
					if (error.status === 429) {
						return failureCount < RETRY_CONFIG.rateLimited.maxAttempts;
					}
					return false; // Don't retry other 4xx errors
				}

				// Retry server errors (5xx) with limited attempts
				if (hasStatus(error) && error.status >= 500) {
					return failureCount < RETRY_CONFIG.server.maxAttempts;
				}

				// Retry network errors
				return failureCount < RETRY_CONFIG.network.maxAttempts;
			},

			// Smart retry delay with exponential backoff
			retryDelay: (attemptIndex: number, error: unknown) => {
				// Type guard for error with status and headers
				const hasStatus = (err: unknown): err is { status: number } => {
					return typeof err === "object" && err !== null && "status" in err;
				};
				const hasHeaders = (err: unknown): err is { headers: { get?: (key: string) => string | null } } => {
					return typeof err === "object" && err !== null && "headers" in err;
				};

				// Handle rate limiting specially
				if (hasStatus(error) && error.status === 429) {
					const retryAfterMs = hasHeaders(error) && error.headers.get
						? parseInt(error.headers.get("Retry-After") || "0") * 1000
						: undefined;
					return calculateRetryDelay(attemptIndex, RETRY_CONFIG.rateLimited, retryAfterMs);
				}

				// Handle server errors
				if (hasStatus(error) && error.status >= 500) {
					return calculateRetryDelay(attemptIndex, RETRY_CONFIG.server);
				}

				// Handle network errors
				return calculateRetryDelay(attemptIndex, RETRY_CONFIG.network);
			},
		},
		mutations: {
			retry: 2, // Limited retries for mutations
			retryDelay: (attemptIndex: number) =>
				calculateRetryDelay(attemptIndex, RETRY_CONFIG.network),
		},
	},
})

// Enable hybrid persistence with localStorage + IndexedDB for optimal performance
void persistQueryClient({
	queryClient,
	persister: createHybridPersister("academic-explorer-cache"),
	maxAge: CACHE_CONFIG.maxAge, // 7 days

	// Dehydrate options - what gets persisted
	dehydrateOptions: {
		shouldDehydrateQuery: (query) => {
			// Only persist successful queries to avoid caching errors
			return query.state.status === "success";
		},
	},
})

// Setup global error handling for logging
setupGlobalErrorHandling()

// Create a new router instance with hash-based history for GitHub Pages
const router = createRouter({
	routeTree,
	history: createHashHistory(),
})

// Register the router instance for type safety
declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router
  }
}

const rootElement = document.getElementById("root");
if (!rootElement) {
	throw new Error("Root element not found");
}

createRoot(rootElement).render(
	<StrictMode>
		<GlobalErrorBoundary>
			<MantineProvider
				theme={theme}
				defaultColorScheme="auto"
			>
				<Notifications />
				<QueryClientProvider client={queryClient}>
					<RouterProvider router={router} />

					{/* TanStack DevTools - unified panel for all tools */}
					{import.meta.env.DEV && (
						<TanStackDevtools
							config={{
								position: "bottom-left",
							}}
							plugins={[
								{
									name: "TanStack Query",
									render: <ReactQueryDevtoolsPanel />,
								},
								{
									name: "TanStack Router",
									render: <TanStackRouterDevtoolsPanel router={router} />,
								},
								{
									name: "TanStack Table",
									render: (
										<div style={{ padding: "16px", color: "#666" }}>
											<h3>React Table Devtools</h3>
											<p>Table instances will appear here when tables are rendered in your app.</p>
											<small>Use ReactTableDevtools component directly in pages with tables for specific debugging.</small>
										</div>
									),
								},
								{
									name: "OpenAlex Cache",
									render: <OpenAlexCachePanel />,
								},
								{
									name: "Entity Graph",
									render: <EntityGraphPanel />,
								},
								{
									name: "App Logs",
									render: <ApplicationLoggerPanel />,
								},
							]}
						/>
					)}
				</QueryClientProvider>
				<Spotlight
					actions={[]}
					searchProps={{
						leftSection: <IconSearch size={16} />,
						placeholder: "Search Academic Explorer...",
					}}
					nothingFound="Nothing found..."
					highlightQuery
				/>
			</MantineProvider>
		</GlobalErrorBoundary>
	</StrictMode>,
)
