#!/usr/bin/env node

/**
 * Generate coverage badges for the Graph package
 *
 * This script reads coverage data and generates SVG badges for:
 * - Overall coverage percentage
 * - Individual metric badges (statements, branches, functions, lines)
 * - Phase 2 component coverage badges
 *
 * Usage:
 *   node scripts/generate-badges.js [coverage-summary.json]
 */

const fs = require("fs")
const path = require("path")

// Badge colors based on coverage percentage
const getColor = (percentage) => {
	if (percentage >= 95) return "brightgreen"
	if (percentage >= 90) return "green"
	if (percentage >= 80) return "yellowgreen"
	if (percentage >= 70) return "yellow"
	if (percentage >= 60) return "orange"
	return "red"
}

// Generate shields.io badge URL
const generateBadgeUrl = (label, message, color) => {
	const encodedLabel = encodeURIComponent(label)
	const encodedMessage = encodeURIComponent(message)
	return `https://img.shields.io/badge/${encodedLabel}-${encodedMessage}-${color}`
}

// Generate badge markdown
const generateBadgeMd = (label, percentage, alt) => {
	const color = getColor(percentage)
	const message = `${percentage}%`
	const url = generateBadgeUrl(label, message, color)
	return `![${alt}](${url})`
}

// Main function
function generateBadges(coveragePath = "./coverage/coverage-summary.json") {
	try {
		if (!fs.existsSync(coveragePath)) {
			console.error(`Coverage file not found: ${coveragePath}`)
			console.error("Run tests with coverage first: pnpm test:coverage")
			process.exit(1)
		}

		const coverage = JSON.parse(fs.readFileSync(coveragePath, "utf8"))
		const total = coverage.total

		// Generate individual metric badges
		const badges = {
			statements: generateBadgeMd("statements", total.statements.pct, "Statements Coverage"),
			branches: generateBadgeMd("branches", total.branches.pct, "Branches Coverage"),
			functions: generateBadgeMd("functions", total.functions.pct, "Functions Coverage"),
			lines: generateBadgeMd("lines", total.lines.pct, "Lines Coverage"),
		}

		// Generate overall badge (average of all metrics)
		const overall = Math.round(
			(total.statements.pct + total.branches.pct + total.functions.pct + total.lines.pct) / 4
		)
		badges.overall = generateBadgeMd("coverage", overall, "Overall Coverage")

		// Generate component-specific badges if data available
		const componentBadges = {}

		// Check for providers coverage
		const providersFiles = Object.keys(coverage).filter((file) => file.includes("/providers/"))
		if (providersFiles.length > 0) {
			const providersMetrics = providersFiles.reduce(
				(acc, file) => {
					const fileCoverage = coverage[file]
					acc.statements += fileCoverage.statements.pct
					acc.branches += fileCoverage.branches.pct
					acc.functions += fileCoverage.functions.pct
					acc.lines += fileCoverage.lines.pct
					acc.count += 1
					return acc
				},
				{ statements: 0, branches: 0, functions: 0, lines: 0, count: 0 }
			)

			if (providersMetrics.count > 0) {
				const providersAvg = Math.round(
					(providersMetrics.statements +
						providersMetrics.branches +
						providersMetrics.functions +
						providersMetrics.lines) /
						(4 * providersMetrics.count)
				)
				componentBadges.providers = generateBadgeMd("providers", providersAvg, "Providers Coverage")
			}
		}

		// Check for services coverage
		const servicesFiles = Object.keys(coverage).filter((file) => file.includes("/services/"))
		if (servicesFiles.length > 0) {
			const servicesMetrics = servicesFiles.reduce(
				(acc, file) => {
					const fileCoverage = coverage[file]
					acc.statements += fileCoverage.statements.pct
					acc.branches += fileCoverage.branches.pct
					acc.functions += fileCoverage.functions.pct
					acc.lines += fileCoverage.lines.pct
					acc.count += 1
					return acc
				},
				{ statements: 0, branches: 0, functions: 0, lines: 0, count: 0 }
			)

			if (servicesMetrics.count > 0) {
				const servicesAvg = Math.round(
					(servicesMetrics.statements +
						servicesMetrics.branches +
						servicesMetrics.functions +
						servicesMetrics.lines) /
						(4 * servicesMetrics.count)
				)
				componentBadges.services = generateBadgeMd("services", servicesAvg, "Services Coverage")
			}
		}

		// Generate badges README section
		const badgesSection = `
## Coverage Badges

### Overall Coverage
${badges.overall}

### Detailed Metrics
${badges.statements} ${badges.branches} ${badges.functions} ${badges.lines}

### Component Coverage
${Object.values(componentBadges).join(" ")}

### Badge URLs (for external use)
- Overall: \`${generateBadgeUrl("coverage", `${overall}%`, getColor(overall))}\`
- Statements: \`${generateBadgeUrl("statements", `${total.statements.pct}%`, getColor(total.statements.pct))}\`
- Branches: \`${generateBadgeUrl("branches", `${total.branches.pct}%`, getColor(total.branches.pct))}\`
- Functions: \`${generateBadgeUrl("functions", `${total.functions.pct}%`, getColor(total.functions.pct))}\`
- Lines: \`${generateBadgeUrl("lines", `${total.lines.pct}%`, getColor(total.lines.pct))}\`

---
*Coverage badges generated on ${new Date().toISOString()}*
`

		// Write badges to file
		const badgesPath = "./coverage/badges.md"
		fs.writeFileSync(badgesPath, badgesSection)

		// Generate JSON output for programmatic use
		const badgeData = {
			overall: {
				percentage: overall,
				color: getColor(overall),
				url: generateBadgeUrl("coverage", `${overall}%`, getColor(overall)),
			},
			metrics: {
				statements: {
					percentage: total.statements.pct,
					color: getColor(total.statements.pct),
					url: generateBadgeUrl(
						"statements",
						`${total.statements.pct}%`,
						getColor(total.statements.pct)
					),
				},
				branches: {
					percentage: total.branches.pct,
					color: getColor(total.branches.pct),
					url: generateBadgeUrl("branches", `${total.branches.pct}%`, getColor(total.branches.pct)),
				},
				functions: {
					percentage: total.functions.pct,
					color: getColor(total.functions.pct),
					url: generateBadgeUrl("functions", `${total.functions.pct}%`, getColor(total.functions.pct)),
				},
				lines: {
					percentage: total.lines.pct,
					color: getColor(total.lines.pct),
					url: generateBadgeUrl("lines", `${total.lines.pct}%`, getColor(total.lines.pct)),
				},
			},
			components: componentBadges,
			generatedAt: new Date().toISOString(),
		}

		fs.writeFileSync("./coverage/badges.json", JSON.stringify(badgeData, null, 2))

		console.log("✅ Coverage badges generated successfully!")
		console.log(`📊 Overall Coverage: ${overall}%`)
		console.log(`📁 Badges written to: ${badgesPath}`)
		console.log(`📄 Badge data written to: ./coverage/badges.json`)
	} catch (error) {
		console.error("❌ Error generating badges:", error.message)
		process.exit(1)
	}
}

// Run if called directly
if (require.main === module) {
	const coveragePath = process.argv[2] || "./coverage/coverage-summary.json"
	generateBadges(coveragePath)
}

module.exports = { generateBadges, generateBadgeUrl, getColor }
