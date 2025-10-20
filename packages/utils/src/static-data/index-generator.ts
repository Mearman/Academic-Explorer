/**
 * Static Data Index Generator
 *
 * Generates and manages index files for entity type directories to enable
 * fast entity lookups without scanning entire directory structures.
 *
 * Features:
 * - Efficient entity file discovery and metadata extraction
 * - Automatic index regeneration when files change
 * - Index validation and corruption repair
 * - Progress tracking for long-running operations
 * - Concurrent processing with configurable limits
 */

// Dynamic imports for Node.js modules to avoid browser bundling issues
import { logger } from "../logger.js";
import { isRecord } from "../validation.js";
import { FileEntry, isEntityType } from "./cache-utilities.js";
import type {
  EntityFileMetadata,
  EntityType,
  EntityTypeIndex,
  IndexGenerationConfig,
  IndexGenerationProgress,
  IndexGenerationResult,
  IndexRepairAction,
  IndexValidationError,
  IndexValidationResult,
  IndexValidationWarning,
  MasterIndex,
  PathDirectoryIndex,
} from "./types.js";
import { DEFAULT_INDEX_CONFIG } from "./types.js";

// Use the main logger instance with appropriate category
const logCategory = "static-data-index";

// Path parsing constants
const QUERY_FILE_PATH_PARTS_LENGTH = 4;

// File size constants (in bytes)
const KB = 1024;
const MB = KB * KB;

// File naming constants
const INDEX_FILE_NAME = "index.json";

/**
 * Core class for generating and managing static data indexes
 */
export class StaticDataIndexGenerator {
  private readonly config: IndexGenerationConfig;
  private progressCallbacks: Set<(progress: IndexGenerationProgress) => void> =
    new Set();
  private fs!: typeof import("fs/promises");
  private path!: typeof import("path");

  constructor(config: Partial<IndexGenerationConfig> = {}) {
    this.config = {
      ...DEFAULT_INDEX_CONFIG,
      ...config,
    };
  }

  /**
   * Initialize Node.js modules (required before using any file operations)
   */
  private async initializeNodeModules(): Promise<void> {
    if (!this.fs || !this.path) {
      const [fsModule, pathModule] = await Promise.all([
        import("fs").then((m) => m.promises),
        import("path"),
      ]);
      this.fs = fsModule;
      this.path = pathModule;
    }
  }

  /**
   * Register a progress callback for long-running operations
   */
  onProgress(callback: (progress: IndexGenerationProgress) => void): void {
    this.progressCallbacks.add(callback);
  }

  /**
   * Remove a progress callback
   */
  offProgress(callback: (progress: IndexGenerationProgress) => void): void {
    this.progressCallbacks.delete(callback);
  }

  /**
   * Emit progress to all registered callbacks
   */
  private emitProgress(progress: IndexGenerationProgress): void {
    this.progressCallbacks.forEach((callback) => {
      try {
        callback(progress);
      } catch (error) {
        logger.error(logCategory, "Progress callback error", { error });
      }
    });
  }

  /**
   * Generate indexes for all entity types in the root directory
   */
  async generateAllIndexes(): Promise<IndexGenerationResult> {
    await this.initializeNodeModules();
    const startTime = Date.now();
    const result: IndexGenerationResult = {
      success: false,
      generatedIndexes: {} as Record<EntityType, string>,
      stats: {
        totalDurationMs: 0,
        filesProcessed: 0,
        entitiesIndexed: 0,
        dataSizeProcessed: 0,
        errors: 0,
        warnings: 0,
      },
    };

    try {
      logger.debug(
        logCategory,
        "Starting index generation for all entity types",
        {
          rootPath: this.config.rootPath,
          entityTypes: this.config.entityTypes,
        },
      );

      // Discover entity type directories
      const entityTypes = await this.discoverEntityTypeDirectories();
      const totalTypes = entityTypes.length;

      this.emitProgress({
        operation: "scanning",
        currentEntityType: entityTypes[0] || "works",
        filesProcessed: 0,
        totalFiles: 0,
        progressPercent: 0,
        processingSpeed: 0,
        memoryUsageMB: this.getMemoryUsageMB(),
        errorsEncountered: 0,
      });

      // Generate index for each entity type
      for (let i = 0; i < entityTypes.length; i++) {
        const entityType = entityTypes[i];

        try {
          const indexPath = await this.generateIndexForEntityType(entityType);
          result.generatedIndexes[entityType] = indexPath;

          // Update progress
          this.emitProgress({
            operation: "processing",
            currentEntityType: entityType,
            filesProcessed: i + 1,
            totalFiles: totalTypes,
            progressPercent: ((i + 1) / totalTypes) * 90, // Save 10% for master index
            processingSpeed: (i + 1) / ((Date.now() - startTime) / 1000),
            memoryUsageMB: this.getMemoryUsageMB(),
            errorsEncountered: result.stats.errors,
          });
        } catch (error) {
          logger.error(
            logCategory,
            `Failed to generate index for entity type: ${entityType}`,
            { error },
          );
          result.stats.errors++;
        }
      }

      // Generate master index
      this.emitProgress({
        operation: "writing",
        currentEntityType: entityTypes[0] || "works",
        filesProcessed: totalTypes,
        totalFiles: totalTypes,
        progressPercent: 95,
        processingSpeed: totalTypes / ((Date.now() - startTime) / 1000),
        memoryUsageMB: this.getMemoryUsageMB(),
        errorsEncountered: result.stats.errors,
      });

      const masterIndexPath = await this.generateMasterIndex(
        result.generatedIndexes,
      );
      result.masterIndexPath = masterIndexPath;

      // Finalize result
      result.success = true;
      result.stats.totalDurationMs = Date.now() - startTime;

      this.emitProgress({
        operation: "complete",
        currentEntityType: entityTypes[0] || "works",
        filesProcessed: totalTypes,
        totalFiles: totalTypes,
        progressPercent: 100,
        processingSpeed: totalTypes / ((Date.now() - startTime) / 1000),
        memoryUsageMB: this.getMemoryUsageMB(),
        errorsEncountered: result.stats.errors,
      });

      logger.debug(logCategory, "Index generation completed successfully", {
        durationMs: result.stats.totalDurationMs,
        entitiesIndexed: result.stats.entitiesIndexed,
        errors: result.stats.errors,
      });

      return result;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      logger.error(logCategory, "Index generation failed", {
        error,
        errorMessage,
      });

      result.success = false;
      result.stats.totalDurationMs = Date.now() - startTime;
      result.error = {
        message: errorMessage,
        code: "INDEX_GENERATION_FAILED",
        stack: error instanceof Error ? error.stack : undefined,
        context: { rootPath: this.config.rootPath },
      };

      return result;
    }
  }

