/**
 * Bookmark Service
 *
 * Business logic layer for bookmark operations. This service provides
 * a high-level API for managing bookmarks, integrating storage providers,
 * URL parsing, and metadata extraction utilities.
 *
 * @module bookmark-service
 */

import type {
  EntityType,
  AddBookmarkParams,
  CatalogueStorageProvider,
  CatalogueEntity,
} from "@academic-explorer/utils";
import {
  parseURL,
  detectEntityTypeFromURL,
  extractEntityId,
  logger,
} from "@academic-explorer/utils";

const LOG_CATEGORY = "bookmark-service";

/**
 * Metadata extracted from a bookmark URL
 */
export interface BookmarkMetadata {
  /** Detected entity type from URL (if present) */
  entityType: EntityType | undefined;
  /** Extracted entity ID from URL (if present) */
  entityId: string | undefined;
  /** Cleaned URL without query parameters or fragments */
  cleanUrl: string;
  /** Whether the URL appears to be an entity page */
  isEntityPage: boolean;
}

/**
 * Parameters for creating a bookmark from page context
 */
export interface CreateBookmarkFromPageParams {
  /** Current page URL */
  url: string;
  /** Page title or entity name */
  title: string;
  /** Optional entity type (if known) */
  entityType?: EntityType;
  /** Optional entity ID (if known) */
  entityId?: string;
}

/**
 * Bookmark Service Class
 *
 * Provides business logic for bookmark operations including:
 * - Creating bookmarks from page context
 * - Extracting metadata from URLs
 * - Validating bookmark data
 * - Retrieving bookmarks by entity
 */
export class BookmarkService {
  private storageProvider: CatalogueStorageProvider;

  constructor(storageProvider: CatalogueStorageProvider) {
    this.storageProvider = storageProvider;
  }

  /**
   * Create bookmark from current page context
   *
   * Extracts metadata from the URL and creates appropriate bookmark parameters.
   * If entityType and entityId are not provided, attempts to detect them from the URL.
   *
   * @param params - Page context parameters
   * @returns Bookmark parameters ready for storage
   *
   * @example
   * ```typescript
   * const bookmarkParams = await bookmarkService.createBookmarkFromPage({
   *   url: "https://app.example.com/works/W2741809807",
   *   title: "Machine Learning for Cultural Heritage",
   *   entityType: "works",
   *   entityId: "W2741809807"
   * });
   * ```
   */
  async createBookmarkFromPage(
    params: CreateBookmarkFromPageParams,
  ): Promise<AddBookmarkParams> {
    const { url, title, entityType: providedEntityType, entityId: providedEntityId } = params;

    logger.debug(
      LOG_CATEGORY,
      "Creating bookmark from page context",
      {
        url,
        title,
        providedEntityType,
        providedEntityId,
      },
      "createBookmarkFromPage",
    );

    // Extract metadata from URL if entity type/id not explicitly provided
    const metadata = this.extractBookmarkMetadata(url, title);

    // Use provided values or fall back to detected values
    const entityType = providedEntityType ?? metadata.entityType;
    const entityId = providedEntityId ?? metadata.entityId;

    // Validate that we have required entity information
    if (!entityType || !entityId) {
      const errorMessage =
        "Cannot create bookmark: missing entity type or entity ID";
      logger.error(
        LOG_CATEGORY,
        errorMessage,
        {
          url,
          title,
          detectedEntityType: metadata.entityType,
          detectedEntityId: metadata.entityId,
        },
        "createBookmarkFromPage",
      );
      throw new Error(errorMessage);
    }

    // Validate entity type
    this.validateBookmarkData({ entityType, entityId, url, title });

    const bookmarkParams: AddBookmarkParams = {
      entityType,
      entityId,
      url: metadata.cleanUrl,
      title,
      notes: undefined, // Can be added by caller if needed
    };

    logger.debug(
      LOG_CATEGORY,
      "Bookmark parameters created successfully",
      {
        entityType: bookmarkParams.entityType,
        entityId: bookmarkParams.entityId,
        url: bookmarkParams.url,
      },
      "createBookmarkFromPage",
    );

    return bookmarkParams;
  }

