import { createRoot } from "react-dom/client"
import { createRouter, RouterProvider, createHashHistory } from "@tanstack/react-router"
import { TanStackDevtools } from "@tanstack/react-devtools"
import { ReactQueryDevtoolsPanel } from "@tanstack/react-query-devtools"
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools"
import { OpenAlexCachePanel } from "./components/devtools/OpenAlexCachePanel"
import { EntityGraphPanel } from "./components/devtools/EntityGraphPanel"
import { ApplicationLoggerPanel } from "./components/devtools/ApplicationLoggerPanel"
import { setupGlobalErrorHandling } from "./lib/logger"
import { initializeNetworkMonitoring } from "./services/network-interceptor"
import { MantineProvider, createTheme } from "@mantine/core"
import { Notifications } from "@mantine/notifications"
import { Spotlight } from "@mantine/spotlight"
import { IconSearch } from "@tabler/icons-react"
import { GlobalErrorBoundary } from "./components/error/GlobalErrorBoundary"
import { CacheInitializer } from "./components/cache/CacheInitializer"

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


// Setup global error handling for logging
setupGlobalErrorHandling()


// Initialize network monitoring
initializeNetworkMonitoring()

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
	/* <StrictMode> - Temporarily disabled to debug multiple hook instances */
		<GlobalErrorBoundary>
			<MantineProvider
				theme={theme}
				defaultColorScheme="auto"
			>
					<Notifications />
					<CacheInitializer>
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
				</CacheInitializer>
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
	/* </StrictMode> - Temporarily disabled to debug multiple hook instances */
)
