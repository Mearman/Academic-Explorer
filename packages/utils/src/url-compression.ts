/**
 * URL compression and decompression utilities using Pako
 * Enables sharing catalogue lists via compressed URL parameters
 */

import { deflate, inflate } from "pako";
import { logger } from "./logger.js";
import type { GenericLogger } from "./logger.js";

// Constants
const LOG_CATEGORY = "url-compression";
const MAX_URL_LENGTH = 2000; // Conservative limit for URL length
const COMPRESSION_LEVEL = 9; // Maximum compression

// Interfaces for compressed data structures
export interface CompressedListData {
  /** List metadata */
  list: {
    title: string;
    description?: string;
    type: "list" | "bibliography";
    tags?: string[];
  };
  /** Entities in the list */
  entities: Array<{
    entityType: "works" | "authors" | "sources" | "institutions" | "topics" | "publishers" | "funders";
    entityId: string;
    notes?: string;
  }>;
}

export interface ShareUrlData {
  /** Version of the compression format */
  v: number;
  /** Compressed data (base64) */
  d: string;
  /** Optional checksum for integrity */
  c?: string;
}

/**
 * Compress catalogue list data for URL sharing
 */
export function compressListData(data: CompressedListData): string {
  try {
    // Convert data to JSON string
    const jsonString = JSON.stringify({
      v: 1, // Version
      d: data,
    });

    // Compress using Pako
    const compressed = deflate(jsonString, { level: COMPRESSION_LEVEL });

    // Convert to base64 for URL safety
    const base64 = btoa(String.fromCharCode(...compressed));

    // URL-safe base64 (replace + and / with - and _)
    const urlSafe = base64
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');

    return urlSafe;
  } catch (error) {
    throw new Error(`Failed to compress list data: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Decompress catalogue list data from URL parameter
 */
export function decompressListData(compressedData: string): CompressedListData | null {
  try {
    // Restore base64 padding
    let base64 = compressedData.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) {
      base64 += '=';
    }

    // Decode base64
    const binaryString = atob(base64);
    const compressed = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      compressed[i] = binaryString.charCodeAt(i);
    }

    // Decompress using Pako
    const decompressed = inflate(compressed);
    const jsonString = new TextDecoder().decode(decompressed);

    // Parse JSON
    const parsed = JSON.parse(jsonString);

    // Validate version
    if (parsed.v !== 1) {
      throw new Error(`Unsupported compression version: ${parsed.v}`);
    }

    return parsed.d as CompressedListData;
  } catch (error) {
    // Return null instead of throwing for invalid data
    return null;
  }
}

/**
 * Create a shareable URL for a catalogue list
 */
export function createShareUrl(
  baseUrl: string,
  listData: CompressedListData,
  logger?: GenericLogger
): string {
  try {
    const compressed = compressListData(listData);

    // Check if URL is too long
    const urlLength = baseUrl.length + compressed.length + 10; // +10 for parameter name and separator
    if (urlLength > MAX_URL_LENGTH) {
      logger?.warn(LOG_CATEGORY, "Generated URL may be too long", {
        urlLength,
        maxLength: MAX_URL_LENGTH,
        entityCount: listData.entities.length,
      });
    }

    // Create URL with compressed data parameter
    const separator = baseUrl.includes('?') ? '&' : '?';
    return `${baseUrl}${separator}data=${compressed}`;
  } catch (error) {
    logger?.error(LOG_CATEGORY, "Failed to create share URL", { error });
    throw error;
  }
}

/**
 * Extract and decompress catalogue data from URL
 */
export function extractListDataFromUrl(
  url: string,
  logger?: GenericLogger
): CompressedListData | null {
  try {
    // Extract data parameter from URL
    const urlObj = new URL(url);
    const compressedData = urlObj.searchParams.get('data');

    if (!compressedData) {
      return null;
    }

    return decompressListData(compressedData);
  } catch (error) {
    logger?.error(LOG_CATEGORY, "Failed to extract list data from URL", { url, error });
    return null;
  }
}

/**
 * Validate compressed list data structure
 */
export function validateListData(data: any): data is CompressedListData {
  if (!data || typeof data !== 'object') {
    return false;
  }

  const { list, entities } = data;

  // Validate list structure
  if (!list || typeof list !== 'object') {
    return false;
  }

  if (!list.title || typeof list.title !== 'string') {
    return false;
  }

  if (list.type && !['list', 'bibliography'].includes(list.type)) {
    return false;
  }

  // Validate entities structure
  if (!Array.isArray(entities)) {
    return false;
  }

  const validEntityTypes = [
    'works', 'authors', 'sources', 'institutions', 'topics', 'publishers', 'funders'
  ];

  for (const entity of entities) {
    if (!entity || typeof entity !== 'object') {
      return false;
    }

    if (!entity.entityType || !validEntityTypes.includes(entity.entityType)) {
      return false;
    }

    if (!entity.entityId || typeof entity.entityId !== 'string') {
      return false;
    }
  }

  return true;
}

/**
 * Optimize list data for compression by reducing redundancy
 */
export function optimizeListData(data: CompressedListData): CompressedListData {
  return {
    list: {
      title: data.list.title.trim(),
      description: data.list.description?.trim() || undefined,
      type: data.list.type,
      tags: data.list.tags?.filter(tag => tag.trim().length > 0) || undefined,
    },
    entities: data.entities.map(entity => ({
      entityType: entity.entityType,
      entityId: entity.entityId.trim(),
      notes: entity.notes?.trim() || undefined,
    })),
  };
}

/**
 * Estimate compressed size of list data without actually compressing
 */
export function estimateCompressedSize(data: CompressedListData): number {
  const jsonString = JSON.stringify({
    v: 1,
    d: optimizeListData(data),
  });

  // Rough estimate: compressed size is typically 20-40% of original for this type of data
  return Math.ceil(jsonString.length * 0.3);
}

/**
 * Check if list data can be reasonably shared via URL
 */
export function canShareViaUrl(data: CompressedListData): boolean {
  const estimatedSize = estimateCompressedSize(data);
  return estimatedSize <= MAX_URL_LENGTH - 100; // Leave buffer for URL structure
}

/**
 * Split large lists into multiple shareable chunks
 */
export function splitListForSharing(data: CompressedListData): CompressedListData[] {
  const maxEntities = 50; // Conservative limit per URL
  const chunks: CompressedListData[] = [];

  if (data.entities.length <= maxEntities) {
    return [data];
  }

  // Split entities into chunks
  for (let i = 0; i < data.entities.length; i += maxEntities) {
    const chunkEntities = data.entities.slice(i, i + maxEntities);
    const chunkData: CompressedListData = {
      list: {
        ...data.list,
        title: i === 0 ? data.list.title : `${data.list.title} (Part ${Math.floor(i / maxEntities) + 1})`,
        description: i === 0 ? data.list.description : `Part ${Math.floor(i / maxEntities) + 1} of ${Math.ceil(data.entities.length / maxEntities)}`,
      },
      entities: chunkEntities,
    };

    if (canShareViaUrl(chunkData)) {
      chunks.push(chunkData);
    } else {
      // If even the chunk is too large, split further
      const subChunks = splitListForSharing(chunkData);
      chunks.push(...subChunks);
    }
  }

  return chunks;
}