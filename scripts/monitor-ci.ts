#!/usr/bin/env tsx

/**
 * CI Monitoring Script for Academic Explorer
 *
 * Monitors GitHub Actions workflows, extracts error logs, and provides CI status overview.
 * Focus on nx-ci.yml workflow and related CI jobs.
 */

import { execSync } from "node:child_process"
import { writeFileSync, existsSync, mkdirSync } from "node:fs"
import { join } from "node:path"

interface WorkflowRun {
	id: number
	name: string
	head_branch: string
	head_sha: string
	status: string
	conclusion: string | null
	workflow_id: number
	created_at: string
	updated_at: string
	html_url: string
	run_number: number
	event: string
	actor: {
		login: string
	}
}

interface Job {
	id: number
	run_id: number
	workflow_name: string
	head_branch: string
	run_url: string
	run_attempt: number
	node_id: string
	head_sha: string
	url: string
	html_url: string
	status: string
	conclusion: string | null
	started_at: string
	completed_at: string | null
	name: string
	steps: Array<{
		name: string
		status: string
		conclusion: string | null
		number: number
		started_at: string
		completed_at: string | null
	}>
	check_run_url: string
	labels: string[]
	runner_id: number
	runner_name: string
	runner_group_id: number
	runner_group_name: string
}

class CIMonitor {
	private repoPath: string

	constructor(repoPath: string = ".") {
		this.repoPath = repoPath
	}

	/**
	 * Get GitHub repository information
	 */
	private getRepoInfo(): { owner: string; repo: string } {
		try {
			const remoteUrl = execSync("git remote get-url origin", {
				cwd: this.repoPath,
				encoding: "utf8",
			}).trim()

			// Handle both SSH and HTTPS URLs
			const match = remoteUrl.match(/github\.com[/:]([^/]+)\/(.+?)(?:\.git)?$/)
			if (!match) {
				throw new Error("Could not parse repository URL")
			}

			return { owner: match[1], repo: match[2] }
		} catch (error) {
			console.error("Error getting repository info:", error)
			throw error
		}
	}

	/**
	 * Execute gh CLI command with JSON output
	 */
	private execGhCommand(command: string): unknown {
		try {
			const output = execSync(`gh ${command}`, {
				cwd: this.repoPath,
				encoding: "utf8",
			})
			return JSON.parse(output)
		} catch (error: unknown) {
			if (error instanceof Error && (error as any).status === 1 && (error as any).stderr?.includes("no runs found")) {
				return []
			}
			console.error(`Error executing: gh ${command}`)
			if (error instanceof Error) {
				console.error("Error:", error.message)
			}
			if ((error as any).stderr) {
				console.error("Stderr:", (error as any).stderr)
			}
			throw error
		}
	}

	/**
	 * Get recent workflow runs
	 */
	async getWorkflowRuns(
		workflowName: string = "nx-ci.yml",
		limit: number = 10
	): Promise<WorkflowRun[]> {
		console.log(`📊 Fetching recent workflow runs for ${workflowName}...`)

		try {
			const runs = this.execGhCommand(
				`run list --workflow=${workflowName} --limit=${limit} --json=id,name,headBranch,headSha,status,conclusion,workflowId,createdAt,updatedAt,htmlUrl,runNumber,event,actor`
			)

			return (runs as any[]).map((run: any) => ({
				id: run.id,
				name: run.name,
				head_branch: run.headBranch,
				head_sha: run.headSha,
				status: run.status,
				conclusion: run.conclusion,
				workflow_id: run.workflowId,
				created_at: run.createdAt,
				updated_at: run.updatedAt,
				html_url: run.htmlUrl,
				run_number: run.runNumber,
				event: run.event,
				actor: run.actor,
			}))
		} catch (error) {
			console.error("Failed to fetch workflow runs:", error)
			return []
		}
	}

	/**
	 * Get jobs for a specific workflow run
	 */
	async getRunJobs(runId: number): Promise<Job[]> {
		try {
			const jobs = this.execGhCommand(`run view ${runId} --json=jobs`)

			return jobs.jobs || []
		} catch (error) {
			console.error(`Failed to fetch jobs for run ${runId}:`, error)
			return []
		}
	}

