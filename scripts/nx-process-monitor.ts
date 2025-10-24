#!/usr/bin/env tsx

import { execSync } from "child_process"
import { existsSync, writeFileSync, readFileSync, unlinkSync } from "fs"
import { tmpdir, platform } from "os"
import { join } from "path"

const isWindows = platform() === "win32"
const _isDarwin = platform() === "darwin"

interface ProcessInfo {
	pid: number
	command: string
	startTime: number
	parentPid?: number
}

interface MonitorConfig {
	checkInterval: number // milliseconds
	maxIdleTime: number // milliseconds
	pidFile: string
	logFile: string
	enableAutoCleanup: boolean
	enableLogging: boolean
}

/**
 * Nx Process Monitor - watches for orphaned processes and cleans them up
 */
class NxProcessMonitor {
	private config: MonitorConfig
	private isRunning = false
	private checkTimer?: NodeJS.Timeout
	private knownProcesses = new Map<number, ProcessInfo>()

	constructor(config: Partial<MonitorConfig> = {}) {
		this.config = {
			checkInterval: 30000, // 30 seconds
			maxIdleTime: 300000, // 5 minutes
			pidFile: join(tmpdir(), "nx-process-monitor.pid"),
			logFile: join(tmpdir(), "nx-process-monitor.log"),
			enableAutoCleanup: true,
			enableLogging: true,
			...config,
		}
	}

	/**
	 * Start monitoring
	 */
	public start(): void {
		if (this.isRunning) {
			this.log("Monitor is already running")
			return
		}

		// Check if another instance is running
		if (this.isAnotherInstanceRunning()) {
			this.log("Another monitor instance is already running")
			return
		}

		this.isRunning = true
		this.writePidFile()
		this.setupSignalHandlers()

		this.log("🔍 Starting Nx process monitor...")
		this.log(`  ⏱️  Check interval: ${this.config.checkInterval / 1000}s`)
		this.log(`  ⏰ Max idle time: ${this.config.maxIdleTime / 1000}s`)
		this.log(`  🧹 Auto cleanup: ${this.config.enableAutoCleanup ? "enabled" : "disabled"}`)

		// Initial scan
		this.checkProcesses()

		// Schedule periodic checks
		this.checkTimer = setInterval(() => {
			this.checkProcesses()
		}, this.config.checkInterval)

		this.log("✅ Monitor started successfully")
	}

	/**
	 * Stop monitoring
	 */
	public stop(): void {
		if (!this.isRunning) {
			return
		}

		this.log("🛑 Stopping Nx process monitor...")

		this.isRunning = false

		if (this.checkTimer) {
			clearInterval(this.checkTimer)
			this.checkTimer = undefined
		}

		this.removePidFile()
		this.log("✅ Monitor stopped")
	}

	/**
	 * Check for Nx processes and clean up orphaned ones
	 */
	private checkProcesses(): void {
		try {
			const currentProcesses = this.findNxProcesses()
			const now = Date.now()

			// Update known processes
			for (const process of currentProcesses) {
				if (!this.knownProcesses.has(process.pid)) {
					// New process found
					this.knownProcesses.set(process.pid, {
						...process,
						startTime: now,
					})
					this.log(`🆕 New Nx process detected: ${process.pid} (${process.command})`)
				}
			}

			// Check for orphaned processes
			const currentPids = new Set(currentProcesses.map((p) => p.pid))
			const orphanedProcesses: ProcessInfo[] = []

			for (const [pid, processInfo] of this.knownProcesses.entries()) {
				if (!currentPids.has(pid)) {
					// Process is no longer running
					this.knownProcesses.delete(pid)
					this.log(`✅ Process ${pid} terminated normally`)
				} else {
					// Check if process is orphaned (parent no longer exists or is idle too long)
					const isOrphaned = this.isProcessOrphaned(processInfo, now)
					if (isOrphaned) {
						orphanedProcesses.push(processInfo)
					}
				}
			}

			// Clean up orphaned processes
			if (orphanedProcesses.length > 0) {
				this.log(`⚠️  Found ${orphanedProcesses.length} orphaned process(es)`)

				if (this.config.enableAutoCleanup) {
					for (const process of orphanedProcesses) {
						this.cleanupProcess(process)
					}
				} else {
					this.log("💡 Auto cleanup is disabled. Run `pnpm kill-nx` to clean up manually.")
				}
			}
		} catch (error) {
			this.log(`❌ Error checking processes: ${error}`)
		}
	}

