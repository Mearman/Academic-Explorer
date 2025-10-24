#!/usr/bin/env tsx

import { execSync, spawn as _spawn } from "child_process"
import { existsSync, rmSync, readdirSync, statSync } from "fs"
import { join } from "path"
import { tmpdir, platform } from "os"

const isWindows = platform() === "win32"
const isDarwin = platform() === "darwin"

/**
 * Kill all Nx-related processes
 */
function killNxProcesses(): void {
	console.log("🔍 Finding and killing Nx processes...")

	try {
		if (isWindows) {
			// Windows: Find and kill nx processes
			try {
				const tasklist = execSync("tasklist /FO CSV", { encoding: "utf8" })
				const nxProcesses = tasklist
					.split("\n")
					.filter((line) => line.includes("nx") || (line.includes("node") && line.includes("nx")))
					.map((line) => {
						const parts = line.split(",")
						return parts[1]?.replace(/"/g, "") // PID is in second column
					})
					.filter(Boolean)

				for (const pid of nxProcesses) {
					try {
						execSync(`taskkill /PID ${pid} /F`, { stdio: "ignore" })
						console.log(`  ✅ Killed process ${pid}`)
					} catch {
						// Process might already be dead
					}
				}
			} catch {
				console.log("  ⚠️  No processes found or unable to list processes")
			}
		} else {
			// Unix-like systems (macOS, Linux)
			const commands = [
				"nx daemon",
				"nx serve",
				"nx build",
				"nx test",
				"nx",
				"@nx/daemon",
				"nx-daemon",
			]

			for (const cmd of commands) {
				try {
					const pids = execSync(`pgrep -f "${cmd}"`, { encoding: "utf8" }).trim()
					if (pids) {
						for (const pid of pids.split("\n").filter(Boolean)) {
							try {
								execSync(`kill -TERM ${pid}`, { stdio: "ignore" })
								console.log(`  ✅ Killed ${cmd} process ${pid}`)

								// Wait a bit, then force kill if still running
								setTimeout(() => {
									try {
										execSync(`kill -KILL ${pid}`, { stdio: "ignore" })
									} catch {
										// Process already dead
									}
								}, 2000)
							} catch {
								// Process might already be dead
							}
						}
					}
				} catch {
					// No processes found for this command
				}
			}

			// Kill any remaining node processes that might be nx-related
			try {
				const nodeProcesses = execSync("ps aux | grep node", { encoding: "utf8" })
				const nxNodeProcesses = nodeProcesses
					.split("\n")
					.filter((line) => line.includes("nx") || line.includes(".nx") || line.includes("nx-daemon"))
					.map((line) => line.trim().split(/\s+/)[1])
					.filter(Boolean)

				for (const pid of nxNodeProcesses) {
					try {
						execSync(`kill -TERM ${pid}`, { stdio: "ignore" })
						console.log(`  ✅ Killed nx-related node process ${pid}`)
					} catch {
						// Process might already be dead
					}
				}
			} catch {
				// No node processes found
			}
		}
	} catch (error) {
		console.log(`  ⚠️  Error killing processes: ${error}`)
	}
}

/**
 * Clean up Nx socket files and cache
 */
function cleanupNxFiles(): void {
	console.log("🧹 Cleaning up Nx files and sockets...")

	const pathsToClean = [
		// Project-specific paths
		".nx",
		"node_modules/.cache/nx",
		"dist",
		"coverage",
		".tanstack",
		"node_modules/.vite",

		// OS-specific temp directories
		join(tmpdir(), "nx"),
		join(tmpdir(), "nx-daemon"),
		join(tmpdir(), "nx-socket"),
	]

	// Add platform-specific paths
	if (isDarwin || !isWindows) {
		pathsToClean.push(
			"/tmp/nx-daemon",
			"/tmp/nx-socket",
			"/var/folders/*/nx*" // macOS temp folders
		)
	}

	if (isWindows) {
		pathsToClean.push(
			join(process.env.TEMP || tmpdir(), "nx"),
			join(process.env.TEMP || tmpdir(), "nx-daemon")
		)
	}

	for (const path of pathsToClean) {
		try {
			if (existsSync(path)) {
				const stat = statSync(path)
				if (stat.isDirectory()) {
					rmSync(path, { recursive: true, force: true })
					console.log(`  ✅ Removed directory: ${path}`)
				} else {
					rmSync(path, { force: true })
					console.log(`  ✅ Removed file: ${path}`)
				}
			}
		} catch (error) {
			console.log(`  ⚠️  Could not remove ${path}: ${error}`)
		}
	}

	// Clean up nx socket files in system temp directories
	try {
		const tempDir = tmpdir()
		const tempFiles = readdirSync(tempDir)

		for (const file of tempFiles) {
			if (file.includes("nx") || file.includes("daemon")) {
				const fullPath = join(tempDir, file)
				try {
					const stat = statSync(fullPath)
					if (stat.isSocket() || file.includes("socket")) {
						rmSync(fullPath, { force: true })
						console.log(`  ✅ Removed socket: ${fullPath}`)
					}
				} catch {
					// Ignore errors for individual files
				}
			}
		}
	} catch {
		console.log("  ⚠️  Could not scan temp directory for sockets")
	}
}

/**
 * Run nx reset to clean up nx cache
 */
function runNxReset(): void {
	console.log("🔄 Running nx reset...")

	try {
		execSync("nx reset", { stdio: "inherit" })
		console.log("  ✅ Nx reset completed")
	} catch (error) {
		console.log(`  ⚠️  Nx reset failed: ${error}`)
	}
}

/**
 * Main cleanup function
 */
function main(): void {
	console.log("🚀 Starting Nx cleanup process...\n")

	// Step 1: Kill processes
	killNxProcesses()

	// Step 2: Wait a moment for processes to die
	console.log("\n⏳ Waiting for processes to terminate...")
	setTimeout(() => {
		// Step 3: Clean up files
		console.log("")
		cleanupNxFiles()

		// Step 4: Run nx reset
		console.log("")
		runNxReset()

		console.log("\n✨ Nx cleanup completed!")
		console.log("🔄 You may now run your nx commands normally.")
	}, 3000)
}

// Handle script interruption
process.on("SIGINT", () => {
	console.log("\n\n⚠️  Cleanup interrupted. Some processes or files may still exist.")
	process.exit(1)
})

process.on("SIGTERM", () => {
	console.log("\n\n⚠️  Cleanup terminated. Some processes or files may still exist.")
	process.exit(1)
})

// Run the cleanup
main()
