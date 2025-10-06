/**
 * Tests for static data cache utilities
 * Validates that index.json files only update when content actually changes
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { join } from "path";
import { mkdir, rm } from "fs/promises";
import { existsSync } from "fs";
import {
  generateContentHash,
  createCacheEntryMetadata,
  shouldUpdateCache,
  normalizeQueryForCaching,
  sanitizeUrlForCaching,
  normalizeQueryForFilename,
  queryToFilename,
  filenameToQuery,
  areUrlsEquivalentForCaching,
  getCacheFilePath,
  parseOpenAlexUrl,
  encodeFilename,
  decodeFilename,
  type DirectoryIndex,
  type CacheEntryMetadata,
} from "./cache-utilities.js";

describe("Content Hash Generation", () => {
  it("should generate same hash for identical content", async () => {
    const data1 = {
      id: "A123456789",
      display_name: "Test Author",
      works_count: 50,
    };

    const data2 = {
      id: "A123456789",
      display_name: "Test Author",
      works_count: 50,
    };

    const hash1 = await generateContentHash(data1);
    const hash2 = await generateContentHash(data2);

    expect(hash1).toBe(hash2);
    expect(hash1).toMatch(/^[a-f0-9]{16}$/); // 16-char hex string
  });

  it("should generate different hashes for different content", async () => {
    const data1 = {
      id: "A123456789",
      display_name: "Test Author",
      works_count: 50,
    };

    const data2 = {
      id: "A123456789",
      display_name: "Test Author",
      works_count: 51, // Different count
    };

    const hash1 = await generateContentHash(data1);
    const hash2 = await generateContentHash(data2);

    expect(hash1).not.toBe(hash2);
  });

  it("should completely ignore meta field", async () => {
    const data1 = {
      id: "A123456789",
      display_name: "Test Author",
      works_count: 50,
      meta: {
        count: 100,
        db_response_time_ms: 25,
        page: 1,
        per_page: 25,
        groups_count: 5,
      },
    };

    const data2 = {
      id: "A123456789",
      display_name: "Test Author",
      works_count: 50,
      meta: {
        count: 200, // Different values
        db_response_time_ms: 50,
        page: 2,
        per_page: 50,
        groups_count: 999, // Even non-volatile fields should be ignored
      },
    };

    const hash1 = await generateContentHash(data1);
    const hash2 = await generateContentHash(data2);

    expect(hash1).toBe(hash2); // Should be same since entire meta field is ignored
  });

  it("should handle metadata removal correctly", async () => {
    const dataWithMeta = {
      id: "A123456789",
      display_name: "Test Author",
      works_count: 50,
      meta: {
        count: 100,
        db_response_time_ms: 25,
        page: 1,
        per_page: 25,
      },
    };

    const dataWithoutMeta = {
      id: "A123456789",
      display_name: "Test Author",
      works_count: 50,
      // No meta field at all
    };

    const hash1 = await generateContentHash(dataWithMeta);
    const hash2 = await generateContentHash(dataWithoutMeta);

    // Should be same since entire meta field is excluded
    expect(hash1).toBe(hash2);
  });

  it("should handle arrays consistently", async () => {
    const data1 = {
      id: "W123456789",
      display_name: "Test Work",
      authorships: [
        { author: { id: "A1" }, position: "first" },
        { author: { id: "A2" }, position: "middle" },
      ],
    };

    const data2 = {
      id: "W123456789",
      display_name: "Test Work",
      authorships: [
        { author: { id: "A1" }, position: "first" },
        { author: { id: "A2" }, position: "middle" },
      ],
    };

    const hash1 = await generateContentHash(data1);
    const hash2 = await generateContentHash(data2);

    expect(hash1).toBe(hash2);
  });
});

describe("Cache Update Logic", () => {
  it("should require update when no existing metadata", async () => {
    const newData = { id: "A123", display_name: "Test" };
    const shouldUpdate = await shouldUpdateCache(null, newData);

    expect(shouldUpdate).toBe(true);
  });

  it("should not require update when content hash matches", async () => {
    const data = { id: "A123", display_name: "Test" };
    const contentHash = await generateContentHash(data);

    const existingMetadata: CacheEntryMetadata = {
      contentHash,
      lastModified: new Date().toISOString(),
      sourceUrl: "https://api.openalex.org/authors/A123",
    };

    const shouldUpdate = await shouldUpdateCache(existingMetadata, data);

    expect(shouldUpdate).toBe(false);
  });

  it("should require update when content hash differs", async () => {
    const oldData = { id: "A123", display_name: "Test" };
    const newData = { id: "A123", display_name: "Updated Test" };

    const oldHash = await generateContentHash(oldData);

    const existingMetadata: CacheEntryMetadata = {
      contentHash: oldHash,
      lastModified: new Date().toISOString(),
      sourceUrl: "https://api.openalex.org/authors/A123",
    };

    const shouldUpdate = await shouldUpdateCache(existingMetadata, newData);

    expect(shouldUpdate).toBe(true);
  });

  it("should require update when content is too old", async () => {
    const data = { id: "A123", display_name: "Test" };
    const contentHash = await generateContentHash(data);

    const oldTimestamp = new Date(Date.now() - 2000).toISOString(); // 2 seconds ago
    const existingMetadata: CacheEntryMetadata = {
      contentHash,
      lastModified: oldTimestamp,
      sourceUrl: "https://api.openalex.org/authors/A123",
    };

    const maxAge = 1000; // 1 second max age
    const shouldUpdate = await shouldUpdateCache(
      existingMetadata,
      data,
      maxAge,
    );

    expect(shouldUpdate).toBe(true);
  });

  it("should not require update when content is fresh enough", async () => {
    const data = { id: "A123", display_name: "Test" };
    const contentHash = await generateContentHash(data);

    const recentTimestamp = new Date(Date.now() - 500).toISOString(); // 500ms ago
    const existingMetadata: CacheEntryMetadata = {
      contentHash,
      lastModified: recentTimestamp,
      sourceUrl: "https://api.openalex.org/authors/A123",
    };

    const maxAge = 1000; // 1 second max age
    const shouldUpdate = await shouldUpdateCache(
      existingMetadata,
      data,
      maxAge,
    );

    expect(shouldUpdate).toBe(false);
  });
});

describe("Directory Index Change Detection (Array Structure)", () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = join(process.cwd(), "tmp", "test-cache-" + Date.now());
    await mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    if (existsSync(testDir)) {
      await rm(testDir, { recursive: true });
    }
  });

  /**
   * Simulate the hasIndexChanged logic from openalex-cache.ts
   */
  function hasIndexChanged(
    oldIndex: DirectoryIndex | null,
    newIndex: DirectoryIndex,
  ): boolean {
    if (!oldIndex) {
      return true; // No existing index, needs update
    }

    // Compare key fields that would indicate a change
    return (
      oldIndex.lastUpdated !== newIndex.lastUpdated ||
      JSON.stringify(oldIndex.files) !== JSON.stringify(newIndex.files) ||
      JSON.stringify(oldIndex.directories) !==
        JSON.stringify(newIndex.directories)
    );
  }

  it("should detect when index needs update for new content", async () => {
    const oldIndex: DirectoryIndex = {
      lastUpdated: "2025-09-28T12:00:00.000Z",
      files: {
        A123: {
          url: "https://api.openalex.org/authors/A123",
          $ref: "./A123.json",
          lastRetrieved: "2025-09-28T12:00:00.000Z",
          contentHash: "abc123",
        },
      },
    };

    const newIndex: DirectoryIndex = {
      lastUpdated: "2025-09-28T13:00:00.000Z", // Different timestamp
      files: {
        A123: {
          url: "https://api.openalex.org/authors/A123",
          $ref: "./A123.json",
          lastRetrieved: "2025-09-28T12:00:00.000Z",
          contentHash: "abc123",
        },
        A456: {
          // New file
          url: "https://api.openalex.org/authors/A456",
          $ref: "./A456.json",
          lastRetrieved: "2025-09-28T13:00:00.000Z",
          contentHash: "def456",
        },
      },
    };

    expect(hasIndexChanged(oldIndex, newIndex)).toBe(true);
  });

  it("should detect when content hash changes", async () => {
    const oldIndex: DirectoryIndex = {
      lastUpdated: "2025-09-28T12:00:00.000Z",
      files: {
        A123: {
          url: "https://api.openalex.org/authors/A123",
          $ref: "./A123.json",
          lastRetrieved: "2025-09-28T12:00:00.000Z",
          contentHash: "abc123",
        },
      },
    };

    const newIndex: DirectoryIndex = {
      lastUpdated: "2025-09-28T12:00:00.000Z", // Same timestamp
      files: {
        A123: {
          url: "https://api.openalex.org/authors/A123",
          $ref: "./A123.json",
          lastRetrieved: "2025-09-28T12:00:00.000Z",
          contentHash: "xyz789", // Different hash
        },
      },
    };

    expect(hasIndexChanged(oldIndex, newIndex)).toBe(true);
  });

  it("should detect change when lastRetrieved timestamp differs", async () => {
    const oldIndex: DirectoryIndex = {
      lastUpdated: "2025-09-28T12:00:00.000Z",
      files: {
        A123: {
          url: "https://api.openalex.org/authors/A123",
          $ref: "./A123.json",
          lastRetrieved: "2025-09-28T12:00:00.000Z",
          contentHash: "abc123",
        },
      },
    };

    const newIndex: DirectoryIndex = {
      lastUpdated: "2025-09-28T12:00:00.000Z",
      files: {
        A123: {
          url: "https://api.openalex.org/authors/A123",
          $ref: "./A123.json",
          lastRetrieved: "2025-09-28T13:00:00.000Z", // Different timestamp but same content hash
          contentHash: "abc123", // Same hash
        },
      },
    };

    // This SHOULD trigger a change because lastRetrieved changed
    // which indicates the file was re-fetched from the API
    expect(hasIndexChanged(oldIndex, newIndex)).toBe(true);
  });

  it("should detect no change when indexes are identical", async () => {
    const index1: DirectoryIndex = {
      lastUpdated: "2025-09-28T12:00:00.000Z",
      files: {
        A123: {
          url: "https://api.openalex.org/authors/A123",
          $ref: "./A123.json",
          lastRetrieved: "2025-09-28T12:00:00.000Z",
          contentHash: "abc123",
        },
      },
    };

    const index2: DirectoryIndex = {
      lastUpdated: "2025-09-28T12:00:00.000Z",
      files: {
        A123: {
          url: "https://api.openalex.org/authors/A123",
          $ref: "./A123.json",
          lastRetrieved: "2025-09-28T12:00:00.000Z",
          contentHash: "abc123",
        },
      },
    };

    expect(hasIndexChanged(index1, index2)).toBe(false);
  });

  it("should detect changes in subdirectories", async () => {
    const oldIndex: DirectoryIndex = {
      lastUpdated: "2025-09-28T12:00:00.000Z",
      files: {},
      directories: {
        queries: {
          $ref: "./queries",
          lastModified: "2025-09-28T12:00:00.000Z",
        },
      },
    };

    const newIndex: DirectoryIndex = {
      lastUpdated: "2025-09-28T12:00:00.000Z",
      files: {},
      directories: {
        queries: {
          $ref: "./queries",
          lastModified: "2025-09-28T13:00:00.000Z", // Directory was modified
        },
      },
    };

    expect(hasIndexChanged(oldIndex, newIndex)).toBe(true);
  });
});

