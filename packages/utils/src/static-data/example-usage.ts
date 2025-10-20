/**
 * Example usage of the Static Data Index Generator
 *
 * This file demonstrates how to use the static data index generator
 * for creating and managing entity indexes.
 */

import {
  generateAllIndexes,
  generateIndexForEntityType,
  validateIndex,
  repairIndex,
  createIndexGenerator,
  type IndexGenerationConfig,
  type EntityType,
  type IndexValidationResult,
} from "./index.js";
import { logger } from "../logger.js";

// Constants for example usage
const LOG_CATEGORY = "static-data";

/**
 * Log validation summary information
 */
function logValidationSummary({
  validation,
  indexPath,
}: {
  validation: IndexValidationResult;
  indexPath: string;
}): void {
  logger.debug(LOG_CATEGORY, `Index validation results for ${indexPath}:`);
  logger.debug(
    LOG_CATEGORY,
    `   Valid: ${validation.isValid ? "Valid" : "Invalid"}`,
  );
  logger.debug(
    LOG_CATEGORY,
    `   Entities validated: ${validation.entitiesValidated}`,
  );
  logger.debug(LOG_CATEGORY, `   Errors found: ${validation.errors.length}`);
  logger.debug(
    LOG_CATEGORY,
    `   Warnings found: ${validation.warnings.length}`,
  );
  logger.debug(
    LOG_CATEGORY,
    `   Duration: ${validation.performance.durationMs}ms`,
  );
}

/**
 * Log validation errors
 */
function logValidationErrors(validation: IndexValidationResult): void {
  if (validation.errors.length > 0) {
    logger.warn(LOG_CATEGORY, "Errors found:");
    for (const error of validation.errors) {
      logger.warn(LOG_CATEGORY, `   - ${error.type}: ${error.message}`);
      if (error.canAutoRepair) {
        logger.warn(LOG_CATEGORY, "     Can be auto-repaired");
      }
    }
  }
}

/**
 * Log validation warnings
 */
function logValidationWarnings(validation: IndexValidationResult): void {
  if (validation.warnings.length > 0) {
    logger.warn(LOG_CATEGORY, "Warnings found:");
    for (const warning of validation.warnings) {
      logger.warn(
        LOG_CATEGORY,
        `   - ${warning.type}: ${warning.message} (${warning.severity})`,
      );
    }
  }
}

/**
 * Example: Generate indexes for all entity types
 */
export async function exampleGenerateAllIndexes(
  rootPath: string,
): Promise<void> {
  try {
    const config: Partial<IndexGenerationConfig> = {
      rootPath,
      extractBasicInfo: true,
      computeStats: true,
      createBackups: true,
    };

    const result = await generateAllIndexes(rootPath, config);

    if (result.success) {
      logger.debug(LOG_CATEGORY, "All indexes generated successfully");
      logger.debug(
        LOG_CATEGORY,
        `Total entities indexed: ${result.stats.entitiesIndexed}`,
      );
      logger.debug(
        LOG_CATEGORY,
        `Total duration: ${result.stats.totalDurationMs}ms`,
      );
      logger.debug(
        LOG_CATEGORY,
        "Generated indexes:",
        Object.keys(result.generatedIndexes),
      );
    } else {
      logger.error(
        LOG_CATEGORY,
        "Index generation failed:",
        result.error?.message,
      );
    }
  } catch (error) {
    logger.error(LOG_CATEGORY, "Unexpected error:", error);
  }
}

/**
 * Example: Generate index for a specific entity type
 */
export async function exampleGenerateEntityTypeIndex({
  rootPath,
  entityType,
}: {
  rootPath: string;
  entityType: EntityType;
}): Promise<void> {
  try {
    const config: Partial<IndexGenerationConfig> = {
      rootPath,
      extractBasicInfo: true,
      computeStats: true,
    };

    const indexPath = await generateIndexForEntityType({
      rootPath,
      entityType,
      config,
    });
    logger.debug(
      LOG_CATEGORY,
      `Index generated for ${entityType}: ${indexPath}`,
    );
  } catch (error) {
    logger.error(
      LOG_CATEGORY,
      `Failed to generate index for ${entityType}:`,
      error,
    );
  }
}