	/**
	 * Get logs for a specific job
	 */
	async getJobLogs(runId: number, jobId: number): Promise<string> {
		try {
			return execSync(`gh run view ${runId} --log --job=${jobId}`, {
				cwd: this.repoPath,
				encoding: "utf8",
				maxBuffer: 10 * 1024 * 1024, // 10MB buffer
			})
		} catch (error) {
			console.error(`Failed to fetch logs for job ${jobId}:`, error)
			return ""
		}
	}

	/**
	 * Extract error information from logs
	 */
	extractErrors(logs: string): string[] {
		const errorPatterns = [
			/ERROR.*$/gm,
			/error TS\d+:.*$/gm,
			/✖.*$/gm,
			/×.*$/gm,
			/FAIL.*$/gm,
			/✗.*$/gm,
			/npm ERR!.*$/gm,
			/pnpm ERR.*$/gm,
			/Error:.*$/gm,
			/TypeError:.*$/gm,
			/ReferenceError:.*$/gm,
			/SyntaxError:.*$/gm,
			/Process completed with exit code [1-9]\d*$/gm,
		]

		const errors: string[] = []

		for (const pattern of errorPatterns) {
			const matches = logs.match(pattern)
			if (matches) {
				errors.push(...matches)
			}
		}

		return [...new Set(errors)] // Remove duplicates
	}

	/**
	 * Display workflow run status
	 */
	displayRunStatus(runs: WorkflowRun[]): void {
		if (runs.length === 0) {
			console.log("❌ No workflow runs found")
			return
		}

		console.log("\n📋 Recent Workflow Runs:")
		console.log("=".repeat(100))

		for (const run of runs) {
			const statusIcon = this.getStatusIcon(run.status, run.conclusion)
			const shortSha = run.head_sha.substring(0, 7)
			const createdDate = new Date(run.created_at).toLocaleString()

			console.log(`${statusIcon} #${run.run_number} | ${run.head_branch} | ${shortSha} | ${run.event}`)
			console.log(`   Created: ${createdDate} | Actor: ${run.actor.login}`)
			console.log(`   URL: ${run.html_url}`)
			console.log("")
		}
	}

	/**
	 * Display detailed job status
	 */
	async displayJobStatus(runId: number): Promise<void> {
		console.log(`\n🔍 Job Details for Run #${runId}:`)
		console.log("=".repeat(80))

		const jobs = await this.getRunJobs(runId)

		if (jobs.length === 0) {
			console.log("❌ No jobs found for this run")
			return
		}

		for (const job of jobs) {
			const statusIcon = this.getStatusIcon(job.status, job.conclusion)
			const duration = this.calculateDuration(job.started_at, job.completed_at)

			console.log(`${statusIcon} ${job.name}`)
			console.log(`   Status: ${job.status} | Conclusion: ${job.conclusion || "N/A"}`)
			console.log(`   Duration: ${duration} | Runner: ${job.runner_name}`)

			if (job.steps) {
				const failedSteps = job.steps.filter((step) => step.conclusion === "failure")
				if (failedSteps.length > 0) {
					console.log("   Failed Steps:")
					for (const step of failedSteps) {
						console.log(`     ❌ ${step.name}`)
					}
				}
			}

			console.log(`   URL: ${job.html_url}`)
			console.log("")
		}
	}