	/**
	 * Find all Nx-related processes
	 */
	private findNxProcesses(): ProcessInfo[] {
		const processes: ProcessInfo[] = []

		try {
			if (isWindows) {
				// Windows: Use wmic to get process information
				const output = execSync(
					"wmic process get Name,ProcessId,ParentProcessId,CommandLine /format:csv",
					{
						encoding: "utf8",
						timeout: 10000,
					}
				)

				const lines = output.split("\n").filter((line) => line.trim())
				for (const line of lines) {
					if (line.includes("nx") || (line.includes("node") && line.includes("nx"))) {
						const parts = line.split(",")
						if (parts.length >= 4) {
							const pid = parseInt(parts[3])
							const parentPid = parseInt(parts[2])
							const command = parts[1] || ""

							if (!isNaN(pid)) {
								processes.push({
									pid,
									parentPid: !isNaN(parentPid) ? parentPid : undefined,
									command,
									startTime: 0,
								})
							}
						}
					}
				}
			} else {
				// Unix-like systems
				const psOutput = execSync("ps -eo pid,ppid,command", {
					encoding: "utf8",
					timeout: 10000,
				})

				const lines = psOutput.split("\n").slice(1) // Skip header
				for (const line of lines) {
					if (line.includes("nx") && !line.includes("nx-process-monitor")) {
						const match = line.trim().match(/^(\d+)\s+(\d+)\s+(.+)$/)
						if (match) {
							const pid = parseInt(match[1])
							const parentPid = parseInt(match[2])
							const command = match[3]

							processes.push({
								pid,
								parentPid,
								command,
								startTime: 0,
							})
						}
					}
				}
			}
		} catch (error) {
			this.log(`⚠️  Error finding processes: ${error}`)
		}

		return processes
	}

	/**
	 * Check if a process is orphaned
	 */
	private isProcessOrphaned(processInfo: ProcessInfo, now: number): boolean {
		// Check if process has been running too long without parent
		const idleTime = now - processInfo.startTime
		if (idleTime > this.config.maxIdleTime) {
			return true
		}

		// Check if parent process still exists
		if (processInfo.parentPid) {
			try {
				if (isWindows) {
					execSync(`tasklist /FI "PID eq ${processInfo.parentPid}"`, {
						encoding: "utf8",
						timeout: 5000,
					})
				} else {
					execSync(`ps -p ${processInfo.parentPid}`, {
						encoding: "utf8",
						timeout: 5000,
					})
				}
				return false // Parent exists
			} catch {
				return true // Parent doesn't exist
			}
		}

		return false
	}

	/**
	 * Clean up an orphaned process
	 */
	private cleanupProcess(processInfo: ProcessInfo): void {
		this.log(`🧹 Cleaning up orphaned process: ${processInfo.pid} (${processInfo.command})`)

		try {
			if (isWindows) {
				execSync(`taskkill /PID ${processInfo.pid} /T /F`, {
					stdio: "ignore",
					timeout: 5000,
				})
			} else {
				// Try graceful termination first
				execSync(`kill -TERM ${processInfo.pid}`, {
					stdio: "ignore",
					timeout: 5000,
				})

				// Wait a bit, then force kill if needed
				setTimeout(() => {
					try {
						execSync(`kill -KILL ${processInfo.pid}`, {
							stdio: "ignore",
							timeout: 5000,
						})
					} catch {
						// Process already dead
					}
				}, 2000)
			}

			this.knownProcesses.delete(processInfo.pid)
			this.log(`✅ Successfully cleaned up process ${processInfo.pid}`)
		} catch (error) {
			this.log(`❌ Failed to clean up process ${processInfo.pid}: ${error}`)
		}
	}

