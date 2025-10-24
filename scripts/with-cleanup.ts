#!/usr/bin/env tsx

import { spawn, ChildProcess } from "child_process"
import { platform } from "os"

const isWindows = platform() === "win32"

/**
 * Process manager that handles graceful cleanup
 */
class ProcessManager {
	private childProcesses: Set<ChildProcess> = new Set()
	private isShuttingDown = false
	private cleanupTimeout = 5000 // 5 seconds

	constructor() {
		this.setupSignalHandlers()
	}

	/**
	 * Setup signal handlers for graceful shutdown
	 */
	private setupSignalHandlers(): void {
		const signals: NodeJS.Signals[] = ["SIGINT", "SIGTERM", "SIGQUIT"]

		for (const signal of signals) {
			process.on(signal, () => {
				console.log(`\n🛑 Received ${signal}, initiating graceful shutdown...`)
				this.gracefulShutdown(signal)
			})
		}

		// Handle process exit
		process.on("exit", () => {
			this.forceKillAll()
		})

		// Handle uncaught exceptions
		process.on("uncaughtException", (error) => {
			console.error("💥 Uncaught exception:", error)
			this.gracefulShutdown("SIGTERM")
		})

		// Handle unhandled promise rejections
		process.on("unhandledRejection", (reason) => {
			console.error("💥 Unhandled rejection:", reason)
			this.gracefulShutdown("SIGTERM")
		})
	}

	/**
	 * Add a child process to be managed
	 */
	public addProcess(childProcess: ChildProcess): void {
		this.childProcesses.add(childProcess)

		// Remove from set when process exits
		childProcess.on("exit", () => {
			this.childProcesses.delete(childProcess)
		})
	}

	/**
	 * Graceful shutdown of all child processes
	 */
	private async gracefulShutdown(signal: NodeJS.Signals): Promise<void> {
		if (this.isShuttingDown) {
			console.log("⚠️  Already shutting down...")
			return
		}

		this.isShuttingDown = true
		console.log(`🧹 Cleaning up ${this.childProcesses.size} child process(es)...`)

		if (this.childProcesses.size === 0) {
			console.log("✅ No child processes to clean up")
			process.exit(0)
			return
		}

		// Send termination signal to all child processes
		const terminationPromises: Promise<void>[] = []

		for (const childProcess of this.childProcesses) {
			terminationPromises.push(this.terminateProcess(childProcess, signal))
		}

		// Wait for all processes to terminate, with timeout
		try {
			await Promise.race([Promise.all(terminationPromises), this.timeout(this.cleanupTimeout)])
			console.log("✅ All processes terminated gracefully")
		} catch (_error) {
			console.log("⚠️  Timeout reached, force killing remaining processes...")
			this.forceKillAll()
		}

		process.exit(0)
	}

	/**
	 * Terminate a single process gracefully
	 */
	private terminateProcess(childProcess: ChildProcess, signal: NodeJS.Signals): Promise<void> {
		return new Promise((resolve) => {
			if (!childProcess.pid || childProcess.killed) {
				resolve()
				return
			}

			// Listen for process exit
			const onExit = () => {
				console.log(`  ✅ Process ${childProcess.pid} terminated`)
				resolve()
			}

			childProcess.once("exit", onExit)
			childProcess.once("error", onExit)

			try {
				// Send signal to process group if possible
				if (isWindows) {
					// Windows: Use taskkill to terminate process tree
					spawn("taskkill", ["/pid", childProcess.pid?.toString() || "", "/t", "/f"], {
						stdio: "ignore",
					})
				} else {
					// Unix: Send signal to process group
					process.kill(-(childProcess.pid || 0), signal)
				}
			} catch (error) {
				console.log(`  ⚠️  Error terminating process ${childProcess.pid}: ${error}`)
				resolve()
			}
		})
	}

	/**
	 * Force kill all remaining processes
	 */
	private forceKillAll(): void {
		for (const childProcess of this.childProcesses) {
			try {
				if (childProcess.pid && !childProcess.killed) {
					if (isWindows) {
						spawn("taskkill", ["/pid", childProcess.pid.toString(), "/t", "/f"], {
							stdio: "ignore",
						})
					} else {
						process.kill(-childProcess.pid, "SIGKILL")
					}
				}
			} catch (_error) {
				// Process might already be dead
			}
		}
		this.childProcesses.clear()
	}

	/**
	 * Timeout utility
	 */
	private timeout(ms: number): Promise<never> {
		return new Promise((_, reject) => {
			setTimeout(() => reject(new Error("Timeout")), ms)
		})
	}
}

/**
 * Run a command with cleanup handlers
 */
function runWithCleanup(command: string, args: string[] = [], options: Record<string, unknown> = {}): void {
	const processManager = new ProcessManager()

	console.log(`🚀 Starting: ${command} ${args.join(" ")}`)
	console.log("💡 Press Ctrl+C to gracefully stop all processes\n")

	// Create child process with new process group
	const childProcess = spawn(command, args, {
		stdio: "inherit",
		shell: true,
		detached: !isWindows, // Use process groups on Unix
		...options,
	})

	// Add to process manager
	processManager.addProcess(childProcess)

	// Handle child process events
	childProcess.on("error", (error) => {
		console.error(`💥 Failed to start command: ${error}`)
		process.exit(1)
	})

	childProcess.on("exit", (code, signal) => {
		if (signal) {
			console.log(`\n⚡ Process terminated by signal: ${signal}`)
		} else {
			console.log(`\n📋 Process exited with code: ${code}`)
		}

		// If child exits normally, exit parent
		if (!signal && code !== null) {
			process.exit(code)
		}
	})
}

/**
 * Main function
 */
function main(): void {
	const args = process.argv.slice(2)

	if (args.length === 0) {
		console.error("Usage: tsx with-cleanup.ts <command> [args...]")
		console.error("Example: tsx with-cleanup.ts vite")
		console.error("Example: tsx with-cleanup.ts npm run dev")
		process.exit(1)
	}

	const [command, ...commandArgs] = args
	runWithCleanup(command, commandArgs)
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
	main()
}

export { ProcessManager, runWithCleanup }