	/**
	 * Extract and save error logs
	 */
	async extractErrorLogs(runId: number, outputDir: string = "./ci-logs"): Promise<void> {
		console.log(`\n📝 Extracting error logs for run #${runId}...`)

		// Create output directory
		if (!existsSync(outputDir)) {
			mkdirSync(outputDir, { recursive: true })
		}

		const jobs = await this.getRunJobs(runId)
		const failedJobs = jobs.filter((job) => job.conclusion === "failure")

		if (failedJobs.length === 0) {
			console.log("✅ No failed jobs found")
			return
		}

		console.log(`Found ${failedJobs.length} failed jobs`)

		for (const job of failedJobs) {
			console.log(`Extracting logs for job: ${job.name}`)

			const logs = await this.getJobLogs(runId, job.id)
			const errors = this.extractErrors(logs)

			// Save full logs
			const logFileName = `run-${runId}-job-${job.id}-${job.name.replace(/[^a-zA-Z0-9]/g, "-")}.log`
			writeFileSync(join(outputDir, logFileName), logs)

			// Save extracted errors
			if (errors.length > 0) {
				const errorFileName = `run-${runId}-job-${job.id}-${job.name.replace(/[^a-zA-Z0-9]/g, "-")}-errors.txt`
				const errorContent = [
					`Error Summary for Job: ${job.name}`,
					`Run ID: ${runId}`,
					`Job ID: ${job.id}`,
					`Status: ${job.status}`,
					`Conclusion: ${job.conclusion}`,
					`URL: ${job.html_url}`,
					"",
					"Extracted Errors:",
					"=".repeat(50),
					...errors,
					"",
					"Full logs available in: " + logFileName,
				].join("\n")

				writeFileSync(join(outputDir, errorFileName), errorContent)

				console.log(`  ❌ ${errors.length} errors found - saved to ${errorFileName}`)
			}
		}

		console.log(`\n📁 Error logs saved to: ${outputDir}`)
	}

	/**
	 * Watch CI status in real-time
	 */
	async watchCI(workflowName: string = "nx-ci.yml", intervalSeconds: number = 30): Promise<void> {
		console.log(`👀 Watching CI status for ${workflowName} (checking every ${intervalSeconds}s)`)
		console.log("Press Ctrl+C to stop watching\n")

		let previousRunId: number | null = null

		const checkStatus = async () => {
			const runs = await this.getWorkflowRuns(workflowName, 1)

			if (runs.length === 0) {
				console.log("⏳ No runs found yet...")
				return
			}

			const latestRun = runs[0]

			if (previousRunId !== latestRun.id) {
				console.log(`\n🚀 New run detected: #${latestRun.run_number}`)
				previousRunId = latestRun.id
			}

			const statusIcon = this.getStatusIcon(latestRun.status, latestRun.conclusion)
			const shortSha = latestRun.head_sha.substring(0, 7)

			console.log(
				`${statusIcon} Run #${latestRun.run_number} | ${latestRun.head_branch} | ${shortSha} | ${latestRun.status}`
			)

			if (latestRun.status === "completed") {
				console.log(
					`\n🏁 Run #${latestRun.run_number} completed with conclusion: ${latestRun.conclusion}`
				)

				if (latestRun.conclusion === "failure") {
					console.log("❌ Run failed - extracting error logs...")
					await this.extractErrorLogs(latestRun.id)
				}

				console.log(`\nFull details: ${latestRun.html_url}`)
				return true // Stop watching
			}
		}

		// Check immediately
		const shouldStop = await checkStatus()
		if (shouldStop) return

		// Set up interval
		const intervalId = setInterval(async () => {
			const shouldStop = await checkStatus()
			if (shouldStop) {
				clearInterval(intervalId)
			}
		}, intervalSeconds * 1000)
	}

	/**
	 * Get status icon for display
	 */
	private getStatusIcon(status: string, conclusion: string | null): string {
		if (status === "completed") {
			switch (conclusion) {
				case "success":
					return "✅"
				case "failure":
					return "❌"
				case "cancelled":
					return "⏹️"
				case "skipped":
					return "⏭️"
				default:
					return "❓"
			}
		}

		switch (status) {
			case "queued":
				return "⏳"
			case "in_progress":
				return "🔄"
			case "requested":
				return "📝"
			default:
				return "❓"
		}
	}

	/**
	 * Calculate duration between two timestamps
	 */
	private calculateDuration(startTime: string, endTime: string | null): string {
		if (!endTime) return "Running..."

		const start = new Date(startTime).getTime()
		const end = new Date(endTime).getTime()
		const durationMs = end - start

		const minutes = Math.floor(durationMs / 60000)
		const seconds = Math.floor((durationMs % 60000) / 1000)

		return `${minutes}m ${seconds}s`
	}