  /**
   * Extract bookmark metadata from URL
   *
   * Parses the URL to detect entity type, extract entity ID, and clean the URL.
   * Uses utility functions from @academic-explorer/utils for detection.
   *
   * @param url - URL to parse
   * @param title - Title for context (used in logging)
   * @returns Extracted metadata
   *
   * @example
   * ```typescript
   * const metadata = bookmarkService.extractBookmarkMetadata(
   *   "https://openalex.org/W2741809807?select=id,title",
   *   "Sample Work"
   * );
   * // Returns:
   * // {
   * //   entityType: "works",
   * //   entityId: "W2741809807",
   * //   cleanUrl: "https://openalex.org/W2741809807",
   * //   isEntityPage: true
   * // }
   * ```
   */
  extractBookmarkMetadata(url: string, title: string): BookmarkMetadata {
    logger.debug(
      LOG_CATEGORY,
      "Extracting bookmark metadata",
      { url, title },
      "extractBookmarkMetadata",
    );

    // Parse URL to get clean components
    const parsedUrl = parseURL(url);

    // Detect entity type from URL
    const detectedEntityType = detectEntityTypeFromURL(url) as EntityType | undefined;

    // Extract entity ID if entity type was detected
    let detectedEntityId: string | undefined;
    if (detectedEntityType) {
      detectedEntityId = extractEntityId(url, detectedEntityType as Parameters<typeof extractEntityId>[1]);
    }

    // Determine if this is an entity page (has both type and ID)
    const isEntityPage = Boolean(detectedEntityType && detectedEntityId);

    // Clean URL - use base path without query parameters
    const cleanUrl = parsedUrl.basePath || url;

    const metadata: BookmarkMetadata = {
      entityType: detectedEntityType,
      entityId: detectedEntityId,
      cleanUrl,
      isEntityPage,
    };

    logger.debug(
      LOG_CATEGORY,
      "Bookmark metadata extracted",
      {
        url,
        detectedEntityType,
        detectedEntityId,
        isEntityPage,
        cleanUrl,
      },
      "extractBookmarkMetadata",
    );

    return metadata;
  }

  /**
   * Validate bookmark data
   *
   * Performs validation on bookmark data to ensure it meets requirements.
   * Throws an error if validation fails.
   *
   * @param data - Data to validate
   * @throws {Error} If validation fails
   *
   * @example
   * ```typescript
   * bookmarkService.validateBookmarkData({
   *   entityType: "works",
   *   entityId: "W2741809807",
   *   url: "https://openalex.org/W2741809807",
   *   title: "Sample Work"
   * });
   * ```
   */
  validateBookmarkData(data: unknown): void {
    logger.debug(
      LOG_CATEGORY,
      "Validating bookmark data",
      { data },
      "validateBookmarkData",
    );

    // Type guard for bookmark data
    if (!data || typeof data !== "object") {
      throw new Error("Bookmark data must be an object");
    }

    const record = data as Record<string, unknown>;

    // Validate required fields
    if (!record.entityType || typeof record.entityType !== "string") {
      throw new Error("Bookmark must have a valid entityType");
    }

    if (!record.entityId || typeof record.entityId !== "string") {
      throw new Error("Bookmark must have a valid entityId");
    }

    if (!record.url || typeof record.url !== "string") {
      throw new Error("Bookmark must have a valid URL");
    }

    if (!record.title || typeof record.title !== "string") {
      throw new Error("Bookmark must have a valid title");
    }

    // Validate entity type is one of the known types
    const validEntityTypes: EntityType[] = [
      "works",
      "authors",
      "sources",
      "institutions",
      "topics",
      "publishers",
      "funders",
    ];

    if (!validEntityTypes.includes(record.entityType as EntityType)) {
      throw new Error(
        `Invalid entity type: ${record.entityType}. Must be one of: ${validEntityTypes.join(", ")}`,
      );
    }

    // Validate entityId format (OpenAlex IDs start with letter followed by digits)
    const entityIdPattern = /^[A-Z]\d+$/i;
    if (!entityIdPattern.test(record.entityId as string)) {
      throw new Error(
        `Invalid entity ID format: ${record.entityId}. Expected format: Letter followed by digits (e.g., W123, A456)`,
      );
    }

    // Validate URL is not empty and has reasonable length
    const url = record.url as string;
    if (url.length === 0 || url.length > 2000) {
      throw new Error(
        `Invalid URL length: ${url.length}. Must be between 1 and 2000 characters`,
      );
    }

    // Validate title is not empty and has reasonable length
    const title = record.title as string;
    if (title.length === 0 || title.length > 500) {
      throw new Error(
        `Invalid title length: ${title.length}. Must be between 1 and 500 characters`,
      );
    }

    logger.debug(
      LOG_CATEGORY,
      "Bookmark data validation successful",
      {
        entityType: record.entityType,
        entityId: record.entityId,
      },
      "validateBookmarkData",
    );
  }

