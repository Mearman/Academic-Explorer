#!/usr/bin/env tsx
/**
 * Nx Cloud Installation and Configuration Script
 * Helps set up Nx Cloud for distributed caching
 */

import { execSync } from "child_process"
import { readFileSync, writeFileSync } from "fs"
import { join } from "path"

const REPO_ROOT = process.cwd()

interface NxConfig {
	tasksRunnerOptions?: {
		default?: {
			runner?: string
			options?: {
				accessToken?: string
				encryptionKey?: string
				[key: string]: unknown
			}
		}
	}
	[key: string]: unknown
}

function printHeader() {
	console.log("🚀 Nx Cloud Setup Assistant")
	console.log("==========================")
	console.log("")
}

function checkNxCloudStatus(): boolean {
	try {
		const nxConfigPath = join(REPO_ROOT, "nx.json")
		const nxConfig: NxConfig = JSON.parse(readFileSync(nxConfigPath, "utf-8"))

		const runner = nxConfig.tasksRunnerOptions?.default?.runner
		return runner === "@nx/nx-cloud" || runner?.includes("nx-cloud") === true
	} catch (error) {
		console.error("❌ Error reading nx.json:", error)
		return false
	}
}

function installNxCloud() {
	console.log("📦 Installing @nx/nx-cloud package...")

	try {
		execSync("pnpm add -D @nx/nx-cloud", {
			stdio: "inherit",
			cwd: REPO_ROOT,
		})
		console.log("✅ @nx/nx-cloud package installed")
	} catch (error) {
		console.error("❌ Failed to install @nx/nx-cloud:", error)
		process.exit(1)
	}
}

function generateNxCloudConfig() {
	console.log("⚙️  Configuring Nx Cloud in nx.json...")

	try {
		const nxConfigPath = join(REPO_ROOT, "nx.json")
		const nxConfig: NxConfig = JSON.parse(readFileSync(nxConfigPath, "utf-8"))

		// Update tasksRunnerOptions to use Nx Cloud
		if (!nxConfig.tasksRunnerOptions) {
			nxConfig.tasksRunnerOptions = {}
		}

		if (!nxConfig.tasksRunnerOptions.default) {
			nxConfig.tasksRunnerOptions.default = {}
		}

		nxConfig.tasksRunnerOptions.default.runner = "@nx/nx-cloud"

		if (!nxConfig.tasksRunnerOptions.default.options) {
			nxConfig.tasksRunnerOptions.default.options = {}
		}

		// Set up token placeholders
		nxConfig.tasksRunnerOptions.default.options.accessToken = "process.env.NX_CLOUD_ACCESS_TOKEN"
		nxConfig.tasksRunnerOptions.default.options.encryptionKey = "process.env.NX_CLOUD_ENCRYPTION_KEY"

		writeFileSync(nxConfigPath, JSON.stringify(nxConfig, null, 2))
		console.log("✅ nx.json updated with Nx Cloud configuration")
	} catch (error) {
		console.error("❌ Failed to update nx.json:", error)
		process.exit(1)
	}
}

function createEnvExample() {
	console.log("📝 Creating .env.example with Nx Cloud tokens...")

	const envExample = `# Nx Cloud Configuration
# Get these values from https://nx.app after creating a workspace
NX_CLOUD_ACCESS_TOKEN=your_nx_cloud_access_token_here
NX_CLOUD_ENCRYPTION_KEY=your_nx_cloud_encryption_key_here

# CI Environment Variables
# Add these to your CI/CD platform's environment variables
# GitHub Actions: Repository Settings > Secrets and variables > Actions
# GitLab CI: Project Settings > CI/CD > Variables
`

	try {
		writeFileSync(join(REPO_ROOT, ".env.example"), envExample)
		console.log("✅ .env.example created with Nx Cloud configuration")
	} catch (error) {
		console.error("❌ Failed to create .env.example:", error)
	}
}

function printNextSteps() {
	console.log("")
	console.log("🎉 Nx Cloud setup complete!")
	console.log("")
	console.log("Next steps:")
	console.log("1. Visit https://nx.app to create a new workspace")
	console.log("2. Copy your access token and encryption key")
	console.log("3. Add them to your environment:")
	console.log("   - Locally: Create .env file with tokens")
	console.log("   - CI: Add tokens to your CI platform secrets")
	console.log("")
	console.log("Environment variable names:")
	console.log("  NX_CLOUD_ACCESS_TOKEN")
	console.log("  NX_CLOUD_ENCRYPTION_KEY")
	console.log("")
	console.log("Test your setup with:")
	console.log("  pnpm nx run-many -t build --parallel=8")
	console.log("")
	console.log("Expected benefits:")
	console.log("  - 🚀 50-90% faster CI builds through shared caching")
	console.log("  - 📊 Distributed task execution insights")
	console.log("  - 🔄 Cache sharing across team members and CI")
	console.log("  - 📈 Build performance analytics")
}

function main() {
	printHeader()

	// Check if already configured
	if (checkNxCloudStatus()) {
		console.log("✅ Nx Cloud is already configured!")
		console.log("")
		console.log("Current configuration in nx.json detected.")
		console.log("Make sure you have these environment variables set:")
		console.log("  - NX_CLOUD_ACCESS_TOKEN")
		console.log("  - NX_CLOUD_ENCRYPTION_KEY")
		console.log("")
		console.log("Test with: pnpm nx run-many -t build --parallel=8")
		return
	}

	console.log("🔍 Nx Cloud not detected. Setting up...")
	console.log("")

	// Install and configure
	installNxCloud()
	generateNxCloudConfig()
	createEnvExample()
	printNextSteps()
}

// Run if called directly
if (require.main === module) {
	main()
}

export { main, checkNxCloudStatus, installNxCloud }