  /**
   * Generate index for a specific entity type
   */
  async generateIndexForEntityType(entityType: EntityType): Promise<string> {
    await this.initializeNodeModules();
    const entityDir = this.path.join(this.config.rootPath, entityType);
    const indexPath = this.path.join(entityDir, INDEX_FILE_NAME);

    logger.debug(
      logCategory,
      `Generating index for entity type: ${entityType}`,
      {
        entityDir,
        indexPath,
      },
    );

    // Check if directory exists
    try {
      const stat = await this.fs.stat(entityDir);
      if (!stat.isDirectory()) {
        throw new Error(`Entity directory is not a directory: ${entityDir}`);
      }
    } catch {
      throw new Error(`Entity directory does not exist: ${entityDir}`);
    }

    // Create backup if requested and index exists
    if (this.config.createBackups) {
      await this.createIndexBackup(indexPath);
    }

    // Discover entity files
    const entityFiles = await this.discoverEntityFiles({
      entityDir,
      _entityType: entityType,
    });

    // Process files with concurrency control
    const entities: Record<string, EntityFileMetadata> = {};
    const semaphore = new Semaphore(this.config.concurrency);
    const startTime = Date.now();

    const processingPromises = entityFiles.map(async (filePath, index) => {
      return semaphore.acquire(async () => {
        try {
          const metadata = await this.extractEntityMetadata({
            filePath,
            entityType,
          });
          entities[metadata.id] = metadata;

          // Update progress occasionally
          if (index % 100 === 0) {
            this.emitProgress({
              operation: "processing",
              currentEntityType: entityType,
              filesProcessed: index,
              totalFiles: entityFiles.length,
              progressPercent: (index / entityFiles.length) * 100,
              currentFile: this.path.basename(filePath),
              processingSpeed: index / ((Date.now() - startTime) / 1000),
              memoryUsageMB: this.getMemoryUsageMB(),
              errorsEncountered: 0,
            });
          }
        } catch (error) {
          logger.warn(
            logCategory,
            `Failed to process entity file: ${filePath}`,
            { error },
          );
        }
      });
    });

    await Promise.all(processingPromises);

    // Generate statistics
    const stats = this.computeEntityTypeStats(entities);

    // Read existing index to check if content has changed
    let existingIndex: EntityTypeIndex | null = null;

    try {
      const indexContent = await this.fs.readFile(indexPath, "utf8");
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const parsedData = JSON.parse(indexContent);
      if (this.validateIndexStructure(parsedData)) {
        existingIndex = parsedData;
      }
    } catch {
      // Index doesn't exist or is invalid, will be created
    }

    // Check if content has actually changed (excluding generatedAt field)
    const newTotalEntities = Object.keys(entities).length;
    const newTotalSize = Object.values(entities).reduce(
      (sum, entity) => sum + entity.fileSize,
      0,
    );

    const contentChanged =
      existingIndex?.entityType !== entityType ||
      existingIndex.schemaVersion !== this.config.schemaVersion ||
      existingIndex.totalEntities !== newTotalEntities ||
      existingIndex.totalSize !== newTotalSize ||
      JSON.stringify(existingIndex.entities) !== JSON.stringify(entities) ||
      JSON.stringify(existingIndex.stats) !== JSON.stringify(stats);

    // Create index structure with conditional generatedAt
    const index: EntityTypeIndex = {
      entityType,
      directoryPath: entityDir,
      generatedAt: contentChanged
        ? Date.now()
        : (existingIndex?.generatedAt ?? Date.now()),
      schemaVersion: this.config.schemaVersion,
      totalEntities: newTotalEntities,
      totalSize: newTotalSize,
      entities,
      stats,
    };

    // Only write if content has changed
    if (contentChanged) {
      await this.fs.writeFile(
        indexPath,
        JSON.stringify(index, null, 2),
        "utf8",
      );
      logger.debug(
        logCategory,
        `Index updated for ${entityType} (content changed)`,
        {
          indexPath,
          totalEntities: index.totalEntities,
          totalSize: index.totalSize,
        },
      );
    } else {
      logger.debug(
        logCategory,
        `Index unchanged for ${entityType} (skipped write)`,
        {
          indexPath,
          totalEntities: index.totalEntities,
          totalSize: index.totalSize,
        },
      );
    }

    return indexPath;
  }