  /**
   * Get bookmark by entity
   *
   * Searches bookmarks for a specific entity by type and ID.
   * Returns the bookmark record if found, undefined otherwise.
   *
   * @param entityType - Type of entity to search for
   * @param entityId - ID of entity to search for
   * @returns Bookmark entity record if found, undefined otherwise
   *
   * @example
   * ```typescript
   * const bookmark = await bookmarkService.getBookmarkByEntity("works", "W2741809807");
   * if (bookmark) {
   *   console.log("Found bookmark:", bookmark.notes);
   * }
   * ```
   */
  async getBookmarkByEntity(
    entityType: EntityType,
    entityId: string,
  ): Promise<CatalogueEntity | undefined> {
    logger.debug(
      LOG_CATEGORY,
      "Getting bookmark by entity",
      { entityType, entityId },
      "getBookmarkByEntity",
    );

    try {
      // Get all bookmarks
      const bookmarks = await this.storageProvider.getBookmarks();

      // Find bookmark matching entity type and ID
      const bookmark = bookmarks.find(
        (b) => b.entityType === entityType && b.entityId === entityId,
      );

      if (bookmark) {
        logger.debug(
          LOG_CATEGORY,
          "Bookmark found for entity",
          {
            entityType,
            entityId,
            bookmarkId: bookmark.id,
          },
          "getBookmarkByEntity",
        );
      } else {
        logger.debug(
          LOG_CATEGORY,
          "No bookmark found for entity",
          { entityType, entityId },
          "getBookmarkByEntity",
        );
      }

      return bookmark;
    } catch (error) {
      logger.error(
        LOG_CATEGORY,
        "Failed to get bookmark by entity",
        {
          entityType,
          entityId,
          error,
        },
        "getBookmarkByEntity",
      );
      throw error;
    }
  }

  /**
   * Add a bookmark using the storage provider
   *
   * Convenience method that delegates to the storage provider's addBookmark method.
   *
   * @param params - Bookmark parameters
   * @returns Promise resolving to the entity record ID
   *
   * @example
   * ```typescript
   * const bookmarkId = await bookmarkService.addBookmark({
   *   entityType: "works",
   *   entityId: "W2741809807",
   *   url: "https://openalex.org/W2741809807",
   *   title: "Sample Work",
   *   notes: "Important for thesis"
   * });
   * ```
   */
  async addBookmark(params: AddBookmarkParams): Promise<string> {
    logger.debug(
      LOG_CATEGORY,
      "Adding bookmark",
      {
        entityType: params.entityType,
        entityId: params.entityId,
      },
      "addBookmark",
    );

    try {
      // Validate before adding
      this.validateBookmarkData(params);

      // Delegate to storage provider
      const bookmarkId = await this.storageProvider.addBookmark(params);

      logger.debug(
        LOG_CATEGORY,
        "Bookmark added successfully",
        {
          entityType: params.entityType,
          entityId: params.entityId,
          bookmarkId,
        },
        "addBookmark",
      );

      return bookmarkId;
    } catch (error) {
      logger.error(
        LOG_CATEGORY,
        "Failed to add bookmark",
        {
          entityType: params.entityType,
          entityId: params.entityId,
          error,
        },
        "addBookmark",
      );
      throw error;
    }
  }

