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
      console.log('✅ All indexes generated successfully');
      console.log(`Total entities indexed: ${result.stats.entitiesIndexed}`);
      console.log(`Total duration: ${result.stats.totalDurationMs}ms`);
      console.log(`Generated indexes:`, Object.keys(result.generatedIndexes));
    } else {
      console.error('❌ Index generation failed:', result.error?.message);
    }
  } catch (error) {
    console.error('❌ Unexpected error:', error);
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
    console.log(`✅ Index generated for ${entityType}: ${indexPath}`);
  } catch (error) {
    console.error(`❌ Failed to generate index for ${entityType}:`, error);
  }
}

/**
 * Example: Validate and repair an existing index
 */
export async function exampleValidateAndRepairIndex(indexPath: string): Promise<void> {
  try {
    // Validate the index
    const validation = await validateIndex(indexPath);
    
    console.log(`Index validation results for ${indexPath}:`);
    console.log(`   Valid: ${validation.isValid ? '✅' : '❌'}`);
    console.log(`   Entities validated: ${validation.entitiesValidated}`);
    console.log(`   Errors found: ${validation.errors.length}`);
    console.log(`   Warnings found: ${validation.warnings.length}`);
    console.log(`   Duration: ${validation.performance.durationMs}ms`);

    // Show errors if any
    if (validation.errors.length > 0) {
      console.log('\n❌ Errors found:');
      for (const error of validation.errors) {
        console.log(`   - ${error.type}: ${error.message}`);
        if (error.canAutoRepair) {
          console.log(`     🔧 Can be auto-repaired`);
        }
      }
    }

    // Show warnings if any
    if (validation.warnings.length > 0) {
      console.log('\n⚠️  Warnings found:');
      for (const warning of validation.warnings) {
        console.log(`   - ${warning.type}: ${warning.message} (${warning.severity})`);
      }
    }

    // Attempt repair if needed
    if (!validation.isValid && validation.repairActions.length > 0) {
      console.log('\n🔧 Attempting to repair index...');
      const repaired = await repairIndex(validation);
      
      if (repaired) {
        console.log('✅ Index repair completed successfully');
        
        // Re-validate to confirm repair
        const revalidation = await validateIndex(indexPath);
        console.log(`   Re-validation: ${revalidation.isValid ? '✅ Valid' : '❌ Still invalid'}`);
      } else {
        console.log('❌ Index repair failed');
      }
    }
  } catch (error) {
    console.error('❌ Validation/repair failed:', error);
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
      
      console.log(
        `📈 ${operation}: ${percent}% (${progress.filesProcessed}/${progress.totalFiles}) ` +
        `- ${speed} files/sec - ${progress.currentEntityType}`
      );

      if (progress.currentFile) {
        console.log(`   📄 Current: ${progress.currentFile}`);
      }
    });

    // Generate all indexes
    const result = await generator.generateAllIndexes();
    
    if (result.success) {
      console.log('🎉 Index generation completed with progress tracking!');
    } else {
      console.error('❌ Index generation failed:', result.error?.message);
    }
  } catch (error) {
    console.error('❌ Custom generator failed:', error);
  }
}

/**
 * Example: Batch validation of multiple indexes
 */
export async function exampleBatchValidation(indexPaths: string[]): Promise<void> {
  console.log(`🔍 Validating ${indexPaths.length} indexes...`);
  
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
        console.log(`✅ ${indexPath}: Valid (${validation.entitiesValidated} entities)`);
      } else {
        invalidCount++;
        console.log(`❌ ${indexPath}: Invalid (${validation.errors.length} errors)`);
      }
    } else {
      invalidCount++;
      console.log(`❌ Validation failed: ${result.reason}`);
    }
  }

  console.log(`\n📊 Validation summary: ${validCount} valid, ${invalidCount} invalid`);
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
        console.warn(`⚠️  Generated index for ${entityType} has validation issues`);
      }
    }

    console.log('✅ Index generation and validation completed successfully');

  } catch (error) {
    if (error instanceof Error) {
      console.error(`❌ Error: ${error.message}`);
    } else {
      console.error('❌ Unknown error occurred');
    }
    
    // Re-throw for calling code to handle
    throw error;
  }
}