  /**
   * Validate an existing index and detect corruption
   */
  async validateIndex(indexPath: string): Promise<IndexValidationResult> {
    await this.initializeNodeModules();
    const startTime = Date.now();
    const errors: IndexValidationError[] = [];
    const warnings: IndexValidationWarning[] = [];
    const repairActions: IndexRepairAction[] = [];

    try {
      // Read and parse index file
      const indexContent = await this.fs.readFile(indexPath, "utf8");
      let index: EntityTypeIndex;
      try {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const parsedData = JSON.parse(indexContent);
        if (!this.validateIndexStructure(parsedData)) {
          errors.push({
            type: "invalid_structure",
            message: "Index file contains invalid JSON structure",
            canAutoRepair: false,
          });
          throw new Error("Invalid JSON structure");
        }
        index = parsedData;
      } catch (parseError) {
        errors.push({
          type: "invalid_structure",
          message: "Index file contains invalid JSON",
          canAutoRepair: false,
        });
        throw parseError;
      }

      // Validate index structure
      if (!this.validateIndexStructure(index)) {
        errors.push({
          type: "invalid_structure",
          message: "Index file has invalid structure",
          canAutoRepair: true,
        });
        repairActions.push({
          type: "rebuild_index",
          description: "Rebuild the entire index from scratch",
          affectedEntityIds: [],
          affectedFilePaths: [indexPath],
          isSafeAutoRepair: true,
          estimatedDurationMs: 30000,
        });
      }

      // Validate entity files exist and match metadata
      let entitiesValidated = 0;
      const entityIds = Object.keys(index.entities || {});

      for (const entityId of entityIds) {
        const metadata = index.entities[entityId];

        try {
          const stat = await this.fs.stat(metadata.absolutePath);

          // Check if file modification time matches
          if (Math.abs(stat.mtimeMs - metadata.lastModified) > 1000) {
            // 1 second tolerance
            warnings.push({
              type: "old_modification_date",
              message: `Entity file modification time doesn't match index: ${entityId}`,
              entityId,
              filePath: metadata.absolutePath,
              severity: "medium",
            });
            repairActions.push({
              type: "update_timestamp",
              description: `Update timestamp for entity ${entityId}`,
              affectedEntityIds: [entityId],
              affectedFilePaths: [metadata.absolutePath],
              isSafeAutoRepair: true,
              estimatedDurationMs: 100,
            });
          }

          // Check file size
          if (Math.abs(stat.size - metadata.fileSize) > 0) {
            errors.push({
              type: "corrupted_metadata",
              message: `Entity file size doesn't match index: ${entityId}`,
              entityId,
              filePath: metadata.absolutePath,
              expected: metadata.fileSize,
              actual: stat.size,
              canAutoRepair: true,
            });
            repairActions.push({
              type: "regenerate_metadata",
              description: `Regenerate metadata for entity ${entityId}`,
              affectedEntityIds: [entityId],
              affectedFilePaths: [metadata.absolutePath],
              isSafeAutoRepair: true,
              estimatedDurationMs: 1000,
            });
          }

          entitiesValidated++;
        } catch {
          errors.push({
            type: "missing_file",
            message: `Entity file not found: ${entityId}`,
            entityId,
            filePath: metadata.absolutePath,
            canAutoRepair: true,
          });
          repairActions.push({
            type: "remove_missing_file",
            description: `Remove missing entity ${entityId} from index`,
            affectedEntityIds: [entityId],
            affectedFilePaths: [],
            isSafeAutoRepair: true,
            estimatedDurationMs: 100,
          });
        }
      }

      const validationResult: IndexValidationResult = {
        isValid: errors.length === 0,
        entityType: index.entityType,
        indexPath,
        validatedAt: Date.now(),
        entitiesValidated,
        errors,
        warnings,
        repairActions,
        performance: {
          durationMs: Date.now() - startTime,
          filesPerSecond: entitiesValidated / ((Date.now() - startTime) / 1000),
          memoryUsageMB: this.getMemoryUsageMB(),
        },
      };

      logger.debug(logCategory, "Index validation completed", {
        indexPath,
        isValid: validationResult.isValid,
        entitiesValidated,
        errorsFound: errors.length,
        warningsFound: warnings.length,
        durationMs: validationResult.performance.durationMs,
      });

      return validationResult;
    } catch (error) {
      logger.error(logCategory, "Index validation failed", {
        error,
        indexPath,
      });

      return {
        isValid: false,
        entityType: "works", // fallback
        indexPath,
        validatedAt: Date.now(),
        entitiesValidated: 0,
        errors: [
          {
            type: "invalid_structure",
            message: `Failed to validate index: ${error instanceof Error ? error.message : "Unknown error"}`,
            canAutoRepair: false,
          },
        ],
        warnings: [],
        repairActions: [],
        performance: {
          durationMs: Date.now() - startTime,
          filesPerSecond: 0,
          memoryUsageMB: this.getMemoryUsageMB(),
        },
      };
    }
  }

