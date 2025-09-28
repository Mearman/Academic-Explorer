/**
 * Static Data Index Generator Module
 * 
 * Exports utilities for generating and managing index files for entity type directories.
 * Enables fast entity lookups without scanning entire directory structures.
 * 
 * Key Features:
 * - Efficient entity file discovery and metadata extraction
 * - Automatic index regeneration when files change
 * - Index validation and corruption repair
 * - Progress tracking for long-running operations
 * - Concurrent processing with configurable limits
 * 
 * @example
 * ```typescript
 * import { generateAllIndexes, validateIndex, repairIndex } from '@academic-explorer/utils';
 * 
 * // Generate indexes for all entity types
 * const result = await generateAllIndexes('/path/to/static/data');
 * 
 * // Validate an existing index
 * const validation = await validateIndex('/path/to/works/index.json');
 * 
 * // Repair a corrupted index
 * if (!validation.isValid) {
 *   const repaired = await repairIndex(validation);
 * }
 * ```
 */

// Export main index generator class
export {
  StaticDataIndexGenerator,
  generateAllIndexes,
  generateIndexForEntityType,
  generatePathBasedIndexes,
  validateIndex,
  repairIndex,
  createIndexGenerator,
} from './index-generator.js';

// Export all types
export type {
  EntityType,
  EntityFileMetadata,
  EntityTypeIndex,
  MasterIndex,
  IndexValidationResult,
  IndexValidationError,
  IndexValidationWarning,
  IndexRepairAction,
  IndexGenerationConfig,
  IndexGenerationProgress,
  IndexGenerationResult,
  PathFileReference,
  PathDirectoryReference,
  PathDirectoryIndex,
  PathEntityTypeIndex,
  PathRootIndex,
} from './types.js';

// Export constants
export {
  CURRENT_SCHEMA_VERSION,
  DEFAULT_INDEX_CONFIG,
} from './types.js';