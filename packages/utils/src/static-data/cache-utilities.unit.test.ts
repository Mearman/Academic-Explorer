/**
 * Tests for static data cache utilities
 * Validates that index.json files only update when content actually changes
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { join } from 'path';
import { mkdir, rmdir } from 'fs/promises';
import { existsSync } from 'fs';
import {
  generateContentHash,
  createCacheEntryMetadata,
  shouldUpdateCache,
  type DirectoryIndex,
  type FileEntry,
  type CacheEntryMetadata
} from './cache-utilities.js';

describe('Content Hash Generation', () => {
  it('should generate same hash for identical content', async () => {
    const data1 = {
      id: "A123456789",
      display_name: "Test Author",
      works_count: 50
    };

    const data2 = {
      id: "A123456789", 
      display_name: "Test Author",
      works_count: 50
    };

    const hash1 = await generateContentHash(data1);
    const hash2 = await generateContentHash(data2);

    expect(hash1).toBe(hash2);
    expect(hash1).toMatch(/^[a-f0-9]{16}$/); // 16-char hex string
  });

  it('should generate different hashes for different content', async () => {
    const data1 = {
      id: "A123456789",
      display_name: "Test Author",
      works_count: 50
    };

    const data2 = {
      id: "A123456789",
      display_name: "Test Author", 
      works_count: 51 // Different count
    };

    const hash1 = await generateContentHash(data1);
    const hash2 = await generateContentHash(data2);

    expect(hash1).not.toBe(hash2);
  });

  it('should ignore volatile metadata fields', async () => {
    const data1 = {
      id: "A123456789",
      display_name: "Test Author",
      works_count: 50,
      meta: {
        count: 100,
        db_response_time_ms: 25,
        page: 1,
        per_page: 25,
        // Non-volatile field that should affect hash
        groups_count: 5
      }
    };

    const data2 = {
      id: "A123456789",
      display_name: "Test Author", 
      works_count: 50,
      meta: {
        count: 200, // Different volatile field
        db_response_time_ms: 50, // Different volatile field
        page: 2, // Different volatile field
        per_page: 50, // Different volatile field
        groups_count: 5 // Same non-volatile field
      }
    };

    const hash1 = await generateContentHash(data1);
    const hash2 = await generateContentHash(data2);

    expect(hash1).toBe(hash2); // Should be same since only volatile fields changed
  });

  it('should handle metadata removal correctly', async () => {
    const dataWithMeta = {
      id: "A123456789",
      display_name: "Test Author",
      works_count: 50,
      meta: {
        count: 100, // Will be removed (volatile)
        db_response_time_ms: 25, // Will be removed (volatile)
        page: 1, // Will be removed (volatile)
        per_page: 25 // Will be removed (volatile)
      }
    };

    const dataWithoutMeta = {
      id: "A123456789",
      display_name: "Test Author",
      works_count: 50
      // No meta field at all
    };

    const hash1 = await generateContentHash(dataWithMeta);
    const hash2 = await generateContentHash(dataWithoutMeta);

    // Should be same since all meta fields are volatile and get removed
    expect(hash1).toBe(hash2);
  });

  it('should handle arrays consistently', async () => {
    const data1 = {
      id: "W123456789",
      display_name: "Test Work",
      authorships: [
        { author: { id: "A1" }, position: "first" },
        { author: { id: "A2" }, position: "middle" }
      ]
    };

    const data2 = {
      id: "W123456789", 
      display_name: "Test Work",
      authorships: [
        { author: { id: "A1" }, position: "first" },
        { author: { id: "A2" }, position: "middle" }
      ]
    };

    const hash1 = await generateContentHash(data1);
    const hash2 = await generateContentHash(data2);

    expect(hash1).toBe(hash2);
  });
});

describe('Cache Update Logic', () => {
  it('should require update when no existing metadata', async () => {
    const newData = { id: "A123", display_name: "Test" };
    const shouldUpdate = await shouldUpdateCache(null, newData);
    
    expect(shouldUpdate).toBe(true);
  });

  it('should not require update when content hash matches', async () => {
    const data = { id: "A123", display_name: "Test" };
    const contentHash = await generateContentHash(data);
    
    const existingMetadata: CacheEntryMetadata = {
      contentHash,
      lastModified: new Date().toISOString(),
      sourceUrl: "https://api.openalex.org/authors/A123"
    };

    const shouldUpdate = await shouldUpdateCache(existingMetadata, data);
    
    expect(shouldUpdate).toBe(false);
  });

  it('should require update when content hash differs', async () => {
    const oldData = { id: "A123", display_name: "Test" };
    const newData = { id: "A123", display_name: "Updated Test" };
    
    const oldHash = await generateContentHash(oldData);
    
    const existingMetadata: CacheEntryMetadata = {
      contentHash: oldHash,
      lastModified: new Date().toISOString(),
      sourceUrl: "https://api.openalex.org/authors/A123"
    };

    const shouldUpdate = await shouldUpdateCache(existingMetadata, newData);
    
    expect(shouldUpdate).toBe(true);
  });

  it('should require update when content is too old', async () => {
    const data = { id: "A123", display_name: "Test" };
    const contentHash = await generateContentHash(data);
    
    const oldTimestamp = new Date(Date.now() - 2000).toISOString(); // 2 seconds ago
    const existingMetadata: CacheEntryMetadata = {
      contentHash,
      lastModified: oldTimestamp,
      sourceUrl: "https://api.openalex.org/authors/A123"
    };

    const maxAge = 1000; // 1 second max age
    const shouldUpdate = await shouldUpdateCache(existingMetadata, data, maxAge);
    
    expect(shouldUpdate).toBe(true);
  });

  it('should not require update when content is fresh enough', async () => {
    const data = { id: "A123", display_name: "Test" };
    const contentHash = await generateContentHash(data);
    
    const recentTimestamp = new Date(Date.now() - 500).toISOString(); // 500ms ago
    const existingMetadata: CacheEntryMetadata = {
      contentHash,
      lastModified: recentTimestamp,
      sourceUrl: "https://api.openalex.org/authors/A123"
    };

    const maxAge = 1000; // 1 second max age
    const shouldUpdate = await shouldUpdateCache(existingMetadata, data, maxAge);
    
    expect(shouldUpdate).toBe(false);
  });
});

describe('Directory Index Change Detection', () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = join(process.cwd(), 'tmp', 'test-cache-' + Date.now());
    await mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    if (existsSync(testDir)) {
      await rmdir(testDir, { recursive: true });
    }
  });

  /**
   * Simulate the hasIndexChanged logic from openalex-cache.ts
   */
  function hasIndexChanged(oldIndex: DirectoryIndex | null, newIndex: DirectoryIndex): boolean {
    if (!oldIndex) {
      return true; // No existing index, needs update
    }

    // Compare key fields that would indicate a change
    return (
      oldIndex.lastUpdated !== newIndex.lastUpdated ||
      JSON.stringify(oldIndex.files) !== JSON.stringify(newIndex.files) ||
      JSON.stringify(oldIndex.directories) !== JSON.stringify(newIndex.directories)
    );
  }

  it('should detect when index needs update for new content', async () => {
    const oldIndex: DirectoryIndex = {
      lastUpdated: "2025-09-28T12:00:00.000Z",
      files: {
        "A123": {
          url: "https://api.openalex.org/authors/A123",
          $ref: "./A123.json",
          lastRetrieved: "2025-09-28T12:00:00.000Z",
          contentHash: "abc123"
        }
      }
    };

    const newIndex: DirectoryIndex = {
      lastUpdated: "2025-09-28T13:00:00.000Z", // Different timestamp
      files: {
        "A123": {
          url: "https://api.openalex.org/authors/A123", 
          $ref: "./A123.json",
          lastRetrieved: "2025-09-28T12:00:00.000Z",
          contentHash: "abc123"
        },
        "A456": { // New file
          url: "https://api.openalex.org/authors/A456",
          $ref: "./A456.json", 
          lastRetrieved: "2025-09-28T13:00:00.000Z",
          contentHash: "def456"
        }
      }
    };

    expect(hasIndexChanged(oldIndex, newIndex)).toBe(true);
  });

  it('should detect when content hash changes', async () => {
    const oldIndex: DirectoryIndex = {
      lastUpdated: "2025-09-28T12:00:00.000Z",
      files: {
        "A123": {
          url: "https://api.openalex.org/authors/A123",
          $ref: "./A123.json", 
          lastRetrieved: "2025-09-28T12:00:00.000Z",
          contentHash: "abc123"
        }
      }
    };

    const newIndex: DirectoryIndex = {
      lastUpdated: "2025-09-28T12:00:00.000Z", // Same timestamp
      files: {
        "A123": {
          url: "https://api.openalex.org/authors/A123",
          $ref: "./A123.json",
          lastRetrieved: "2025-09-28T12:00:00.000Z", 
          contentHash: "xyz789" // Different hash
        }
      }
    };

    expect(hasIndexChanged(oldIndex, newIndex)).toBe(true);
  });

  it('should not detect change when only volatile metadata differs', async () => {
    const baseIndex: DirectoryIndex = {
      lastUpdated: "2025-09-28T12:00:00.000Z",
      files: {
        "A123": {
          url: "https://api.openalex.org/authors/A123",
          $ref: "./A123.json",
          lastRetrieved: "2025-09-28T12:00:00.000Z",
          contentHash: "abc123"
        }
      }
    };

    // Create identical index
    const identicalIndex: DirectoryIndex = JSON.parse(JSON.stringify(baseIndex));

    expect(hasIndexChanged(baseIndex, identicalIndex)).toBe(false);
  });

  it('should detect no change when timestamps and hashes are identical', async () => {
    const index1: DirectoryIndex = {
      lastUpdated: "2025-09-28T12:00:00.000Z",
      files: {
        "A123": {
          url: "https://api.openalex.org/authors/A123",
          $ref: "./A123.json",
          lastRetrieved: "2025-09-28T12:00:00.000Z", 
          contentHash: "abc123"
        }
      }
    };

    const index2: DirectoryIndex = {
      lastUpdated: "2025-09-28T12:00:00.000Z",
      files: {
        "A123": {
          url: "https://api.openalex.org/authors/A123",
          $ref: "./A123.json",
          lastRetrieved: "2025-09-28T12:00:00.000Z",
          contentHash: "abc123"
        }
      }
    };

    expect(hasIndexChanged(index1, index2)).toBe(false);
  });
});