  /**
   * Repair a corrupted index by applying safe repair actions
   */
  async repairIndex(validationResult: IndexValidationResult): Promise<boolean> {
    const safeActions = validationResult.repairActions.filter(
      (action) => action.isSafeAutoRepair,
    );

    if (safeActions.length === 0) {
      logger.warn(logCategory, "No safe repair actions available", {
        indexPath: validationResult.indexPath,
        totalActions: validationResult.repairActions.length,
      });
      return false;
    }

    try {
      // Create backup before repair
      await this.createIndexBackup(validationResult.indexPath);

      // Apply repair actions
      for (const action of safeActions) {
        logger.debug(logCategory, `Applying repair action: ${action.type}`, {
          description: action.description,
          affectedEntities: action.affectedEntityIds.length,
        });

        switch (action.type) {
          case "remove_missing_file":
            await this.removeMissingEntitiesFromIndex({
              indexPath: validationResult.indexPath,
              entityIds: action.affectedEntityIds,
            });
            break;
          case "update_timestamp":
            await this.updateEntityTimestamps({
              indexPath: validationResult.indexPath,
              entityIds: action.affectedEntityIds,
            });
            break;
          case "regenerate_metadata":
            await this.regenerateEntityMetadata({
              indexPath: validationResult.indexPath,
              entityIds: action.affectedEntityIds,
            });
            break;
          case "rebuild_index": {
            // Extract entity type from path and rebuild
            const entityType = this.extractEntityTypeFromPath(
              validationResult.indexPath,
            );
            if (entityType) {
              await this.generateIndexForEntityType(entityType);
            }
            break;
          }
        }
      }

      logger.debug(logCategory, "Index repair completed successfully", {
        indexPath: validationResult.indexPath,
        actionsApplied: safeActions.length,
      });

      return true;
    } catch (error) {
      logger.error(logCategory, "Index repair failed", {
        error,
        indexPath: validationResult.indexPath,
      });
      return false;
    }
  }

  /**
   * Discover entity type directories in the root path
   */
  private async discoverEntityTypeDirectories(): Promise<EntityType[]> {
    const allEntityTypes: EntityType[] = [
      "works",
      "authors",
      "sources",
      "institutions",
      "topics",
      "publishers",
      "funders",
      "keywords",
      "concepts",
    ];
    const discoveredTypes: EntityType[] = [];

    for (const entityType of allEntityTypes) {
      if (
        this.config.entityTypes &&
        !this.config.entityTypes.includes(entityType)
      ) {
        continue; // Skip if not in filter list
      }

      const entityDir = this.path.join(this.config.rootPath, entityType);
      try {
        const stat = await this.fs.stat(entityDir);
        if (stat.isDirectory()) {
          discoveredTypes.push(entityType);
        }
      } catch {
        // Directory doesn't exist, skip
      }
    }

    return discoveredTypes;
  }

  /**
   * Discover entity files in a directory
   */
  private async discoverEntityFiles({
    entityDir,
    _entityType,
  }: {
    entityDir: string;
    _entityType: EntityType;
  }): Promise<string[]> {
    const files: string[] = [];

    const scanDirectory = async (dir: string): Promise<void> => {
      try {
        const entries = await this.fs.readdir(dir, { withFileTypes: true });

        for (const entry of entries) {
          const fullPath = this.path.join(dir, entry.name);

          if (entry.isDirectory()) {
            // Skip queries directories - these contain query cache files, not entity files
            if (entry.name === "queries") {
              continue;
            }
            await scanDirectory(fullPath); // Recursive scan
          } else if (entry.isFile() && entry.name.endsWith(".json")) {
            // Check file size limit
            const stat = await this.fs.stat(fullPath);
            if (stat.size <= this.config.maxFileSize) {
              files.push(fullPath);
            } else {
              logger.warn(logCategory, `Skipping large file: ${fullPath}`, {
                size: stat.size,
                maxSize: this.config.maxFileSize,
              });
            }
          }
        }
      } catch (error) {
        logger.warn(logCategory, `Failed to scan directory: ${dir}`, { error });
      }
    };

    await scanDirectory(entityDir);
    return files;
  }

  /**
   * Extract metadata from an entity file
   */
  private async extractEntityMetadata({
    filePath,
    entityType,
  }: {
    filePath: string;
    entityType: EntityType;
  }): Promise<EntityFileMetadata> {
    const stat = await this.fs.stat(filePath);
    const relativePath = this.path.relative(
      this.path.join(this.config.rootPath, entityType),
      filePath,
    );

    // Extract entity ID from filename or path
    const entityId = this.extractEntityIdFromPath({
      filePath,
      _entityType: entityType,
    });

    const metadata: EntityFileMetadata = {
      id: entityId,
      type: entityType,
      filePath: relativePath,
      absolutePath: filePath,
      fileSize: stat.size,
      lastModified: stat.mtimeMs,
    };

    // Extract basic info if requested
    if (this.config.extractBasicInfo) {
      try {
        const basicInfo = await this.extractBasicEntityInfo({
          filePath,
          _entityType: entityType,
        });
        metadata.basicInfo = basicInfo;
      } catch (error) {
        logger.warn(
          logCategory,
          `Failed to extract basic info from: ${filePath}`,
          { error },
        );
      }
    }

    return metadata;
  }

