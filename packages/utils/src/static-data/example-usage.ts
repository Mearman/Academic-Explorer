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
} from './index.js';
import { logger } from '../logger.js';

/**
 * Example: Generate indexes for all entity types
 */
export async function exampleGenerateAllIndexes(rootPath: string): Promise<void> {
  try {
    const config: Partial<IndexGenerationConfig> = {
      rootPath,
      extractBasicInfo: true,
      computeStats: true,
      concurrency: 2,
      createBackups: true,
    };

    const result = await generateAllIndexes(rootPath, config);
    
    if (result.success) {
      logger.info('static-data', 'All indexes generated successfully');
      logger.info('static-data', `Total entities indexed: ${result.stats.entitiesIndexed}`);
      logger.info('static-data', `Total duration: ${result.stats.totalDurationMs}ms`);
      logger.info('static-data', 'Generated indexes:', Object.keys(result.generatedIndexes));
    } else {
      logger.error('static-data', 'Index generation failed:', result.error?.message);
    }
  } catch (error) {
    logger.error('static-data', 'Unexpected error:', error);
  }
}

/**
 * Example: Generate index for a specific entity type
 */
export async function exampleGenerateEntityTypeIndex(
  rootPath: string, 
  entityType: EntityType
): Promise<void> {
  try {
    const config: Partial<IndexGenerationConfig> = {
      rootPath,
      extractBasicInfo: true,
      computeStats: true,
    };

    const indexPath = await generateIndexForEntityType(rootPath, entityType, config);
    logger.info('static-data', `Index generated for ${entityType}: ${indexPath}`);
  } catch (error) {
    logger.error('static-data', `Failed to generate index for ${entityType}:`, error);
  }
}

/**
 * Example: Validate and repair an existing index
 */
export async function exampleValidateAndRepairIndex(indexPath: string): Promise<void> {
  try {
    // Validate the index
    const validation = await validateIndex(indexPath);
    
    logger.info('static-data', `Index validation results for ${indexPath}:`);
    logger.info('static-data', `   Valid: ${validation.isValid ? 'Valid' : 'Invalid'}`);
    logger.info('static-data', `   Entities validated: ${validation.entitiesValidated}`);
    logger.info('static-data', `   Errors found: ${validation.errors.length}`);
    logger.info('static-data', `   Warnings found: ${validation.warnings.length}`);
    logger.info('static-data', `   Duration: ${validation.performance.durationMs}ms`);

    // Show errors if any
    if (validation.errors.length > 0) {
      logger.warn('static-data', 'Errors found:');
      for (const error of validation.errors) {
        logger.warn('static-data', `   - ${error.type}: ${error.message}`);
        if (error.canAutoRepair) {
          logger.warn('static-data', '     Can be auto-repaired');
        }
      }
    }

    // Show warnings if any
    if (validation.warnings.length > 0) {
      logger.warn('static-data', 'Warnings found:');
      for (const warning of validation.warnings) {
        logger.warn('static-data', `   - ${warning.type}: ${warning.message} (${warning.severity})`);
      }
    }

    // Attempt repair if needed
    if (!validation.isValid && validation.repairActions.length > 0) {
      logger.info('static-data', 'Attempting to repair index...');
      const repaired = await repairIndex(validation);

      if (repaired) {
        logger.info('static-data', 'Index repair completed successfully');

        // Re-validate to confirm repair
        const revalidation = await validateIndex(indexPath);
        logger.info('static-data', `   Re-validation: ${revalidation.isValid ? 'Valid' : 'Still invalid'}`);
      } else {
        logger.error('static-data', 'Index repair failed');
      }
    }
  } catch (error) {
    logger.error('static-data', 'Validation/repair failed:', error);
  }
}

/**
 * Example: Use custom index generator with progress tracking
 */
export async function exampleCustomGeneratorWithProgress(rootPath: string): Promise<void> {
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
      const operation = progress.operation.charAt(0).toUpperCase() + progress.operation.slice(1);
      const speed = Math.round(progress.processingSpeed);

      logger.debug(
        'static-data',
        `${operation}: ${percent}% (${progress.filesProcessed}/${progress.totalFiles}) - ${speed} files/sec - ${progress.currentEntityType}`
      );

      if (progress.currentFile) {
        logger.debug('static-data', `   Current: ${progress.currentFile}`);
      }
    });

    // Generate all indexes
    const result = await generator.generateAllIndexes();

    if (result.success) {
      logger.info('static-data', 'Index generation completed with progress tracking!');
    } else {
      logger.error('static-data', 'Index generation failed:', result.error?.message);
    }
  } catch (error) {
    logger.error('static-data', 'Custom generator failed:', error);
  }
}

/**
 * Example: Batch validation of multiple indexes
 */
export async function exampleBatchValidation(indexPaths: string[]): Promise<void> {
  logger.info('static-data', `Validating ${indexPaths.length} indexes...`);

  const results = await Promise.allSettled(
    indexPaths.map(async (indexPath) => {
      const validation = await validateIndex(indexPath);
      return { indexPath, validation };
    })
  );

  let validCount = 0;
  let invalidCount = 0;

  for (const result of results) {
    if (result.status === 'fulfilled') {
      const { indexPath, validation } = result.value;
      if (validation.isValid) {
        validCount++;
        logger.info('static-data', `${indexPath}: Valid (${validation.entitiesValidated} entities)`);
      } else {
        invalidCount++;
        logger.warn('static-data', `${indexPath}: Invalid (${validation.errors.length} errors)`);
      }
    } else {
      invalidCount++;
      logger.error('static-data', `Validation failed: ${result.reason}`);
    }
  }

  logger.info('static-data', `Validation summary: ${validCount} valid, ${invalidCount} invalid`);
}

/**
 * Example error handling and best practices
 */
export async function exampleErrorHandling(rootPath: string): Promise<void> {
  try {
    // Check if root path exists before starting
    const fs = await import('fs/promises');
    try {
      await fs.access(rootPath);
    } catch {
      throw new Error(`Root path does not exist: ${rootPath}`);
    }

    // Use appropriate configuration for your use case
    const config: IndexGenerationConfig = {
      rootPath,
      extractBasicInfo: true,        // Extract entity metadata
      computeStats: true,            // Compute detailed statistics
      maxFileSize: 50 * 1024 * 1024, // 50MB file size limit
      fileProcessingTimeoutMs: 30000, // 30 second timeout per file
      concurrency: 2,                // Process 2 files concurrently
      createBackups: true,           // Create backups before overwriting
      schemaVersion: '1.0.0',        // Schema version for compatibility
      entityTypes: ['works', 'authors'], // Only process specific types
    };

    const result = await generateAllIndexes(rootPath, config);

    if (!result.success) {
      throw new Error(`Index generation failed: ${result.error?.message}`);
    }

    // Validate all generated indexes
    for (const [entityType, indexPath] of Object.entries(result.generatedIndexes)) {
      const validation = await validateIndex(indexPath);
      if (!validation.isValid) {
        logger.warn('static-data', `Generated index for ${entityType} has validation issues`);
      }
    }

    logger.info('static-data', 'Index generation and validation completed successfully');

  } catch (error) {
    if (error instanceof Error) {
      logger.error('static-data', `Error: ${error.message}`);
    } else {
      logger.error('static-data', 'Unknown error occurred');
    }

    // Re-throw for calling code to handle
    throw error;
  }
}