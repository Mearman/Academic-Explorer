#!/usr/bin/env tsx

/**
 * Validation script for Academic Explorer generators
 * This script validates that all generator files and configurations are properly set up
 */

import { readFileSync, existsSync } from "fs"
import { join, dirname } from "path"
import { fileURLToPath } from "url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const ROOT_DIR = join(__dirname, "../..")

interface ValidationResult {
  success: boolean
  errors: string[]
  warnings: string[]
}

function checkFileExists(path: string, description: string): ValidationResult {
  const result: ValidationResult = {
    success: true,
    errors: [],
    warnings: [],
  }

  if (!existsSync(path)) {
    result.success = false
    result.errors.push(`Missing ${description}: ${path}`)
  }

  return result
}

function validateJSONFile(path: string, description: string): ValidationResult {
  const result = checkFileExists(path, description)
  if (!result.success) return result

  try {
    const content = readFileSync(path, "utf-8")
    JSON.parse(content)
  } catch (error) {
    result.success = false
    result.errors.push(`Invalid JSON in ${description}: ${error}`)
  }

  return result
}

function validateGenerator(
  generatorName: string,
  generatorPath: string,
): ValidationResult {
  console.log(`\n🔍 Validating ${generatorName} generator...`)

  const result: ValidationResult = {
    success: true,
    errors: [],
    warnings: [],
  }

  // Check required files
  const requiredFiles = [
    { file: "generator.json", desc: "generator configuration" },
    { file: "schema.json", desc: "generator schema" },
    { file: "generator.ts", desc: "generator implementation" },
  ]

  for (const { file, desc } of requiredFiles) {
    const filePath = join(generatorPath, file)
    const check = validateJSONFile(filePath, desc)
    result.success = result.success && check.success
    result.errors.push(...check.errors)
    result.warnings.push(...check.warnings)
  }

  // Check template files directory
  const templateDir = join(generatorPath, "files")
  const templateCheck = checkFileExists(templateDir, "template files directory")
  result.success = result.success && templateCheck.success
  result.errors.push(...templateCheck.errors)

  if (result.success) {
    console.log(`✅ ${generatorName} generator is valid`)
  } else {
    console.log(`❌ ${generatorName} generator has issues`)
  }

  return result
}

function main() {
  console.log("🚀 Validating Academic Explorer Generators")
  console.log("==========================================")

  const generatorsPath = join(__dirname)
  const overallResult: ValidationResult = {
    success: true,
    errors: [],
    warnings: [],
  }

  // Validate individual generators
  const generators = [
    { name: "Library", path: join(generatorsPath, "library") },
    { name: "Component", path: join(generatorsPath, "component") },
    { name: "Entity View", path: join(generatorsPath, "entity-view") },
  ]

  for (const { name, path } of generators) {
    const result = validateGenerator(name, path)
    overallResult.success = overallResult.success && result.success
    overallResult.errors.push(...result.errors)
    overallResult.warnings.push(...result.warnings)
  }

  // Validate workspace configuration
  console.log("\n🔍 Validating workspace configuration...")

  const nxJsonPath = join(ROOT_DIR, "nx.json")
  const nxJsonCheck = validateJSONFile(nxJsonPath, "nx.json")
  overallResult.success = overallResult.success && nxJsonCheck.success
  overallResult.errors.push(...nxJsonCheck.errors)

  if (nxJsonCheck.success) {
    try {
      const nxJson = JSON.parse(readFileSync(nxJsonPath, "utf-8"))
      const generators = nxJson.generators

      if (!generators) {
        overallResult.success = false
        overallResult.errors.push("No generators configuration found in nx.json")
      } else {
        const academicGenerators = Object.keys(generators).filter(key =>
          key.startsWith("@academic-explorer/generators:")
        )

        if (academicGenerators.length === 0) {
          overallResult.warnings.push("No Academic Explorer generators found in nx.json configuration")
        } else {
          console.log(`✅ Found ${academicGenerators.length} Academic Explorer generators in nx.json`)
        }
      }
    } catch (error) {
      overallResult.success = false
      overallResult.errors.push(`Error parsing nx.json: ${error}`)
    }
  }

  // Validate tools project configuration
  const toolsProjectPath = join(ROOT_DIR, "tools", "project.json")
  const toolsCheck = validateJSONFile(toolsProjectPath, "tools/project.json")
  overallResult.success = overallResult.success && toolsCheck.success
  overallResult.errors.push(...toolsCheck.errors)

  if (toolsCheck.success) {
    try {
      const toolsProject = JSON.parse(readFileSync(toolsProjectPath, "utf-8"))
      if (!toolsProject.generators || !Array.isArray(toolsProject.generators)) {
        overallResult.warnings.push("No generators array found in tools/project.json")
      } else {
        console.log(`✅ Found ${toolsProject.generators.length} generators registered in tools project`)
      }
    } catch (error) {
      overallResult.warnings.push(`Error parsing tools/project.json: ${error}`)
    }
  }

  // Summary
  console.log("\n" + "=".repeat(50))
  console.log("📊 VALIDATION SUMMARY")
  console.log("=".repeat(50))

  if (overallResult.success) {
    console.log("🎉 All generators are properly configured!")
    console.log("\n📝 Available generators:")
    console.log("  • @academic-explorer/generators:library")
    console.log("  • @academic-explorer/generators:component")
    console.log("  • @academic-explorer/generators:entity-view")
    console.log("\n💡 Usage examples:")
    console.log("  nx g @academic-explorer/generators:library my-lib --type=utility")
    console.log("  nx g @academic-explorer/generators:component MyComponent --withHooks")
    console.log("  nx g @academic-explorer/generators:entity-view author --withMocks")
  } else {
    console.log("❌ Validation failed with the following issues:")
    if (overallResult.errors.length > 0) {
      console.log("\n🚨 Errors:")
      overallResult.errors.forEach(error => console.log(`  • ${error}`))
    }
    if (overallResult.warnings.length > 0) {
      console.log("\n⚠️  Warnings:")
      overallResult.warnings.forEach(warning => console.log(`  • ${warning}`))
    }
  }

  if (!overallResult.success) {
    process.exit(1)
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main()
}