  /**
   * Extract entity ID from file path using naming conventions
   */
  private extractEntityIdFromPath({
    filePath,
    _entityType,
  }: {
    filePath: string;
    _entityType: EntityType;
  }): string {
    const filename = this.path.basename(filePath, ".json");

    // Try different patterns based on entity type
    const patterns = [
      /^([WASIGTPFKC]\d+)$/, // Standard OpenAlex ID format
      /^(\d+)$/, // Numeric ID
      filename, // Use filename as-is if no pattern matches
    ];

    for (const pattern of patterns) {
      if (typeof pattern === "string") {
        return pattern;
      }
      const match = filename.match(pattern);
      if (match) {
        return match[1];
      }
    }

    // Fallback to filename
    return filename;
  }

  /**
   * Extract basic information from entity file content
   */
  private async extractBasicEntityInfo({
    filePath,
    _entityType,
  }: {
    filePath: string;
    _entityType: EntityType;
  }): Promise<EntityFileMetadata["basicInfo"]> {
    const content = await this.fs.readFile(filePath, "utf8");
    let entity: Record<string, unknown>;
    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const parsedData = JSON.parse(content);
      if (!isRecord(parsedData)) {
        return undefined;
      }
      entity = parsedData;
    } catch {
      return undefined;
    }
    const basicInfo: NonNullable<EntityFileMetadata["basicInfo"]> = {};

    // Extract display name
    if (typeof entity.display_name === "string") {
      basicInfo.displayName = entity.display_name;
    } else if (typeof entity.title === "string") {
      basicInfo.displayName = entity.title;
    }

    // Extract publication year (for works)
    if (typeof entity.publication_year === "number") {
      basicInfo.publicationYear = entity.publication_year;
    }

    // Extract citation count
    if (typeof entity.cited_by_count === "number") {
      basicInfo.citationCount = entity.cited_by_count;
    }

    // Extract works count (for authors/institutions)
    if (typeof entity.works_count === "number") {
      basicInfo.worksCount = entity.works_count;
    }

    // Extract external IDs
    if (isRecord(entity.ids)) {
      basicInfo.externalIds = {};
      for (const [key, value] of Object.entries(entity.ids)) {
        if (typeof value === "string") {
          basicInfo.externalIds[key] = value;
        }
      }
    }