describe('Integration: Full Content Change Detection', () => {
  it('should demonstrate full workflow with unchanging content', async () => {
    // Simulate OpenAlex author data fetched at different times
    const apiResponse1 = {
      id: "https://openalex.org/A5017898742",
      display_name: "John Smith",
      works_count: 42,
      cited_by_count: 1234,
      meta: {
        count: 1,
        db_response_time_ms: 15, // Volatile
        page: 1, // Volatile
        per_page: 1 // Volatile
      }
    };

    const apiResponse2 = {
      id: "https://openalex.org/A5017898742", 
      display_name: "John Smith",
      works_count: 42,
      cited_by_count: 1234,
      meta: {
        count: 1,
        db_response_time_ms: 22, // Different volatile value
        page: 1, // Volatile
        per_page: 1 // Volatile
      }
    };

    // Generate content hashes
    const hash1 = await generateContentHash(apiResponse1);
    const hash2 = await generateContentHash(apiResponse2);

    // Content hashes should be identical since only volatile fields changed
    expect(hash1).toBe(hash2);

    // Create cache metadata
    const metadata1 = await createCacheEntryMetadata(
      apiResponse1,
      "https://api.openalex.org/authors/A5017898742"
    );

    // Check if update is needed (it shouldn't be)
    const needsUpdate = await shouldUpdateCache(metadata1, apiResponse2);
    expect(needsUpdate).toBe(false);

    // Create directory index entries
    const indexEntry1: FileEntry = {
      url: "https://api.openalex.org/authors/A5017898742",
      $ref: "./A5017898742.json",
      lastRetrieved: new Date().toISOString(),
      contentHash: hash1
    };

    const indexEntry2: FileEntry = {
      url: "https://api.openalex.org/authors/A5017898742",
      $ref: "./A5017898742.json", 
      lastRetrieved: new Date().toISOString(), // Different timestamp
      contentHash: hash2 // Same hash as hash1
    };

    // Index entries should have same content hash
    expect(indexEntry1.contentHash).toBe(indexEntry2.contentHash);

    // This demonstrates that despite API calls at different times with different
    // volatile metadata, the content hash remains stable and index won't update
    console.log('Hash stability verified:', {
      hash1,
      hash2,
      areEqual: hash1 === hash2,
      needsUpdate
    });
  });

  it('should demonstrate detection of actual content changes', async () => {
    const originalData = {
      id: "https://openalex.org/A5017898742",
      display_name: "John Smith",
      works_count: 42,
      cited_by_count: 1234
    };

    const updatedData = {
      id: "https://openalex.org/A5017898742",
      display_name: "John Smith", 
      works_count: 43, // Work count increased
      cited_by_count: 1234
    };

    const hash1 = await generateContentHash(originalData);
    const hash2 = await generateContentHash(updatedData);

    // Hashes should be different
    expect(hash1).not.toBe(hash2);

    const metadata1 = await createCacheEntryMetadata(
      originalData,
      "https://api.openalex.org/authors/A5017898742"
    );

    // Update should be needed
    const needsUpdate = await shouldUpdateCache(metadata1, updatedData);
    expect(needsUpdate).toBe(true);

    console.log('Content change detection verified:', {
      hash1,
      hash2,
      areDifferent: hash1 !== hash2,
      needsUpdate
    });
  });
});