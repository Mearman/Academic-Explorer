#!/usr/bin/env node

/**
 * Simple OpenAlex CLI - Temporary working version
 * Demonstrates CLI structure while complex dependencies are being resolved
 */

import { Command } from "commander";
import { logger } from "@academic-explorer/utils/logger";
import { detectEntityType, SUPPORTED_ENTITIES } from "./entity-detection.js";

const program = new Command();

program
  .name("openalex-cli")
  .description("CLI for OpenAlex data access")
  .version("8.1.0");

program
  .command("detect <entity-id>")
  .description("Detect entity type from OpenAlex ID")
  .action((entityId: string) => {
    try {
      const entityType = detectEntityType(entityId);
      console.log(`Entity ID: ${entityId}`);
      console.log(`Detected type: ${entityType}`);
      logger.debug("cli", "Entity type detected", { entityId, entityType });
    } catch (error) {
      console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
      logger.error("cli", "Failed to detect entity type", { entityId, error });
      process.exit(1);
    }
  });

program
  .command("entities")
  .description("List supported entity types")
  .action(() => {
    console.log("Supported entity types:");
    SUPPORTED_ENTITIES.forEach(type => {
      console.log(`  - ${type}`);
    });
  });

program
  .command("test")
  .description("Test CLI functionality")
  .action(() => {
    console.log("✅ CLI is working!");
    console.log("📦 Using packages:");
    console.log("  - @academic-explorer/shared-utils (logger)");
    console.log("  - Entity detection utilities");
    logger.debug("cli", "CLI test command executed successfully");
  });

// Error handling
program.configureOutput({
  writeErr: (str) => {
    logger.error("cli", str);
    process.stderr.write(str);
  }
});

// Parse command line arguments
// Always parse in CLI mode
program.parse();