  /**
   * Remove a bookmark by entity record ID
   *
   * Convenience method that delegates to the storage provider's removeBookmark method.
   *
   * @param entityRecordId - ID of the bookmark entity record
   * @returns Promise resolving when removal completes
   *
   * @example
   * ```typescript
   * await bookmarkService.removeBookmark("e1f2g3h4-...");
   * ```
   */
  async removeBookmark(entityRecordId: string): Promise<void> {
    logger.debug(
      LOG_CATEGORY,
      "Removing bookmark",
      { entityRecordId },
      "removeBookmark",
    );

    try {
      await this.storageProvider.removeBookmark(entityRecordId);

      logger.debug(
        LOG_CATEGORY,
        "Bookmark removed successfully",
        { entityRecordId },
        "removeBookmark",
      );
    } catch (error) {
      logger.error(
        LOG_CATEGORY,
        "Failed to remove bookmark",
        { entityRecordId, error },
        "removeBookmark",
      );
      throw error;
    }
  }

  /**
   * Check if an entity is bookmarked
   *
   * Convenience method that delegates to the storage provider's isBookmarked method.
   *
   * @param entityType - Type of entity
   * @param entityId - ID of entity
   * @returns Promise resolving to true if bookmarked, false otherwise
   *
   * @example
   * ```typescript
   * const isBookmarked = await bookmarkService.isBookmarked("works", "W2741809807");
   * if (isBookmarked) {
   *   console.log("Already bookmarked");
   * }
   * ```
   */
  async isBookmarked(
    entityType: EntityType,
    entityId: string,
  ): Promise<boolean> {
    logger.debug(
      LOG_CATEGORY,
      "Checking if entity is bookmarked",
      { entityType, entityId },
      "isBookmarked",
    );

    try {
      const bookmarked = await this.storageProvider.isBookmarked(
        entityType,
        entityId,
      );

      logger.debug(
        LOG_CATEGORY,
        "Bookmark check completed",
        { entityType, entityId, isBookmarked: bookmarked },
        "isBookmarked",
      );

      return bookmarked;
    } catch (error) {
      logger.error(
        LOG_CATEGORY,
        "Failed to check bookmark status",
        { entityType, entityId, error },
        "isBookmarked",
      );
      throw error;
    }
  }

  /**
   * Get all bookmarks
   *
   * Convenience method that delegates to the storage provider's getBookmarks method.
   *
   * @returns Promise resolving to array of bookmark entities
   *
   * @example
   * ```typescript
   * const bookmarks = await bookmarkService.getBookmarks();
   * console.log(`You have ${bookmarks.length} bookmarks`);
   * ```
   */
  async getBookmarks(): Promise<CatalogueEntity[]> {
    logger.debug(
      LOG_CATEGORY,
      "Getting all bookmarks",
      {},
      "getBookmarks",
    );

    try {
      const bookmarks = await this.storageProvider.getBookmarks();

      logger.debug(
        LOG_CATEGORY,
        "Bookmarks retrieved successfully",
        { count: bookmarks.length },
        "getBookmarks",
      );

      return bookmarks;
    } catch (error) {
      logger.error(
        LOG_CATEGORY,
        "Failed to get bookmarks",
        { error },
        "getBookmarks",
      );
      throw error;
    }
  }
}

/**
 * Factory function to create a BookmarkService instance
 *
 * @param storageProvider - Storage provider for catalogue operations
 * @returns BookmarkService instance
 *
 * @example
 * ```typescript
 * import { DexieStorageProvider } from '@academic-explorer/utils/storage/dexie-storage-provider';
 * import { logger } from '@academic-explorer/utils/logger';
 *
 * const storageProvider = new DexieStorageProvider(logger);
 * await storageProvider.initializeSpecialLists();
 *
 * const bookmarkService = createBookmarkService(storageProvider);
 * ```
 */
export function createBookmarkService(
  storageProvider: CatalogueStorageProvider,
): BookmarkService {
  return new BookmarkService(storageProvider);
}