    return Object.keys(basicInfo).length > 0 ? basicInfo : undefined;
  }

  /**
   * Compute statistics for an entity type
   */
  private computeEntityTypeStats(
    entities: Record<string, EntityFileMetadata>,
  ): EntityTypeIndex["stats"] {
    const entityList = Object.values(entities);
    const fileSizes = entityList.map((e) => e.fileSize);

    const stats: EntityTypeIndex["stats"] = {
      lastModified: Math.max(...entityList.map((e) => e.lastModified)),
      oldestModified: Math.min(...entityList.map((e) => e.lastModified)),
      averageFileSize:
        fileSizes.reduce((sum, size) => sum + size, 0) / fileSizes.length,
      fileSizeDistribution: {
        small: fileSizes.filter((size) => size < 10 * KB).length,
        medium: fileSizes.filter((size) => size >= 10 * KB && size < 100 * KB)
          .length,
        large: fileSizes.filter((size) => size >= 100 * KB && size < MB).length,
        huge: fileSizes.filter((size) => size >= MB).length,
      },
    };

    // Add publication year distribution for works
    if (entityList.length > 0 && entityList[0].type === "works") {
      const entitiesByYear: Record<number, number> = {};
      for (const entity of entityList) {
        const year = entity.basicInfo?.publicationYear;
        if (typeof year === "number") {
          entitiesByYear[year] = (entitiesByYear[year] || 0) + 1;
        }
      }
      stats.entitiesByYear = entitiesByYear;
    }

    return stats;
  }

  /**
   * Aggregate statistics from individual entity type indexes
   */
  // eslint-disable-next-line sonarjs/cognitive-complexity
  private async aggregateIndexStats({
    typeIndexPaths,
    masterIndex,
  }: {
    typeIndexPaths: Record<EntityType, string>;
    masterIndex: MasterIndex;
  }): Promise<{
    withBasicInfo: number;
    withExternalIds: number;
    withCitationCounts: number;
  }> {
    let totalEntitiesWithBasicInfo = 0;
    let totalEntitiesWithExternalIds = 0;
    let totalEntitiesWithCitationCounts = 0;

    for (const [entityType, indexPath] of Object.entries(typeIndexPaths)) {
      try {
        const indexContent = await this.fs.readFile(indexPath, "utf8");
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const parsedData = JSON.parse(indexContent);
        if (!this.validateIndexStructure(parsedData)) {
          continue; // Skip invalid indexes
        }
        const index = parsedData;

        masterIndex.totalEntities += index.totalEntities;
        masterIndex.totalSize += index.totalSize;
        masterIndex.entitiesByType[entityType] = index.totalEntities;

        masterIndex.globalStats.lastModified = Math.max(
          masterIndex.globalStats.lastModified,
          index.stats.lastModified,
        );
        masterIndex.globalStats.oldestModified = Math.min(
          masterIndex.globalStats.oldestModified,
          index.stats.oldestModified,
        );

        // Count entities with various metadata
        for (const entity of Object.values(index.entities)) {
          if (entity.basicInfo) totalEntitiesWithBasicInfo++;
          if (entity.basicInfo?.externalIds) totalEntitiesWithExternalIds++;
          if (entity.basicInfo?.citationCount)
            totalEntitiesWithCitationCounts++;
        }
      } catch (error) {
        logger.warn(
          logCategory,
          `Failed to read index for master aggregation: ${indexPath}`,
          { error },
        );
      }
    }

    return {
      withBasicInfo: totalEntitiesWithBasicInfo,
      withExternalIds: totalEntitiesWithExternalIds,
      withCitationCounts: totalEntitiesWithCitationCounts,
    };
  }

  /**
   * Generate master index combining all entity type indexes
   */
  private async generateMasterIndex(
    typeIndexPaths: Record<EntityType, string>,
  ): Promise<string> {
    const masterIndexPath = this.path.join(
      this.config.rootPath,
      INDEX_FILE_NAME,
    );

    const masterIndex: MasterIndex = {
      generatedAt: Date.now(),
      schemaVersion: this.config.schemaVersion,
      rootPath: this.config.rootPath,
      totalEntities: 0,
      totalSize: 0,
      entitiesByType: {} as Record<EntityType, number>,
      typeIndexPaths,
      globalStats: {
        lastModified: 0,
        oldestModified: Date.now(),
        coverage: {
          withBasicInfo: 0,
          withExternalIds: 0,
          withCitationCounts: 0,
        },
      },
    };

    // Aggregate stats from individual indexes
    const coverageStats = await this.aggregateIndexStats({
      typeIndexPaths,
      masterIndex,
    });

    // Calculate coverage percentages
    if (masterIndex.totalEntities > 0) {
      masterIndex.globalStats.coverage.withBasicInfo =
        (coverageStats.withBasicInfo / masterIndex.totalEntities) * 100;
      masterIndex.globalStats.coverage.withExternalIds =
        (coverageStats.withExternalIds / masterIndex.totalEntities) * 100;
      masterIndex.globalStats.coverage.withCitationCounts =
        (coverageStats.withCitationCounts / masterIndex.totalEntities) * 100;
    }

    await this.fs.writeFile(
      masterIndexPath,
      JSON.stringify(masterIndex, null, 2),
      "utf8",
    );

    logger.debug(logCategory, "Master index generated", {
      masterIndexPath,
      totalEntities: masterIndex.totalEntities,
      entityTypes: Object.keys(masterIndex.entitiesByType).length,
    });

    return masterIndexPath;
  }

  /**
   * Validate index structure
   */
  private validateIndexStructure(index: unknown): index is EntityTypeIndex {
    if (!isRecord(index)) return false;

    const requiredFields = [
      "entityType",
      "directoryPath",
      "generatedAt",
      "schemaVersion",
      "totalEntities",
      "entities",
      "stats",
    ];
    return requiredFields.every((field) => field in index);
  }

  /**
   * Create backup of existing index
   */
  private async createIndexBackup(indexPath: string): Promise<void> {
    try {
      await this.fs.access(indexPath);
      const backupPath = `${indexPath}.backup.${Date.now()}`;
      await this.fs.copyFile(indexPath, backupPath);
      logger.debug(logCategory, "Index backup created", {
        indexPath,
        backupPath,
      });
    } catch {
      // Index doesn't exist, no backup needed
    }
  }

  /**
   * Get current memory usage in MB
   */
  private getMemoryUsageMB(): number {
    if (globalThis.process?.memoryUsage) {
      const usage = globalThis.process.memoryUsage();
      return Math.round(usage.heapUsed / KB / KB);
    }
    return 0; // Fallback for browser environments
  }

  /**
   * Extract entity type from index path
   */
  private extractEntityTypeFromPath(indexPath: string): EntityType | null {
    const dirName = this.path.basename(this.path.dirname(indexPath));
    const entityTypes: EntityType[] = [
      "works",
      "authors",
      "sources",
      "institutions",
      "topics",
      "publishers",
      "funders",
      "concepts",
      "autocomplete",
    ];
    return isEntityType(dirName) ? dirName : null;
  }

  /**
   * Remove missing entities from index
   */
  private async removeMissingEntitiesFromIndex({
    indexPath,
    entityIds,
  }: {
    indexPath: string;
    entityIds: string[];
  }): Promise<void> {
    const indexContent = await this.fs.readFile(indexPath, "utf8");
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const parsedData = JSON.parse(indexContent);
    if (!this.validateIndexStructure(parsedData)) {
      throw new Error(`Invalid index structure at ${indexPath}`);
    }
    const index = parsedData;

    for (const entityId of entityIds) {
      delete index.entities[entityId];
    }

    index.totalEntities = Object.keys(index.entities).length;
    index.generatedAt = Date.now();

    await this.fs.writeFile(indexPath, JSON.stringify(index, null, 2), "utf8");
  }

  /**
   * Update entity timestamps in index
   */
  private async updateEntityTimestamps({
    indexPath,
    entityIds,
  }: {
    indexPath: string;
    entityIds: string[];
  }): Promise<void> {
    const indexContent = await this.fs.readFile(indexPath, "utf8");
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const parsedData = JSON.parse(indexContent);
    if (!this.validateIndexStructure(parsedData)) {
      throw new Error(`Invalid index structure at ${indexPath}`);
    }
    const index = parsedData;

    for (const entityId of entityIds) {
      const entity = index.entities[entityId];
      if (entity) {
        try {
          const stat = await this.fs.stat(entity.absolutePath);
          entity.lastModified = stat.mtimeMs;
        } catch {
          // File doesn't exist, will be handled by other repair actions
        }
      }
    }

    index.generatedAt = Date.now();
    await this.fs.writeFile(indexPath, JSON.stringify(index, null, 2), "utf8");
  }

  /**
   * Regenerate metadata for specific entities
   */
  private async regenerateEntityMetadata({
    indexPath,
    entityIds,
  }: {
    indexPath: string;
    entityIds: string[];
  }): Promise<void> {
    const indexContent = await this.fs.readFile(indexPath, "utf8");
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const parsedData = JSON.parse(indexContent);
    if (!this.validateIndexStructure(parsedData)) {
      throw new Error(`Invalid index structure at ${indexPath}`);
    }
    const index = parsedData;

    for (const entityId of entityIds) {
      const entity = index.entities[entityId];
      if (entity) {
        try {
          const newMetadata = await this.extractEntityMetadata({
            filePath: entity.absolutePath,
            entityType: entity.type,
          });
          index.entities[entityId] = newMetadata;
        } catch {
          // Failed to regenerate, remove from index
          delete index.entities[entityId];
        }
      }
    }

    index.totalEntities = Object.keys(index.entities).length;
    index.generatedAt = Date.now();
    await this.fs.writeFile(indexPath, JSON.stringify(index, null, 2), "utf8");
  }

  /**
   * Generate hierarchical path-based indexes for all directories
   * Creates index.json files with files/directories structure at every level
   */
  async generatePathBasedIndexes(): Promise<void> {
    await this.initializeNodeModules();

    logger.debug(
      logCategory,
      "Starting hierarchical path-based index generation",
      {
        rootPath: this.config.rootPath,
      },
    );

    // Generate hierarchical indexes starting from root
    await this.generateHierarchicalIndex({
      dirPath: this.config.rootPath,
      relativePath: "",
    });

    logger.debug(
      logCategory,
      "Hierarchical path-based index generation completed",
      {
        rootPath: this.config.rootPath,
      },
    );
  }

  /**
   * Recursively generate hierarchical indexes for a directory and all subdirectories
   */
  private async generateHierarchicalIndex({
    dirPath,
    relativePath,
  }: {
    dirPath: string;
    relativePath: string;
  }): Promise<void> {
    try {
      const entries = await this.fs.readdir(dirPath, { withFileTypes: true });
      const indexPath = this.path.join(dirPath, INDEX_FILE_NAME);

      const index: PathDirectoryIndex = {
        lastUpdated: new Date().toISOString(),
        path: relativePath || "/",
        files: {},
        directories: {},
      };

      // Process entries
      for (const entry of entries) {
        const entryPath = this.path.join(dirPath, entry.name);
        const entryRelativePath = relativePath
          ? `${relativePath}/${entry.name}`
          : entry.name;

        if (entry.isFile() && entry.name.endsWith(".json")) {
          // Skip index.json to avoid circular reference
          if (entry.name === INDEX_FILE_NAME) {
            continue;
          }

          // Process JSON file
          const fileRef = await this.createFileReference({
            filePath: entryPath,
            fileName: entry.name,
            relativePath: entryRelativePath,
          });
          const fileName = this.path.basename(entry.name, ".json");
          index.files[fileName] = fileRef;
        } else if (entry.isDirectory()) {
          // Process subdirectory
          const stat = await this.fs.stat(entryPath);
          index.directories[entry.name] = {
            $ref: `./${entry.name}`,
            lastModified: new Date(stat.mtime).toISOString(),
          };

          // Recursively generate index for subdirectory
          await this.generateHierarchicalIndex({
            dirPath: entryPath,
            relativePath: entryRelativePath,
          });
        }
      }

      // Write index file
      await this.fs.writeFile(
        indexPath,
        JSON.stringify(index, null, 2),
        "utf8",
      );

      logger.debug(
        logCategory,
        `Generated hierarchical index for ${relativePath || "/"}`,
        {
          files: Object.keys(index.files).length,
          directories: Object.keys(index.directories).length,
        },
      );
    } catch (error) {
      logger.warn(
        logCategory,
        `Failed to generate hierarchical index for ${relativePath}`,
        { error },
      );
    }
  }

  /**
   * Create a file reference with metadata and content hash
   */
  private async createFileReference({
    filePath,
    fileName,
    relativePath,
  }: {
    filePath: string;
    fileName: string;
    relativePath: string;
  }): Promise<FileEntry> {
    try {
      const stat = await this.fs.stat(filePath);
      const fileRef: FileEntry = {
        $ref: `./${fileName}`,
        lastRetrieved: new Date(stat.mtime).toISOString(),
        url: "", // Will be set below
        contentHash: "", // Will be set below if enabled
      };

      // Add content hash if config allows
      if (this.config.extractBasicInfo) {
        try {
          const content = await this.fs.readFile(filePath, "utf8");
          const crypto = await import("crypto");
          const hash = crypto
            .createHash("sha256")
            .update(content)
            .digest("hex");
          // Use shorter hash for readability (first 16 characters)
          fileRef.contentHash = hash.substring(0, 16);
        } catch {
          // Skip hash if file can't be read
        }
      }

      // Add URL for API response files
      const url = this.reconstructApiUrl(relativePath);
      fileRef.url = url ?? "";

      return fileRef;
    } catch (error) {
      logger.warn(
        logCategory,
        `Failed to create file reference for ${filePath}`,
        { error },
      );
      throw error;
    }
  }

  /**
   * Reconstruct the original API URL from the file path
   */
  private reconstructApiUrl(relativePath: string): string | undefined {
    try {
      const baseUrl = this.config.baseApiUrl ?? "https://api.openalex.org";
      const pathParts = relativePath.split("/");

      // Skip non-API files
      if (pathParts.length < 2) {
        return undefined;
      }

      const entityType = pathParts[0];
      const entityIdWithExt = pathParts[1];

      // Remove .json extension from entity ID
      const entityId = entityIdWithExt.replace(/\.json$/, "");

      // Basic entity file: authors/A123.json -> authors/A123
      if (pathParts.length === 2) {
        return `${baseUrl}/${entityType}/${entityId}`;
      }

      // Query file: authors/A123/queries/select=display_name.json
      if (
        pathParts.length === QUERY_FILE_PATH_PARTS_LENGTH &&
        pathParts[2] === "queries"
      ) {
        const queryParams = pathParts[3].replace(/\.json$/, "");
        return `${baseUrl}/${entityType}/${entityId}?${queryParams}`;
      }

      // Other patterns can be added here
      return undefined;
    } catch {
      return undefined;
    }
  }

  /**
   * Extract entity ID from filename (without .json extension)
   */
  private extractEntityIdFromFilename(filePath: string): string {
    return this.path.basename(filePath, ".json");
  }
}