describe("Filename Encoding/Decoding", () => {
  describe("basic encoding", () => {
    it("should encode forbidden characters with hex codes", () => {
      expect(encodeFilename("filter<test")).toBe("filter__3C__test");
      expect(encodeFilename("query?param")).toBe("query__3F__param");
      expect(encodeFilename("path/file")).toBe("path__2F__file");
      expect(encodeFilename("name*wildcard")).toBe("name__2A__wildcard");
      expect(encodeFilename('quoted"string')).toBe("quoted__22__string");
      expect(encodeFilename("pipe|separator")).toBe("pipe__7C__separator");
      expect(encodeFilename("back\\slash")).toBe("back__5C__slash");
    });

    it("should leave safe characters unchanged", () => {
      expect(encodeFilename("normal_filename")).toBe("normal_filename");
      expect(encodeFilename("dots.and-dashes")).toBe("dots.and-dashes");
      expect(encodeFilename("numbers123")).toBe("numbers123");
      expect(encodeFilename("UPPERCASE")).toBe("UPPERCASE");
      expect(encodeFilename("parentheses()")).toBe("parentheses()");
      expect(encodeFilename("brackets[]")).toBe("brackets[]");
    });

    it("should handle multiple forbidden characters", () => {
      expect(encodeFilename('complex<>?*|/"test')).toBe(
        "complex__3C____3E____3F____2A____7C____2F____22__test",
      );
    });

    it("should handle empty strings", () => {
      expect(encodeFilename("")).toBe("");
    });
  });

  describe("basic decoding", () => {
    it("should decode hex codes back to original characters", () => {
      expect(decodeFilename("filter__3C__test")).toBe("filter<test");
      expect(decodeFilename("query__3F__param")).toBe("query?param");
      expect(decodeFilename("path__2F__file")).toBe("path/file");
      expect(decodeFilename("name__2A__wildcard")).toBe("name*wildcard");
      expect(decodeFilename("quoted__22__string")).toBe('quoted"string');
      expect(decodeFilename("pipe__7C__separator")).toBe("pipe|separator");
      expect(decodeFilename("back__5C__slash")).toBe("back\\slash");
    });

    it("should leave non-encoded content unchanged", () => {
      expect(decodeFilename("normal_filename")).toBe("normal_filename");
      expect(decodeFilename("dots.and-dashes")).toBe("dots.and-dashes");
    });

    it("should handle multiple encoded characters", () => {
      expect(
        decodeFilename("complex__3C____3E____3F____2A____7C____2F____22__test"),
      ).toBe('complex<>?*|/"test');
    });

    it("should handle empty strings", () => {
      expect(decodeFilename("")).toBe("");
    });
  });

  describe("round-trip consistency", () => {
    it("should maintain perfect round-trip conversion", () => {
      const testCases = [
        "filter<test",
        "query?param=value",
        "path/file",
        "name*wildcard",
        'quoted"string',
        "pipe|separator",
        "back\\slash",
        "normal_filename",
        'complex<>?*|/"test',
        "unicode_éñ_content",
        "",
        "already__encoded__content",
      ];

      testCases.forEach((original) => {
        const encoded = encodeFilename(original);
        const decoded = decodeFilename(encoded);
        expect(decoded).toBe(original);
      });
    });

    it("should handle multiple encode/decode cycles", () => {
      const original = "test<file>with?chars";
      let current = original;

      // Encode and decode multiple times
      for (let i = 0; i < 5; i++) {
        current = encodeFilename(current);
        current = decodeFilename(current);
      }

      expect(current).toBe(original);
    });
  });

  describe("filesystem safety", () => {
    it("should produce filesystem-safe encoded names", () => {
      const problematicNames = [
        "CON",
        "PRN",
        "AUX",
        "NUL", // Windows reserved
        "file<with>forbidden?chars",
        "path/with/slashes",
        'quoted"content',
        "pipe|separated|values",
      ];

      problematicNames.forEach((name) => {
        const encoded = encodeFilename(name);
        // Should not contain any forbidden filesystem characters
        expect(encoded).not.toMatch(/[<>"|*?/\\]/);
      });
    });
  });

  describe("real-world query examples", () => {
    it("should handle OpenAlex query parameters correctly with hex encoding", () => {
      // Note: With new encoding, special chars like :, =, &, , are hex-encoded
      const queries = [
        "filter=year:2020&sort=cited_by_count:desc",
        "search=artificial intelligence&filter=type:journal-article",
        "group_by=publication_year&filter=cited_by_count:>100",
        "select=id,display_name,cited_by_count",
      ];

      queries.forEach((query) => {
        const encoded = encodeFilename(query);
        const decoded = decodeFilename(encoded);
        expect(decoded).toBe(query);

        // Verify special characters are hex-encoded
        if (query.includes(":")) expect(encoded).toContain("__3A__");
        if (query.includes("=")) expect(encoded).toContain("__3D__");
        if (query.includes("&")) expect(encoded).toContain("__26__");
        if (query.includes(",")) expect(encoded).toContain("__2C__");
        if (query.includes(">")) expect(encoded).toContain("__3E__");
      });
    });

    it("should handle complex URL-encoded query strings", () => {
      // With new encoding: URL encoding is decoded first, then hex-encoded
      const encoded = encodeFilename(
        "filter=institutions.country_code%3Aus&sort=cited_by_count%3Adesc",
      );
      const decoded = decodeFilename(encoded);
      // After decoding URL encoding and re-encoding, we get the original unencoded form
      expect(decoded).toBe(
        "filter=institutions.country_code:us&sort=cited_by_count:desc",
      );
    });
  });

  describe("URL-encoded input handling", () => {
    it("should decode URL encoding before applying hex encoding", () => {
      // Input with URL encoding should be decoded first
      const urlEncoded = "filter%3Ayear%3A2020";
      const encoded = encodeFilename(urlEncoded);
      const decoded = decodeFilename(encoded);

      // Result should be the original unencoded form
      expect(decoded).toBe("filter:year:2020");

      // Encoded form should use hex encoding for special chars
      expect(encoded).toBe("filter__3A__year__3A__2020");
    });

    it("should handle URL-special characters with unified hex encoding", () => {
      const testCases = [
        {
          input: "filter:year:2020",
          expected: "filter__3A__year__3A__2020",
          decoded: "filter:year:2020",
        },
        {
          input: "key=value",
          expected: "key__3D__value",
          decoded: "key=value",
        },
        {
          input: "param&other",
          expected: "param__26__other",
          decoded: "param&other",
        },
        {
          input: "space+here",
          expected: "space__2B__here",
          decoded: "space+here",
        },
        {
          input: "item,list",
          expected: "item__2C__list",
          decoded: "item,list",
        },
        // URL-encoded percent: %25 gets decoded to % first, then encoded to __25__
        // Roundtrip returns decoded form (%) not URL-encoded form (%25)
        {
          input: "discount%25",
          expected: "discount__25__",
          decoded: "discount%",
        },
      ];

      testCases.forEach(({ input, expected, decoded }) => {
        const encoded = encodeFilename(input);
        expect(encoded).toBe(expected);
        expect(decodeFilename(encoded)).toBe(decoded);
      });
    });

    it("should handle mixed URL-encoded and plain input", () => {
      // Mix of URL-encoded (%3A) and plain (:) should normalize to same result
      const urlEncoded = "filter%3Ayear%3A2020&sort%3Adesc";
      const plainText = "filter:year:2020&sort:desc";

      const encodedUrl = encodeFilename(urlEncoded);
      const encodedPlain = encodeFilename(plainText);

      // Both should produce the same encoded result
      expect(encodedUrl).toBe(encodedPlain);
      expect(encodedUrl).toBe("filter__3A__year__3A__2020__26__sort__3A__desc");

      // Both should decode to the plain form
      expect(decodeFilename(encodedUrl)).toBe(plainText);
      expect(decodeFilename(encodedPlain)).toBe(plainText);
    });

    it("should handle real OpenAlex query with URL encoding", () => {
      const query = "filter=author.id%3AA5023888391&select=id%2Cdisplay_name";
      const encoded = encodeFilename(query);
      const decoded = decodeFilename(encoded);

      // Should decode to plain form
      expect(decoded).toBe(
        "filter=author.id:A5023888391&select=id,display_name",
      );

      // Should have hex encoding for all special chars
      expect(encoded).toContain("__3A__"); // :
      expect(encoded).toContain("__3D__"); // =
      expect(encoded).toContain("__26__"); // &
      expect(encoded).toContain("__2C__"); // ,
    });

    it("should handle malformed URL encoding gracefully", () => {
      // Invalid URL encoding should fall back to simple encoding
      const malformed = "filter%3invalid%ZZ";
      const encoded = encodeFilename(malformed);

      // Should not throw, should encode what it can
      expect(encoded).toBeDefined();
      expect(typeof encoded).toBe("string");
    });

    it("should produce consistent results regardless of input encoding", () => {
      // These all represent the same logical content
      const variants = [
        "filter:year:2020", // Plain
        "filter%3Ayear%3A2020", // URL encoded
        "filter%3ayear%3a2020", // URL encoded lowercase
      ];

      const encodedResults = variants.map((v) => encodeFilename(v));

      // All should produce the same encoded result
      const firstEncoded = encodedResults[0];
      encodedResults.forEach((encoded) => {
        expect(encoded).toBe(firstEncoded);
      });

      // All should decode to the same plain form
      const decodedResults = encodedResults.map((e) => decodeFilename(e));
      decodedResults.forEach((decoded) => {
        expect(decoded).toBe("filter:year:2020");
      });
    });
  });
});

describe("Query String Normalization", () => {
  describe("basic parameter stripping", () => {
    it("should remove api_key parameter completely", () => {
      expect(normalizeQueryForCaching("?api_key=sk-1234567890abcdef")).toBe("");
      expect(normalizeQueryForCaching("api_key=secret123")).toBe("");
    });

    it("should remove mailto parameter completely", () => {
      expect(normalizeQueryForCaching("?mailto=joseph@mearman.co.uk")).toBe("");
      expect(normalizeQueryForCaching("mailto=user@domain.org")).toBe("");
    });

    it("should handle cursor parameter specially", () => {
      // Keep cursor=*
      expect(normalizeQueryForCaching("?cursor=*")).toBe("?cursor=*");

      // Replace specific cursor values with *
      expect(
        normalizeQueryForCaching(
          "?cursor=IlsxNjA5MzcyODAwMDAwLCAnaHR0cHM6Ly9vcGVuYWxleC5vcmcvVzI0ODg0OTk3NjQnXSI=",
        ),
      ).toBe("?cursor=*");
      expect(normalizeQueryForCaching("cursor=abc123def456")).toBe("?cursor=*");
    });

    it("should preserve safe parameters", () => {
      expect(normalizeQueryForCaching("?filter=year:2020")).toBe(
        "?filter=year%3A2020",
      );
      expect(normalizeQueryForCaching("?sort=cited_by_count:desc")).toBe(
        "?sort=cited_by_count%3Adesc",
      );
      expect(normalizeQueryForCaching("?search=artificial intelligence")).toBe(
        "?search=artificial+intelligence",
      );
      expect(normalizeQueryForCaching("?per_page=50")).toBe("?per_page=50");
      expect(normalizeQueryForCaching("?group_by=publication_year")).toBe(
        "?group_by=publication_year",
      );
    });
  });

  describe("multiple parameters", () => {
    it("should remove sensitive params while preserving safe ones", () => {
      expect(
        normalizeQueryForCaching(
          "?filter=year:2020&api_key=secret123&mailto=test@domain.org",
        ),
      ).toBe("?filter=year%3A2020");

      expect(
        normalizeQueryForCaching("?api_key=secret123&filter=year:2020"),
      ).toBe("?filter=year%3A2020");

      expect(
        normalizeQueryForCaching(
          "?filter=year:2020&mailto=test@domain.org&sort=cited_by_count",
        ),
      ).toBe("?filter=year%3A2020&sort=cited_by_count");
    });

    it("should handle all three types of parameters together", () => {
      expect(
        normalizeQueryForCaching(
          "?filter=year:2020&api_key=secret123&mailto=test@domain.org&cursor=abc123",
        ),
      ).toBe("?cursor=*&filter=year%3A2020");

      expect(
        normalizeQueryForCaching(
          "?filter=year:2020&api_key=secret123&mailto=test@domain.org&cursor=*",
        ),
      ).toBe("?cursor=*&filter=year%3A2020");
    });

    it("should handle complex parameter combinations", () => {
      const input =
        "?filter=year:2020&sort=cited_by_count:desc&api_key=sk-123&mailto=user@test.com&per_page=50&cursor=xyz789";
      const expected =
        "?cursor=*&filter=year%3A2020&per_page=50&sort=cited_by_count%3Adesc";
      expect(normalizeQueryForCaching(input)).toBe(expected);
    });
  });

  describe("edge cases", () => {
    it("should handle empty or null inputs", () => {
      expect(normalizeQueryForCaching("")).toBe("");
      expect(normalizeQueryForCaching("?")).toBe("");
    });

    it("should handle malformed query strings gracefully", () => {
      // These should fall back to regex-based cleanup
      expect(normalizeQueryForCaching("filter=year:2020&api_key=secret&")).toBe(
        "?filter=year%3A2020",
      );
      expect(normalizeQueryForCaching("api_key=secret&filter=year:2020")).toBe(
        "?filter=year%3A2020",
      );
    });

    it("should handle URLs with only sensitive parameters", () => {
      expect(normalizeQueryForCaching("?api_key=secret123")).toBe("");
      expect(normalizeQueryForCaching("?mailto=test@domain.org")).toBe("");
      expect(
        normalizeQueryForCaching("?api_key=secret&mailto=user@domain.com"),
      ).toBe("");
    });

    it("should handle parameters without leading question mark", () => {
      expect(
        normalizeQueryForCaching("filter=year:2020&api_key=secret123"),
      ).toBe("?filter=year%3A2020");
      expect(
        normalizeQueryForCaching("api_key=secret123&filter=year:2020"),
      ).toBe("?filter=year%3A2020");
    });
  });

  describe("real-world query strings", () => {
    it("should handle typical OpenAlex filter queries", () => {
      expect(
        normalizeQueryForCaching(
          "?filter=institutions.country_code:us&sort=cited_by_count:desc",
        ),
      ).toBe(
        "?filter=institutions.country_code%3Aus&sort=cited_by_count%3Adesc",
      );

      expect(
        normalizeQueryForCaching(
          "?filter=publication_year:2020,authorships.institutions.id:I27837315",
        ),
      ).toBe(
        "?filter=publication_year%3A2020%2Cauthorships.institutions.id%3AI27837315",
      );
    });

    it("should handle search queries with special characters", () => {
      expect(
        normalizeQueryForCaching(
          "?search=artificial intelligence&filter=type:journal-article",
        ),
      ).toBe("?filter=type%3Ajournal-article&search=artificial+intelligence");
    });

    it("should handle group_by queries", () => {
      expect(
        normalizeQueryForCaching(
          "?group_by=publication_year&filter=cited_by_count:>100",
        ),
      ).toBe("?filter=cited_by_count%3A%3E100&group_by=publication_year");
    });

    it("should handle pagination with cursor", () => {
      expect(normalizeQueryForCaching("?per_page=200&cursor=*")).toBe(
        "?cursor=*&per_page=200",
      );

      expect(
        normalizeQueryForCaching(
          "?per_page=200&cursor=IlsxNjA5MzcyODAwMDAwXSI=",
        ),
      ).toBe("?cursor=*&per_page=200");
    });

    it("should handle select parameter with field lists", () => {
      expect(
        normalizeQueryForCaching("?select=id,display_name,cited_by_count"),
      ).toBe("?select=id%2Cdisplay_name%2Ccited_by_count");
    });
  });

  describe("privacy preservation examples", () => {
    it("should remove personal email addresses", () => {
      const testEmails = [
        "joseph@mearman.co.uk",
        "user.name+tag@example.com",
        "test123@university.edu",
        "researcher@institution.ac.uk",
      ];

      testEmails.forEach((email) => {
        expect(
          normalizeQueryForCaching(`?mailto=${email}&filter=year:2020`),
        ).toBe("?filter=year%3A2020");
      });
    });

    it("should remove various API key formats", () => {
      const testKeys = [
        "sk-1234567890abcdef",
        "api_key_12345",
        "bearer_token_xyz",
        "secret123456789",
      ];

      testKeys.forEach((key) => {
        expect(
          normalizeQueryForCaching(`?api_key=${key}&filter=year:2020`),
        ).toBe("?filter=year%3A2020");
      });
    });

    it("should normalize cursor values consistently", () => {
      const testCursors = [
        "IlsxNjA5MzcyODAwMDAwLCAnaHR0cHM6Ly9vcGVuYWxleC5vcmcvVzI0ODg0OTk3NjQnXSI=",
        "abc123def456ghi789",
        "cursor_value_12345",
        "VGVzdCBjdXJzb3IgdmFsdWU=",
      ];

      testCursors.forEach((cursor) => {
        const result = normalizeQueryForCaching(
          `?cursor=${cursor}&filter=year:2020`,
        );
        // Parameters are now sorted alphabetically, so cursor comes first
        expect(result).toBe("?cursor=*&filter=year%3A2020");
      });
    });
  });
});

describe("Cache File Path Generation", () => {
  const staticDataRoot = "/test/data/openalex";

  describe("entity URLs", () => {
    it("should generate correct paths for single entities", () => {
      expect(
        getCacheFilePath(
          "https://api.openalex.org/works/W123456",
          staticDataRoot,
        ),
      ).toBe("/test/data/openalex/works/W123456.json");

      expect(
        getCacheFilePath(
          "https://api.openalex.org/authors/A5017898742",
          staticDataRoot,
        ),
      ).toBe("/test/data/openalex/authors/A5017898742.json");

      expect(
        getCacheFilePath(
          "https://api.openalex.org/institutions/I27837315",
          staticDataRoot,
        ),
      ).toBe("/test/data/openalex/institutions/I27837315.json");
    });

    it("should handle entity URLs with select parameters", () => {
      expect(
        getCacheFilePath(
          "https://api.openalex.org/works/W123456?select=id,display_name",
          staticDataRoot,
        ),
      ).toBe(
        "/test/data/openalex/works/W123456/queries/select__3D__id__2C__display_name.json",
      );

      expect(
        getCacheFilePath(
          "https://api.openalex.org/authors/A123?select=id,display_name,orcid",
          staticDataRoot,
        ),
      ).toBe(
        "/test/data/openalex/authors/A123/queries/select__3D__id__2C__display_name__2C__orcid.json",
      );
    });
  });

  describe("base collection URLs", () => {
    it("should generate correct paths for base collections", () => {
      expect(
        getCacheFilePath("https://api.openalex.org/works", staticDataRoot),
      ).toBe("/test/data/openalex/works.json");

      expect(
        getCacheFilePath("https://api.openalex.org/authors", staticDataRoot),
      ).toBe("/test/data/openalex/authors.json");

      expect(
        getCacheFilePath(
          "https://api.openalex.org/institutions",
          staticDataRoot,
        ),
      ).toBe("/test/data/openalex/institutions.json");
    });
  });

  describe("query URLs with meaningful parameters", () => {
    it("should generate correct paths for filter queries", () => {
      expect(
        getCacheFilePath(
          "https://api.openalex.org/works?filter=year:2020",
          staticDataRoot,
        ),
      ).toBe(
        "/test/data/openalex/works/queries/filter__3D__year__3A__2020.json",
      );

      expect(
        getCacheFilePath(
          "https://api.openalex.org/authors?filter=display_name.search:smith",
          staticDataRoot,
        ),
      ).toBe(
        "/test/data/openalex/authors/queries/filter__3D__display_name.search__3A__smith.json",
      );
    });

    it("should generate correct paths for search queries", () => {
      expect(
        getCacheFilePath(
          "https://api.openalex.org/works?search=artificial intelligence",
          staticDataRoot,
        ),
      ).toBe(
        "/test/data/openalex/works/queries/search__3D__artificial__2B__intelligence.json",
      );
    });

    it("should generate correct paths for complex queries", () => {
      expect(
        getCacheFilePath(
          "https://api.openalex.org/works?filter=year:2020&sort=cited_by_count:desc",
          staticDataRoot,
        ),
      ).toBe(
        "/test/data/openalex/works/queries/filter__3D__year__3A__2020__26__sort__3D__cited_by_count__3A__desc.json",
      );
    });

    it("should handle cursor parameters correctly", () => {
      expect(
        getCacheFilePath(
          "https://api.openalex.org/works?filter=year:2020&cursor=*",
          staticDataRoot,
        ),
      ).toBe(
        "/test/data/openalex/works/queries/cursor__3D____2A____26__filter__3D__year__3A__2020.json",
      );

      expect(
        getCacheFilePath(
          "https://api.openalex.org/works?filter=year:2020&cursor=abc123",
          staticDataRoot,
        ),
      ).toBe(
        "/test/data/openalex/works/queries/cursor__3D____2A____26__filter__3D__year__3A__2020.json",
      );
    });
  });

  describe("sensitive parameter handling", () => {
    it("should treat URLs with ONLY sensitive params as base collections", () => {
      // The key test case that was broken before
      expect(
        getCacheFilePath(
          "https://api.openalex.org/works?api_key=secret&mailto=user@domain.com",
          staticDataRoot,
        ),
      ).toBe("/test/data/openalex/works.json");

      expect(
        getCacheFilePath(
          "https://api.openalex.org/authors?mailto=joseph@mearman.co.uk",
          staticDataRoot,
        ),
      ).toBe("/test/data/openalex/authors.json");

      expect(
        getCacheFilePath(
          "https://api.openalex.org/institutions?api_key=sk-123456",
          staticDataRoot,
        ),
      ).toBe("/test/data/openalex/institutions.json");
    });

    it("should strip sensitive params while preserving meaningful ones", () => {
      expect(
        getCacheFilePath(
          "https://api.openalex.org/works?filter=year:2020&api_key=secret",
          staticDataRoot,
        ),
      ).toBe(
        "/test/data/openalex/works/queries/filter__3D__year__3A__2020.json",
      );

      expect(
        getCacheFilePath(
          "https://api.openalex.org/authors?mailto=user@domain.com&search=smith",
          staticDataRoot,
        ),
      ).toBe("/test/data/openalex/authors/queries/search__3D__smith.json");
    });

    it("should handle mixed sensitive and cursor parameters", () => {
      expect(
        getCacheFilePath(
          "https://api.openalex.org/works?cursor=abc123&api_key=secret&mailto=user@domain.com",
          staticDataRoot,
        ),
      ).toBe("/test/data/openalex/works/queries/cursor__3D____2A__.json");

      expect(
        getCacheFilePath(
          "https://api.openalex.org/works?cursor=*&api_key=secret",
          staticDataRoot,
        ),
      ).toBe("/test/data/openalex/works/queries/cursor__3D____2A__.json");
    });
  });

  describe("edge cases", () => {
    it("should handle malformed URLs gracefully", () => {
      expect(getCacheFilePath("not-a-url", staticDataRoot)).toBe(null);
      expect(
        getCacheFilePath("https://other-domain.com/works", staticDataRoot),
      ).toBe(null);
    });

    it("should handle URLs without entity types", () => {
      expect(
        getCacheFilePath("https://api.openalex.org/", staticDataRoot),
      ).toBe(null);
      expect(getCacheFilePath("https://api.openalex.org", staticDataRoot)).toBe(
        null,
      );
    });

    it("should handle nested paths", () => {
      expect(
        getCacheFilePath(
          "https://api.openalex.org/works/W123/authors",
          staticDataRoot,
        ),
      ).toBe("/test/data/openalex/works/W123/authors.json");
    });

    it("should handle empty static data root", () => {
      expect(
        getCacheFilePath("https://api.openalex.org/works/W123456", ""),
      ).toBe("/works/W123456.json");
    });
  });

  describe("parseOpenAlexUrl integration", () => {
    it("should correctly parse and classify URLs", () => {
      expect(parseOpenAlexUrl("https://api.openalex.org/works")).toEqual({
        pathSegments: ["works"],
        isQuery: false,
        queryString: "",
        entityType: "works",
        entityId: undefined,
      });

      expect(
        parseOpenAlexUrl("https://api.openalex.org/works/W123456"),
      ).toEqual({
        pathSegments: ["works", "W123456"],
        isQuery: false,
        queryString: "",
        entityType: "works",
        entityId: "W123456",
      });

      expect(
        parseOpenAlexUrl("https://api.openalex.org/works?filter=year:2020"),
      ).toEqual({
        pathSegments: ["works"],
        isQuery: true,
        queryString: "?filter=year:2020",
        entityType: "works",
        entityId: undefined,
      });

      // Invalid entity types should return null
      expect(parseOpenAlexUrl("https://api.openalex.org/works0")).toBe(null);
      expect(parseOpenAlexUrl("https://api.openalex.org/invalid")).toBe(null);
      expect(parseOpenAlexUrl("https://api.openalex.org/unknown")).toBe(null);
    });
  });

  describe("real-world examples", () => {
    it("should handle documented OpenAlex API examples correctly", () => {
      // Examples from OpenAlex documentation (with hex encoding for special chars)
      expect(
        getCacheFilePath(
          "https://api.openalex.org/works?filter=institutions.country_code:us",
          staticDataRoot,
        ),
      ).toBe(
        "/test/data/openalex/works/queries/filter__3D__institutions.country_code__3A__us.json",
      );

      expect(
        getCacheFilePath(
          "https://api.openalex.org/works?group_by=publication_year",
          staticDataRoot,
        ),
      ).toBe(
        "/test/data/openalex/works/queries/group_by__3D__publication_year.json",
      );

      expect(
        getCacheFilePath(
          "https://api.openalex.org/works?search=artificial intelligence&filter=type:journal-article",
          staticDataRoot,
        ),
      ).toBe(
        "/test/data/openalex/works/queries/filter__3D__type__3A__journal-article__26__search__3D__artificial__2B__intelligence.json",
      );
    });

    it("should handle problematic URLs that caused issues", () => {
      // URLs that were creating base.json files incorrectly
      expect(
        getCacheFilePath(
          "https://api.openalex.org/works?api_key=secret123&mailto=researcher@university.edu",
          staticDataRoot,
        ),
      ).toBe("/test/data/openalex/works.json"); // Should NOT be works/queries/base.json

      expect(
        getCacheFilePath(
          "https://api.openalex.org/authors?mailto=you@example.com",
          staticDataRoot,
        ),
      ).toBe("/test/data/openalex/authors.json"); // Should NOT be authors/queries/base.json
    });
  });
});

describe("Integration: Full Content Change Detection", () => {
  it("should demonstrate full workflow with unchanging content", async () => {
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
        per_page: 1, // Volatile
      },
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
        per_page: 1, // Volatile
      },
    };

    // Generate content hashes
    const hash1 = await generateContentHash(apiResponse1);
    const hash2 = await generateContentHash(apiResponse2);

    // Content hashes should be identical since entire meta field is ignored
    expect(hash1).toBe(hash2);

    // Create cache metadata
    const metadata1 = await createCacheEntryMetadata(
      apiResponse1,
      "https://api.openalex.org/authors/A5017898742",
    );

    // Check if update is needed (it shouldn't be)
    const needsUpdate = await shouldUpdateCache(metadata1, apiResponse2);
    expect(needsUpdate).toBe(false);

    // Create directory index entries using actual structure
    const indexEntry1: EntityEntry = {
      id: "A5017898742",
      fileName: "A5017898742.json",
      lastModified: new Date().toISOString(),
      contentHash: hash1,
    };

    const indexEntry2: EntityEntry = {
      id: "A5017898742",
      fileName: "A5017898742.json",
      lastModified: new Date().toISOString(), // Different timestamp
      contentHash: hash2, // Same hash as hash1
    };

    // Index entries should have same content hash
    expect(indexEntry1.contentHash).toBe(indexEntry2.contentHash);

    // This demonstrates that despite API calls at different times with different
    // volatile metadata, the content hash remains stable and index won't update unnecessarily
    console.log("Hash stability verified:", {
      hash1,
      hash2,
      areEqual: hash1 === hash2,
      needsUpdate,
    });
  });

  it("should demonstrate detection of actual content changes", async () => {
    const originalData = {
      id: "https://openalex.org/A5017898742",
      display_name: "John Smith",
      works_count: 42,
      cited_by_count: 1234,
    };

    const updatedData = {
      id: "https://openalex.org/A5017898742",
      display_name: "John Smith",
      works_count: 43, // Work count increased
      cited_by_count: 1234,
    };

    const hash1 = await generateContentHash(originalData);
    const hash2 = await generateContentHash(updatedData);

    // Hashes should be different
    expect(hash1).not.toBe(hash2);

    const metadata1 = await createCacheEntryMetadata(
      originalData,
      "https://api.openalex.org/authors/A5017898742",
    );

    // Update should be needed
    const needsUpdate = await shouldUpdateCache(metadata1, updatedData);
    expect(needsUpdate).toBe(true);

    console.log("Content change detection verified:", {
      hash1,
      hash2,
      areDifferent: hash1 !== hash2,
      needsUpdate,
    });
  });

  it("should demonstrate index structure stability", async () => {
    // Real structure from the actual system
    const realIndex: DirectoryIndex = {
      lastUpdated: "2025-09-28T16:10:04.643Z",
      files: {
        A5017898742: {
          url: "https://api.openalex.org/authors/A5017898742",
          $ref: "./A5017898742.json",
          lastRetrieved: "2025-09-28T12:56:10.732Z",
          contentHash: "c77e827545226162",
        },
      },
    };

    // Simulate the same index regenerated but with same content
    const regeneratedIndex: DirectoryIndex = {
      lastUpdated: "2025-09-28T16:10:04.643Z", // Same timestamp
      files: {
        A5017898742: {
          url: "https://api.openalex.org/authors/A5017898742",
          $ref: "./A5017898742.json",
          lastRetrieved: "2025-09-28T12:56:10.732Z", // Same lastRetrieved
          contentHash: "c77e827545226162", // Same content hash
        },
      },
    };

    function hasIndexChanged(
      oldIndex: DirectoryIndex | null,
      newIndex: DirectoryIndex,
    ): boolean {
      if (!oldIndex) return true;
      return (
        oldIndex.lastUpdated !== newIndex.lastUpdated ||
        JSON.stringify(oldIndex.files) !== JSON.stringify(newIndex.files) ||
        JSON.stringify(oldIndex.directories) !==
          JSON.stringify(newIndex.directories)
      );
    }

    // Should not detect change when indexes are identical
    expect(hasIndexChanged(realIndex, regeneratedIndex)).toBe(false);

    console.log("Index structure stability verified");
  });
});
describe("URL Sanitization", () => {
  describe("sanitizeUrlForCaching", () => {
    it("should remove api_key parameter completely", () => {
      expect(sanitizeUrlForCaching("?api_key=sk-1234567890abcdef")).toBe("");
      expect(sanitizeUrlForCaching("api_key=secret123")).toBe("");
      expect(sanitizeUrlForCaching("?filter=year:2020&api_key=secret")).toBe(
        "?filter=year%3A2020",
      );
    });

    it("should remove mailto parameter completely", () => {
      expect(sanitizeUrlForCaching("?mailto=joseph@mearman.co.uk")).toBe("");
      expect(sanitizeUrlForCaching("mailto=user@domain.org")).toBe("");
      expect(
        sanitizeUrlForCaching("?filter=year:2020&mailto=test@domain.org"),
      ).toBe("?filter=year%3A2020");
    });

    it("should preserve other parameters", () => {
      expect(sanitizeUrlForCaching("?filter=year:2020")).toBe(
        "?filter=year%3A2020",
      );
      expect(sanitizeUrlForCaching("?sort=cited_by_count:desc")).toBe(
        "?sort=cited_by_count%3Adesc",
      );
      expect(sanitizeUrlForCaching("?cursor=abc123def456")).toBe(
        "?cursor=abc123def456",
      );
    });

    it("should handle mixed sensitive and regular parameters", () => {
      expect(
        sanitizeUrlForCaching(
          "?filter=year:2020&api_key=secret&mailto=test@domain.org",
        ),
      ).toBe("?filter=year%3A2020");
    });

    it("should handle empty strings", () => {
      expect(sanitizeUrlForCaching("")).toBe("");
      expect(sanitizeUrlForCaching("?")).toBe("");
    });
  });

  describe("normalizeQueryForFilename", () => {
    it("should normalize cursor values to asterisk", () => {
      expect(normalizeQueryForFilename("?cursor=*")).toBe("?cursor=*");
      expect(
        normalizeQueryForFilename("?cursor=IlsxNjA5MzcyODAwMDAwXSI="),
      ).toBe("?cursor=*");
      expect(normalizeQueryForFilename("cursor=abc123def456")).toBe(
        "?cursor=*",
      );
    });

    it("should sort parameters alphabetically", () => {
      expect(normalizeQueryForFilename("?sort=desc&filter=year:2020")).toBe(
        "?filter=year%3A2020&sort=desc",
      );
      expect(
        normalizeQueryForFilename("?cursor=abc&filter=year:2020&per_page=50"),
      ).toBe("?cursor=*&filter=year%3A2020&per_page=50");
    });

    it("should preserve parameter values", () => {
      expect(normalizeQueryForFilename("?filter=year:2020")).toBe(
        "?filter=year%3A2020",
      );
      expect(normalizeQueryForFilename("?search=artificial intelligence")).toBe(
        "?search=artificial+intelligence",
      );
    });

    it("should handle empty strings", () => {
      expect(normalizeQueryForFilename("")).toBe("");
      expect(normalizeQueryForFilename("?")).toBe("");
    });
  });
});

