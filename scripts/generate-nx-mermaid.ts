#!/usr/bin/env tsx
/**
 * Generate a Mermaid diagram of the Nx task dependency graph.
 * Each project is a subgraph with each task being a node.
 *
 * Usage:
 *   pnpm tsx scripts/generate-nx-mermaid.ts [options]
 *
 * Options:
 *   --output, -o   Output file path (default: stdout)
 *   --targets, -t  Comma-separated list of targets to include (default: all)
 *   --direction    Graph direction: TB, BT, LR, RL (default: TB)
 *   --update, -u   Update a section in a markdown file (e.g., README.md)
 *   --section, -s  Section name to update (default: "nx-task-graph")
 *
 * Examples:
 *   pnpm tsx scripts/generate-nx-mermaid.ts
 *   pnpm tsx scripts/generate-nx-mermaid.ts -o docs/task-graph.mmd
 *   pnpm tsx scripts/generate-nx-mermaid.ts -t build,test,lint
 *   pnpm tsx scripts/generate-nx-mermaid.ts -u README.md -s nx-task-graph
 *
 * Section markers in markdown:
 *   <!-- nx-task-graph-start -->
 *   ... (content will be replaced)
 *   <!-- nx-task-graph-end -->
 */

import { execSync } from "node:child_process"
import { readFileSync, writeFileSync } from "node:fs"
import { parseArgs } from "node:util"

interface TargetConfiguration {
	dependsOn?: Array<string | { target: string; projects?: string | string[] }>
	inputs?: unknown[]
	outputs?: string[]
	executor?: string
}

interface ProjectNode {
	name: string
	type: string
	data: {
		root: string
		targets?: Record<string, TargetConfiguration>
	}
}

interface ProjectGraph {
	graph: {
		nodes: Record<string, ProjectNode>
		dependencies: Record<string, Array<{ source: string; target: string }>>
	}
}

function getProjectGraph(): ProjectGraph {
	const output = execSync("nx graph --file=stdout 2>/dev/null", {
		encoding: "utf-8",
		maxBuffer: 50 * 1024 * 1024,
	})
	return JSON.parse(output) as ProjectGraph
}

function sanitizeId(id: string): string {
	// Mermaid IDs can't have certain characters
	return id.replace(/[^a-zA-Z0-9_]/g, "_")
}

interface PendingEdge {
	from: string
	to?: string
	toPattern?: string
	project?: string
}

function generateMermaid(
	projectGraph: ProjectGraph,
	targetFilter?: string[],
	direction: string = "TB"
): string {
	const lines: string[] = []
	const pendingEdges: PendingEdge[] = []

	lines.push(`flowchart ${direction}`)
	lines.push("")

	// Track all task nodes for edge resolution
	const taskNodes = new Map<string, string>() // "project:target" -> nodeId

	const { nodes, dependencies } = projectGraph.graph

	// Generate subgraphs for each project
	const projectEntries = Object.entries(nodes)
		.filter(([name]) => !name.startsWith("@")) // Skip scoped packages like @academic-explorer/generators
		.sort((a, b) => a[0].localeCompare(b[0]))

	for (const [projectName, node] of projectEntries) {
		const targets = node.data.targets ?? {}
		const targetEntries = Object.entries(targets).filter(
			([targetName]) => !targetFilter || targetFilter.includes(targetName)
		)

		if (targetEntries.length === 0) continue

		const subgraphId = sanitizeId(projectName)
		lines.push(`    subgraph ${subgraphId}["${projectName}"]`)

		for (const [targetName, targetConfig] of targetEntries.sort((a, b) =>
			a[0].localeCompare(b[0])
		)) {
			const nodeId = sanitizeId(`${projectName}_${targetName}`)
			taskNodes.set(`${projectName}:${targetName}`, nodeId)

			// Determine node shape based on target type
			let shape = `["${targetName}"]`
			if (targetName === "build") {
				shape = `[["${targetName}"]]` // Stadium shape for build
			} else if (targetName.startsWith("test")) {
				shape = `(["${targetName}"])` // Rounded for test
			} else if (targetName === "lint" || targetName === "typecheck") {
				shape = `{{"${targetName}"}}` // Hexagon for validation
			} else if (targetName === "e2e") {
				shape = `[/"${targetName}"/]` // Parallelogram for e2e
			}

			lines.push(`        ${nodeId}${shape}`)

			// Process dependencies
			const deps = targetConfig.dependsOn ?? []
			for (const dep of deps) {
				if (typeof dep === "string") {
					if (dep.startsWith("^")) {
						// Dependency on same target in dependent projects
						const depTarget = dep.slice(1)
						pendingEdges.push({
							from: `${projectName}:${targetName}`,
							toPattern: `^${depTarget}`,
							project: projectName,
						})
					} else {
						// Dependency on another target in same project
						pendingEdges.push({
							from: `${projectName}:${targetName}`,
							to: `${projectName}:${dep}`,
						})
					}
				} else if (dep.target) {
					// Explicit dependency object
					const targetProjects = dep.projects
					if (targetProjects === "self" || !targetProjects) {
						pendingEdges.push({
							from: `${projectName}:${targetName}`,
							to: `${projectName}:${dep.target}`,
						})
					} else if (targetProjects === "dependencies") {
						pendingEdges.push({
							from: `${projectName}:${targetName}`,
							toPattern: `^${dep.target}`,
							project: projectName,
						})
					}
				}
			}
		}

		lines.push("    end")
		lines.push("")
	}

	// Resolve edges
	const edgeLines: string[] = []
	const addedEdges = new Set<string>()

	for (const edge of pendingEdges) {
		if (edge.to) {
			// Direct dependency
			const fromNode = taskNodes.get(edge.from)
			const toNode = taskNodes.get(edge.to)
			if (fromNode && toNode) {
				const edgeKey = `${toNode}-->${fromNode}`
				if (!addedEdges.has(edgeKey)) {
					edgeLines.push(`    ${toNode} --> ${fromNode}`)
					addedEdges.add(edgeKey)
				}
			}
		} else if (edge.toPattern?.startsWith("^") && edge.project) {
			// Dependency on upstream projects' target
			const targetName = edge.toPattern.slice(1)
			const projectDeps = dependencies[edge.project] ?? []

			for (const dep of projectDeps) {
				const depProject = dep.target
				const depTaskKey = `${depProject}:${targetName}`
				const fromNode = taskNodes.get(edge.from)
				const toNode = taskNodes.get(depTaskKey)

				if (fromNode && toNode) {
					const edgeKey = `${toNode}-->${fromNode}`
					if (!addedEdges.has(edgeKey)) {
						edgeLines.push(`    ${toNode} --> ${fromNode}`)
						addedEdges.add(edgeKey)
					}
				}
			}
		}
	}

	// Add edges section
	if (edgeLines.length > 0) {
		lines.push("    %% Task dependencies")
		lines.push(...edgeLines)
	}

	return lines.join("\n")
}