/**
 * Simple semaphore for controlling concurrency
 */
class Semaphore {
  private permits: number;
  private waiting: Array<() => void> = [];

  constructor(permits: number) {
    this.permits = permits;
  }

  async acquire<T>(fn: () => Promise<T>): Promise<T> {
    if (this.permits > 0) {
      this.permits--;
      try {
        return await fn();
      } finally {
        this.permits++;
        if (this.waiting.length > 0) {
          const next = this.waiting.shift();
          next?.();
        }
      }
    }

    // eslint-disable-next-line prefer-destructured-params-plugin/prefer-destructured-params
    return new Promise((resolve, reject) => {
      this.waiting.push(async () => {
        this.permits--;
        try {
          const result = await fn();
          resolve(result);
        } catch (error) {
          reject(error);
        } finally {
          this.permits++;
          if (this.waiting.length > 0) {
            const next = this.waiting.shift();
            next?.();
          }
        }
      });
    });
  }
}

// Remove the default generator instance to avoid initialization issues

/**
 * Generate indexes for all entity types in the specified root directory
 */
export async function generateAllIndexes(
  rootPath: string,
  config: Partial<IndexGenerationConfig> = {},
): Promise<IndexGenerationResult> {
  const generator = new StaticDataIndexGenerator({ ...config, rootPath });
  return generator.generateAllIndexes();
}