/**
 * Example: Validate and repair an existing index
 */
export async function exampleValidateAndRepairIndex(
  indexPath: string,
): Promise<void> {
  try {
    // Validate the index
    const validation = await validateIndex(indexPath);

    logValidationSummary({ validation, indexPath });
    logValidationErrors(validation);
    logValidationWarnings(validation);

    // Attempt repair if needed
    if (!validation.isValid && validation.repairActions.length > 0) {
      logger.debug(LOG_CATEGORY, "Attempting to repair index...");
      const repaired = await repairIndex(validation);

      if (repaired) {
        logger.debug(LOG_CATEGORY, "Index repair completed successfully");

        // Re-validate to confirm repair
        const revalidation = await validateIndex(indexPath);
        logger.debug(
          LOG_CATEGORY,
          `   Re-validation: ${revalidation.isValid ? "Valid" : "Still invalid"}`,
        );
      } else {
        logger.error(LOG_CATEGORY, "Index repair failed");
      }
    }
  } catch (error) {
    logger.error(LOG_CATEGORY, "Validation/repair failed:", error);
  }
}

/**
 * Example: Use custom index generator with progress tracking
 */
export async function exampleCustomGeneratorWithProgress(
  rootPath: string,
): Promise<void> {
  try {
    const config: Partial<IndexGenerationConfig> = {
      rootPath,
      extractBasicInfo: true,
      computeStats: true,
      concurrency: 4,
      maxFileSize: 10 * 1024 * 1024, // 10MB
    };

    const generator = createIndexGenerator(config);

    // Set up progress tracking
    generator.onProgress((progress) => {
      const percent = Math.round(progress.progressPercent);
      const operation =
        progress.operation.charAt(0).toUpperCase() +
        progress.operation.slice(1);
      const speed = Math.round(progress.processingSpeed);

      logger.debug(
        LOG_CATEGORY,
        `${operation}: ${percent}% (${progress.filesProcessed}/${progress.totalFiles}) - ${speed} files/sec - ${progress.currentEntityType}`,
      );

      if (progress.currentFile) {
        logger.debug(LOG_CATEGORY, `   Current: ${progress.currentFile}`);
      }
    });

    // Generate all indexes
    const result = await generator.generateAllIndexes();

    if (result.success) {
      logger.debug(
        LOG_CATEGORY,
        "Index generation completed with progress tracking!",
      );
    } else {
      logger.error(
        LOG_CATEGORY,
        "Index generation failed:",
        result.error?.message,
      );
    }
  } catch (error) {
    logger.error(LOG_CATEGORY, "Custom generator failed:", error);
  }
}

/**
 * Example: Batch validation of multiple indexes
 */
export async function exampleBatchValidation(
  indexPaths: string[],
): Promise<void> {
  logger.debug(LOG_CATEGORY, `Validating ${indexPaths.length} indexes...`);

  const results = await Promise.allSettled(
    indexPaths.map(async (indexPath) => {
      const validation = await validateIndex(indexPath);
      return { indexPath, validation };
    }),
  );

  let validCount = 0;
  let invalidCount = 0;

  for (const result of results) {
    if (result.status === "fulfilled") {
      const { indexPath, validation } = result.value;
      if (validation.isValid) {
        validCount++;
        logger.debug(
          LOG_CATEGORY,
          `${indexPath}: Valid (${validation.entitiesValidated} entities)`,
        );
      } else {
        invalidCount++;
        logger.warn(
          LOG_CATEGORY,
          `${indexPath}: Invalid (${validation.errors.length} errors)`,
        );
      }
    } else {
      invalidCount++;
      logger.error(LOG_CATEGORY, `Validation failed: ${result.reason}`);
    }
  }

  logger.debug(
    LOG_CATEGORY,
    `Validation summary: ${validCount} valid, ${invalidCount} invalid`,
  );
}
