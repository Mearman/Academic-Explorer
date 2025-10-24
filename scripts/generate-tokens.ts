#!/usr/bin/env tsx

import { readFileSync, writeFileSync } from "fs"
import { join } from "path"

const tokensPath = join(process.cwd(), "packages/ui/src/theme/tokens.ts")
const jsonPath = join(process.cwd(), "packages/ui/src/theme/tokens.json")

// Read the tokens.ts file
const tokensContent = readFileSync(tokensPath, "utf-8")

// Extract the exported objects using regex and clean TypeScript syntax
const extractObject = (exportName: string): Record<string, unknown> => {
	const regex = new RegExp(`export const ${exportName} = ([\\s\\S]*?);`, "m")
	const match = tokensContent.match(regex)
	if (!match) {
		throw new Error(`Could not find export ${exportName}`)
	}
	// Remove TypeScript syntax like 'as const'
	const objectStr = match[1].replace(/\s+as\s+const/g, "")
	// Use Function constructor instead of eval for better security
	return new Function(`return ${objectStr}`)()
}

// Extract all token objects
const tokensJson = {
	spacing: extractObject("spacing"),
	colors: extractObject("colors"),
	typography: extractObject("typography"),
	borderRadius: extractObject("borderRadius"),
	shadows: extractObject("shadows"),
}

// Write the JSON file
writeFileSync(jsonPath, JSON.stringify(tokensJson, null, 2))

console.log("✅ Generated tokens.json from tokens.ts")