/**
 * Generate index for a specific entity type
 */
export async function generateIndexForEntityType(
  rootPath: string,
  entityType: EntityType,
  config: Partial<IndexGenerationConfig> = {},
): Promise<string> {
  const generator = new StaticDataIndexGenerator({ ...config, rootPath });
  return generator.generateIndexForEntityType(entityType);
}

/**
 * Validate an existing index file
 */
export async function validateIndex(
  indexPath: string,
): Promise<IndexValidationResult> {
  const generator = new StaticDataIndexGenerator();
  return generator.validateIndex(indexPath);
}

/**
 * Repair a corrupted index using safe automatic repair actions
 */
export async function repairIndex(
  validationResult: IndexValidationResult,
): Promise<boolean> {
  const generator = new StaticDataIndexGenerator();
  return generator.repairIndex(validationResult);
}

/**
 * Generate path-based indexes for all entity types in the specified root directory
 * Creates hierarchical indexes that map entity IDs to file references
 */
export async function generatePathBasedIndexes(
  rootPath: string,
  config: Partial<IndexGenerationConfig> = {},
): Promise<void> {
  const generator = new StaticDataIndexGenerator({ ...config, rootPath });
  return generator.generatePathBasedIndexes();
}

/**
 * Create a new index generator with custom configuration
 */
export function createIndexGenerator(
  config: Partial<IndexGenerationConfig>,
): StaticDataIndexGenerator {
  return new StaticDataIndexGenerator(config);
}