describe("Bidirectional Filename Conversion", () => {
  describe("queryToFilename and filenameToQuery", () => {
    it("should maintain perfect round-trip conversion", () => {
      const testQueries = [
        "?filter=year:2020",
        "?cursor=abc123&filter=year:2020",
        "?search=artificial intelligence",
        "?filter=institutions.country_code:us&sort=cited_by_count:desc",
        "?select=id,display_name",
        "",
        "?cursor=*",
      ];

      testQueries.forEach((query) => {
        const filename = queryToFilename(query);
        const backToQuery = filenameToQuery(filename);

        // With new encoding, round-trip produces decoded canonical form
        // The encoding/decoding should be consistent
        const secondFilename = queryToFilename(backToQuery);
        expect(secondFilename).toBe(filename);

        // Verify cursor normalization
        if (query.includes("cursor=") && !query.includes("cursor=*")) {
          expect(backToQuery).toContain("cursor=*");
        }
      });
    });

    it("should handle problematic characters in query values", () => {
      const query = '?filter=title.search:"complex<query>with|chars"';
      const filename = queryToFilename(query);
      const backToQuery = filenameToQuery(filename);

      // Should encode/decode problematic characters correctly
      expect(filename).not.toMatch(/[<>"|*?/\\]/);
      // With new encoding, characters are decoded back to their original form
      expect(backToQuery).toContain("complex<query>with|chars");
    });

    it("should normalize cursor values during conversion", () => {
      const query = "?cursor=IlsxNjA5MzcyODAwMDAwXSI=&filter=year:2020";
      const filename = queryToFilename(query);
      const backToQuery = filenameToQuery(filename);

      // With new encoding, decoded form is returned (not URL-encoded)
      expect(backToQuery).toBe("?cursor=*&filter=year:2020");
    });

    it("should handle empty queries", () => {
      expect(queryToFilename("")).toBe("");
      expect(queryToFilename("?")).toBe("");
      expect(filenameToQuery("")).toBe("");
    });

    it("should sort parameters consistently", () => {
      const query = "?sort=desc&filter=year:2020&cursor=abc123";
      const filename = queryToFilename(query);
      const backToQuery = filenameToQuery(filename);

      // With new encoding, decoded form is returned (not URL-encoded)
      expect(backToQuery).toBe("?cursor=*&filter=year:2020&sort=desc");
    });
  });
});

describe("URL Equivalence Comparison", () => {
  describe("areUrlsEquivalentForCaching", () => {
    it("should consider URLs with same query params but different order as equivalent", () => {
      const url1 = "https://api.openalex.org/works?filter=year:2020&sort=desc";
      const url2 = "https://api.openalex.org/works?sort=desc&filter=year:2020";

      expect(areUrlsEquivalentForCaching(url1, url2)).toBe(true);
    });

    it("should ignore sensitive parameters when comparing", () => {
      const url1 =
        "https://api.openalex.org/works?filter=year:2020&api_key=secret1";
      const url2 =
        "https://api.openalex.org/works?filter=year:2020&api_key=secret2";
      const url3 = "https://api.openalex.org/works?filter=year:2020";

      expect(areUrlsEquivalentForCaching(url1, url2)).toBe(true);
      expect(areUrlsEquivalentForCaching(url1, url3)).toBe(true);
      expect(areUrlsEquivalentForCaching(url2, url3)).toBe(true);
    });

    it("should normalize cursor values during comparison", () => {
      const url1 =
        "https://api.openalex.org/works?cursor=abc123&filter=year:2020";
      const url2 =
        "https://api.openalex.org/works?cursor=xyz789&filter=year:2020";
      const url3 = "https://api.openalex.org/works?cursor=*&filter=year:2020";

      expect(areUrlsEquivalentForCaching(url1, url2)).toBe(true);
      expect(areUrlsEquivalentForCaching(url1, url3)).toBe(true);
    });

    it("should require same hostname and pathname", () => {
      const url1 = "https://api.openalex.org/works?filter=year:2020";
      const url2 = "https://api.openalex.org/authors?filter=year:2020";
      const url3 = "https://different.com/works?filter=year:2020";

      expect(areUrlsEquivalentForCaching(url1, url2)).toBe(false);
      expect(areUrlsEquivalentForCaching(url1, url3)).toBe(false);
    });

    it("should consider different query parameters as non-equivalent", () => {
      const url1 = "https://api.openalex.org/works?filter=year:2020";
      const url2 = "https://api.openalex.org/works?filter=year:2021";

      expect(areUrlsEquivalentForCaching(url1, url2)).toBe(false);
    });

    it("should handle malformed URLs gracefully", () => {
      const validUrl = "https://api.openalex.org/works?filter=year:2020";
      const invalidUrl = "not-a-url";

      expect(areUrlsEquivalentForCaching(validUrl, invalidUrl)).toBe(false);
      expect(areUrlsEquivalentForCaching(invalidUrl, validUrl)).toBe(false);
    });

    it("should handle complex real-world URL comparisons", () => {
      const url1 =
        "https://api.openalex.org/works?filter=institutions.country_code:us&sort=cited_by_count:desc&api_key=secret&mailto=test@domain.org";
      const url2 =
        "https://api.openalex.org/works?mailto=different@email.com&sort=cited_by_count:desc&filter=institutions.country_code:us&api_key=different";

      expect(areUrlsEquivalentForCaching(url1, url2)).toBe(true);
    });
  });
});

describe("Index Format Adapters", () => {
  describe("directoryIndexToUnifiedIndex", () => {
    it("should convert DirectoryIndex to UnifiedIndex format", async () => {
      const { directoryIndexToUnifiedIndex } = await import(
        "./cache-utilities.js"
      );

      const dirIndex = {
        lastUpdated: "2023-01-01T00:00:00Z",
        files: {
          "filter=doi:10.1234/test": {
            url: "https://api.openalex.org/works?filter=doi:10.1234/test",
            $ref: "./filter=doi:10.1234/test.json",
            lastRetrieved: "2023-01-01T00:00:00Z",
            contentHash: "abc123",
          },
        },
      };

      const unified = directoryIndexToUnifiedIndex(dirIndex);

      expect(unified).toEqual({
        "https://api.openalex.org/works?filter=doi:10.1234/test": {
          $ref: "./filter=doi:10.1234/test.json",
          lastModified: "2023-01-01T00:00:00Z",
          contentHash: "abc123",
        },
      });
    });

    it("should handle DirectoryIndex with no files", async () => {
      const { directoryIndexToUnifiedIndex } = await import(
        "./cache-utilities.js"
      );

      const dirIndex = {
        lastUpdated: "2023-01-01T00:00:00Z",
      };

      const unified = directoryIndexToUnifiedIndex(dirIndex);
      expect(unified).toEqual({});
    });
  });

  describe("unifiedIndexToDirectoryIndex", () => {
    it("should convert UnifiedIndex to DirectoryIndex format", async () => {
      const { unifiedIndexToDirectoryIndex } = await import(
        "./cache-utilities.js"
      );

      const unified = {
        "https://api.openalex.org/works?filter=doi:10.1234/test": {
          $ref: "./filter=doi:10.1234/test.json",
          lastModified: "2023-01-01T00:00:00Z",
          contentHash: "abc123",
        },
      };

      const dirIndex = unifiedIndexToDirectoryIndex(unified);

      expect(dirIndex.files).toBeTruthy();
      expect(dirIndex.files!["filter=doi:10.1234/test"]).toEqual({
        url: "https://api.openalex.org/works?filter=doi:10.1234/test",
        $ref: "./filter=doi:10.1234/test.json",
        lastRetrieved: "2023-01-01T00:00:00Z",
        contentHash: "abc123",
      });
      expect(dirIndex.lastUpdated).toBeTruthy();
    });
  });

  describe("isUnifiedIndex", () => {
    it("should identify valid UnifiedIndex format", async () => {
      const { isUnifiedIndex } = await import("./cache-utilities.js");

      const unified = {
        "https://api.openalex.org/works?filter=doi:10.1234/test": {
          $ref: "./data.json",
          lastModified: "2023-01-01T00:00:00Z",
          contentHash: "abc123",
        },
      };

      expect(isUnifiedIndex(unified)).toBe(true);
    });

    it("should reject DirectoryIndex format", async () => {
      const { isUnifiedIndex } = await import("./cache-utilities.js");

      const dirIndex = {
        lastUpdated: "2023-01-01T00:00:00Z",
        files: {},
      };

      expect(isUnifiedIndex(dirIndex)).toBe(false);
    });
  });

  describe("isDirectoryIndex", () => {
    it("should identify valid DirectoryIndex format", async () => {
      const { isDirectoryIndex } = await import("./cache-utilities.js");

      const dirIndex = {
        lastUpdated: "2023-01-01T00:00:00Z",
        files: {},
      };

      expect(isDirectoryIndex(dirIndex)).toBe(true);
    });

    it("should reject UnifiedIndex format", async () => {
      const { isDirectoryIndex } = await import("./cache-utilities.js");

      const unified = {
        "https://api.openalex.org/works": {
          $ref: "./data.json",
          lastModified: "2023-01-01T00:00:00Z",
          contentHash: "abc123",
        },
      };

      expect(isDirectoryIndex(unified)).toBe(false);
    });
  });

  describe("readIndexAsUnified", () => {
    it("should pass through UnifiedIndex unchanged", async () => {
      const { readIndexAsUnified } = await import("./cache-utilities.js");

      const unified = {
        "https://api.openalex.org/works": {
          $ref: "./data.json",
          lastModified: "2023-01-01T00:00:00Z",
          contentHash: "abc123",
        },
      };

      const result = readIndexAsUnified(unified);
      expect(result).toEqual(unified);
    });

    it("should convert DirectoryIndex to UnifiedIndex", async () => {
      const { readIndexAsUnified } = await import("./cache-utilities.js");

      const dirIndex = {
        lastUpdated: "2023-01-01T00:00:00Z",
        files: {
          data: {
            url: "https://api.openalex.org/works",
            $ref: "./data.json",
            lastRetrieved: "2023-01-01T00:00:00Z",
            contentHash: "abc123",
          },
        },
      };

      const result = readIndexAsUnified(dirIndex);
      expect(result).toEqual({
        "https://api.openalex.org/works": {
          $ref: "./data.json",
          lastModified: "2023-01-01T00:00:00Z",
          contentHash: "abc123",
        },
      });
    });

    it("should return null for unknown formats", async () => {
      const { readIndexAsUnified } = await import("./cache-utilities.js");

      expect(readIndexAsUnified(null)).toBe(null);
      expect(readIndexAsUnified("invalid")).toBe(null);
    });
  });

  describe("readIndexAsDirectory", () => {
    it("should pass through DirectoryIndex unchanged", async () => {
      const { readIndexAsDirectory } = await import("./cache-utilities.js");

      const dirIndex = {
        lastUpdated: "2023-01-01T00:00:00Z",
        files: {},
      };

      const result = readIndexAsDirectory(dirIndex);
      expect(result).toEqual(dirIndex);
    });

    it("should convert UnifiedIndex to DirectoryIndex", async () => {
      const { readIndexAsDirectory } = await import("./cache-utilities.js");

      const unified = {
        "https://api.openalex.org/works": {
          $ref: "./data.json",
          lastModified: "2023-01-01T00:00:00Z",
          contentHash: "abc123",
        },
      };

      const result = readIndexAsDirectory(unified);
      expect(result?.files?.data).toEqual({
        url: "https://api.openalex.org/works",
        $ref: "./data.json",
        lastRetrieved: "2023-01-01T00:00:00Z",
        contentHash: "abc123",
      });
    });
  });
});
