import { spawn } from "child_process"
import { platform } from "os"

const isWindows = platform() === "win32"

/**
 * Start dev server and run E2E tests
 */
async function startDevServerAndRunTests(): Promise<void> {
	console.log("🚀 Starting dev server for E2E tests...")

	// Start the dev server directly
	const devServerProcess = spawn("pnpm", ["dev"], {
		cwd: "../../",
		stdio: ["inherit", "inherit", "inherit"],
		shell: true,
		detached: !isWindows,
		env: { ...process.env, NODE_ENV: "development" },
	})

	// Wait for the server to be ready
	console.log("⏳ Waiting for dev server to start...")
	await waitForServer("http://localhost:5173", 30000)

	console.log("✅ Dev server is ready!")
	console.log("🧪 Running E2E tests...")

	// Run the E2E tests using vitest directly
	const testProcess = spawn(
		"npx",
		["vitest", "run", "--config", "../../vite.config.base.ts", "--project=e2e"],
		{
			stdio: "inherit",
			shell: true,
		}
	)

	// Handle test process completion
	testProcess.on("close", (code) => {
		console.log(`🧹 Cleaning up dev server (PID: ${devServerProcess.pid})...`)

		// Kill the dev server
		if (isWindows) {
			spawn("taskkill", ["/pid", devServerProcess.pid?.toString() || "", "/t", "/f"], {
				stdio: "ignore",
			})
		} else {
			process.kill(-(devServerProcess.pid || 0), "SIGTERM")
		}

		process.exit(code || 0)
	})

	testProcess.on("error", (error) => {
		console.error("💥 Failed to run E2E tests:", error)
		process.exit(1)
	})
}

/**
 * Wait for server to be ready
 */
async function waitForServer(url: string, timeout: number): Promise<void> {
	const startTime = Date.now()

	while (Date.now() - startTime < timeout) {
		try {
			const response = await fetch(url)
			if (response.ok) {
				return
			}
		} catch (_error) {
			// Server not ready yet
		}

		// Wait 500ms before trying again
		await new Promise((resolve) => setTimeout(resolve, 500))
	}

	throw new Error(`Server at ${url} did not start within ${timeout}ms`)
}

// Handle process termination
process.on("SIGINT", () => {
	console.log("\n🛑 Received SIGINT, exiting...")
	process.exit(1)
})

process.on("SIGTERM", () => {
	console.log("\n🛑 Received SIGTERM, exiting...")
	process.exit(1)
})

// Run the script
startDevServerAndRunTests().catch((error) => {
	console.error("💥 Failed to start dev server and run tests:", error)
	process.exit(1)
})