	/**
	 * Show quick CI status summary
	 */
	async quickStatus(workflowName: string = "nx-ci.yml"): Promise<void> {
		const runs = await this.getWorkflowRuns(workflowName, 5)

		if (runs.length === 0) {
			console.log("❌ No workflow runs found")
			return
		}

		const latestRun = runs[0]
		const statusIcon = this.getStatusIcon(latestRun.status, latestRun.conclusion)
		const shortSha = latestRun.head_sha.substring(0, 7)

		console.log(`\n🎯 Latest CI Status:`)
		console.log(`${statusIcon} Run #${latestRun.run_number} | ${latestRun.head_branch} | ${shortSha}`)
		console.log(`Status: ${latestRun.status} | Conclusion: ${latestRun.conclusion || "N/A"}`)
		console.log(`URL: ${latestRun.html_url}\n`)

		// Show recent trend
		const successCount = runs.filter((run) => run.conclusion === "success").length
		const failureCount = runs.filter((run) => run.conclusion === "failure").length
		const pendingCount = runs.filter((run) => run.status !== "completed").length

		console.log(`📈 Recent Trend (last ${runs.length} runs):`)
		console.log(
			`✅ Success: ${successCount} | ❌ Failure: ${failureCount} | 🔄 Pending: ${pendingCount}`
		)
	}
}

// CLI Interface
async function main() {
	const args = process.argv.slice(2)
	const command = args[0] || "status"

	const monitor = new CIMonitor()

	try {
		switch (command) {
			case "status":
			case "quick":
				await monitor.quickStatus(args[1])
				break

			case "list": {
				const runs = await monitor.getWorkflowRuns(args[1], parseInt(args[2]) || 10)
				monitor.displayRunStatus(runs)
				break
			}

			case "jobs": {
				const runId = parseInt(args[1])
				if (!runId) {
					console.error("❌ Please provide a run ID: pnpm monitor-ci jobs <run-id>")
					process.exit(1)
				}
				await monitor.displayJobStatus(runId)
				break
			}

			case "logs": {
				const logRunId = parseInt(args[1])
				if (!logRunId) {
					console.error("❌ Please provide a run ID: pnpm monitor-ci logs <run-id>")
					process.exit(1)
				}
				await monitor.extractErrorLogs(logRunId, args[2])
				break
			}

			case "watch":
				await monitor.watchCI(args[1], parseInt(args[2]) || 30)
				break

			case "help":
				console.log(`
🔧 CI Monitor Commands:

  pnpm monitor-ci status [workflow]     - Quick status of latest run
  pnpm monitor-ci list [workflow] [n]   - List recent runs (default: 10)
  pnpm monitor-ci jobs <run-id>         - Show job details for a run
  pnpm monitor-ci logs <run-id> [dir]   - Extract error logs from failed jobs
  pnpm monitor-ci watch [workflow] [s]  - Watch CI in real-time (default: 30s)
  pnpm monitor-ci help                  - Show this help

Examples:
  pnpm monitor-ci status                # Quick status
  pnpm monitor-ci list nx-ci.yml 5      # List 5 recent nx-ci runs
  pnpm monitor-ci jobs 123456789        # Show jobs for run 123456789
  pnpm monitor-ci logs 123456789        # Extract error logs
  pnpm monitor-ci watch nx-ci.yml 10    # Watch every 10 seconds

Workflows:
  nx-ci.yml (default)
  ci.yml
  nx-dynamic.yml
  nx-fully-dynamic.yml
  nx-matrix-dynamic.yml
        `)
				break

			default:
				console.error(`❌ Unknown command: ${command}`)
				console.error('Run "pnpm monitor-ci help" for available commands')
				process.exit(1)
		}
	} catch (error) {
		console.error("❌ Error:", error)
		process.exit(1)
	}
}

if (import.meta.url === `file://${process.argv[1]}`) {
	main()
}

export default CIMonitor