	/**
	 * Check if another monitor instance is running
	 */
	private isAnotherInstanceRunning(): boolean {
		if (!existsSync(this.config.pidFile)) {
			return false
		}

		try {
			const pidStr = readFileSync(this.config.pidFile, "utf8").trim()
			const pid = parseInt(pidStr)

			if (isNaN(pid)) {
				return false
			}

			// Check if process is still running
			if (isWindows) {
				execSync(`tasklist /FI "PID eq ${pid}"`, { stdio: "ignore" })
			} else {
				execSync(`ps -p ${pid}`, { stdio: "ignore" })
			}

			return true // Process exists
		} catch {
			// PID file exists but process doesn't, clean up
			this.removePidFile()
			return false
		}
	}

	/**
	 * Write PID file
	 */
	private writePidFile(): void {
		try {
			writeFileSync(this.config.pidFile, process.pid.toString())
		} catch (error) {
			this.log(`⚠️  Failed to write PID file: ${error}`)
		}
	}

	/**
	 * Remove PID file
	 */
	private removePidFile(): void {
		try {
			if (existsSync(this.config.pidFile)) {
				unlinkSync(this.config.pidFile)
			}
		} catch (error) {
			this.log(`⚠️  Failed to remove PID file: ${error}`)
		}
	}

	/**
	 * Setup signal handlers
	 */
	private setupSignalHandlers(): void {
		const signals: NodeJS.Signals[] = ["SIGINT", "SIGTERM", "SIGQUIT"]

		for (const signal of signals) {
			process.on(signal, () => {
				this.log(`Received ${signal}, stopping monitor...`)
				this.stop()
				process.exit(0)
			})
		}
	}

	/**
	 * Log message
	 */
	private log(message: string): void {
		const timestamp = new Date().toISOString()
		const logMessage = `[${timestamp}] ${message}`

		if (this.config.enableLogging) {
			console.log(logMessage)

			// Also write to log file
			try {
				writeFileSync(this.config.logFile, `${logMessage}\n`, { flag: "a" })
			} catch {
				// Ignore file write errors
			}
		}
	}

	/**
	 * Get monitor status
	 */
	public getStatus(): {
		isRunning: boolean
		processCount: number
		pidFile: string
		logFile: string
	} {
		return {
			isRunning: this.isRunning,
			processCount: this.knownProcesses.size,
			pidFile: this.config.pidFile,
			logFile: this.config.logFile,
		}
	}
}

/**
 * CLI interface
 */
function main(): void {
	const args = process.argv.slice(2)
	const command = args[0] || "start"

	const monitor = new NxProcessMonitor()

	switch (command) {
		case "start":
			monitor.start()
			// Keep process running
			process.stdin.resume()
			break

		case "stop":
			monitor.stop()
			break

		case "status": {
			const status = monitor.getStatus()
			console.log("Nx Process Monitor Status:")
			console.log(`  Running: ${status.isRunning}`)
			console.log(`  Known processes: ${status.processCount}`)
			console.log(`  PID file: ${status.pidFile}`)
			console.log(`  Log file: ${status.logFile}`)
			break
		}

		case "scan": {
			console.log("🔍 Scanning for Nx processes (one-time check)...")
			const _scanMonitor = new NxProcessMonitor({ enableAutoCleanup: false })
			// Simulate check without starting daemon
			break
		}

		default:
			console.log("Usage: tsx nx-process-monitor.ts <command>")
			console.log("Commands:")
			console.log("  start   - Start monitoring (runs in foreground)")
			console.log("  stop    - Stop monitoring")
			console.log("  status  - Show monitor status")
			console.log("  scan    - One-time scan for orphaned processes")
			process.exit(1)
	}
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
	main()
}

export { NxProcessMonitor }