function updateMarkdownSection(
	filePath: string,
	sectionName: string,
	content: string
): boolean {
	const startMarker = `<!-- ${sectionName}-start -->`
	const endMarker = `<!-- ${sectionName}-end -->`

	let fileContent: string
	try {
		fileContent = readFileSync(filePath, "utf-8")
	} catch {
		console.error(`Error: Could not read file ${filePath}`)
		return false
	}

	const startIndex = fileContent.indexOf(startMarker)
	const endIndex = fileContent.indexOf(endMarker)

	if (startIndex === -1 || endIndex === -1) {
		console.error(`Error: Section markers not found in ${filePath}`)
		console.error(`Expected markers:`)
		console.error(`  ${startMarker}`)
		console.error(`  ${endMarker}`)
		return false
	}

	if (startIndex >= endIndex) {
		console.error(`Error: Start marker must come before end marker`)
		return false
	}

	const mermaidBlock = `\`\`\`mermaid\n${content}\n\`\`\``
	const newContent =
		fileContent.slice(0, startIndex + startMarker.length) +
		"\n" +
		mermaidBlock +
		"\n" +
		fileContent.slice(endIndex)

	writeFileSync(filePath, newContent)
	return true
}

async function main() {
	const { values } = parseArgs({
		options: {
			output: { type: "string", short: "o" },
			targets: { type: "string", short: "t" },
			direction: { type: "string", short: "d", default: "TB" },
			update: { type: "string", short: "u" },
			section: { type: "string", short: "s", default: "nx-task-graph" },
			help: { type: "boolean", short: "h" },
		},
	})

	if (values.help) {
		console.log(`
Usage: pnpm tsx scripts/generate-nx-mermaid.ts [options]

Options:
  -o, --output <file>     Output file path (default: stdout)
  -t, --targets <list>    Comma-separated targets to include (default: all)
  -d, --direction <dir>   Graph direction: TB, BT, LR, RL (default: TB)
  -u, --update <file>     Update section in markdown file (e.g., README.md)
  -s, --section <name>    Section name for markers (default: nx-task-graph)
  -h, --help              Show this help message

Section markers in markdown:
  <!-- nx-task-graph-start -->
  ... (content will be replaced)
  <!-- nx-task-graph-end -->
`)
		process.exit(0)
	}

	const targetFilter = values.targets?.split(",").map((t) => t.trim())
	const direction = values.direction ?? "TB"

	console.error("Fetching project graph...")
	const projectGraph = getProjectGraph()

	const projectCount = Object.keys(projectGraph.graph.nodes).length
	console.error(`Found ${projectCount} projects`)
	console.error("Generating Mermaid diagram...")

	const mermaid = generateMermaid(projectGraph, targetFilter, direction)

	if (values.update) {
		const sectionName = values.section ?? "nx-task-graph"
		const success = updateMarkdownSection(values.update, sectionName, mermaid)
		if (success) {
			console.error(`Updated section "${sectionName}" in ${values.update}`)
		} else {
			process.exit(1)
		}
	} else if (values.output) {
		writeFileSync(values.output, mermaid)
		console.error(`Written to ${values.output}`)
	} else {
		console.log(mermaid)
	}
}

main().catch((err) => {
	console.error(err)
	process.exit(1)
})
