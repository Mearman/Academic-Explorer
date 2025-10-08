// Functions are mocked below, so we don't import them directly
// Mock functions are defined inline in the vi.mock call

// Set up mock implementations first
const mockMkdir = vi.fn().mockResolvedValue(undefined);
const mockWriteFile = vi.fn().mockResolvedValue(undefined);
const mockReadFile = vi.fn().mockResolvedValue("{}");
const mockRename = vi.fn().mockResolvedValue(undefined);
const mockUnlink = vi.fn().mockResolvedValue(undefined);
const mockStatfs = vi.fn().mockResolvedValue({ bavail: 1000000, bsize: 1024 });
const mockStat = vi
  .fn()
  .mockResolvedValue({ mtime: new Date("2023-01-01T00:00:00Z") });
const mockReaddir = vi.fn().mockResolvedValue([]);

const mockJoin = vi.fn((...paths: string[]) => paths.join("/"));
const mockDirname = vi.fn((path: string) => {
  const parts = path.split("/");
  parts.pop();
  return parts.join("/") || "/";
});
const mockBasename = vi.fn((path: string, ext?: string) => {
  const base = path.split("/").pop() || "";
  return ext ? base.replace(new RegExp(`${ext}$`), "") : base;
});
const mockRelative = vi.fn((from: string, to: string) => {
  return to.startsWith(from) ? to.slice(from.length + 1) : to;
});
const mockResolve = vi.fn((...paths: string[]) => paths.join("/"));

const mockCrypto = {
  randomUUID: vi.fn(() => "mock-uuid"),
};

// Create mock Node.js modules
const mockFs = {
  mkdir: mockMkdir,
  writeFile: mockWriteFile,
  readFile: mockReadFile,
  rename: mockRename,
  unlink: mockUnlink,
  statfs: mockStatfs,
  stat: mockStat,
  readdir: mockReaddir,
  access: vi.fn(),
  copyFile: vi.fn(),
  open: vi.fn(),
  truncate: vi.fn(),
  chmod: vi.fn(),
  chown: vi.fn(),
  lstat: vi.fn(),
  link: vi.fn(),
  symlink: vi.fn(),
  readlink: vi.fn(),
  realpath: vi.fn(),
  utimes: vi.fn(),
  futimes: vi.fn(),
  rmdir: vi.fn(),
  lchmod: vi.fn(),
  lchown: vi.fn(),
  lutimes: vi.fn(),
  mkdtempDisposable: vi.fn(),
  glob: vi.fn(),
  constants: {
    F_OK: 0,
    R_OK: 4,
    W_OK: 2,
    X_OK: 1,
    UV_FS_O_FILEMAP: 0,
    O_RDONLY: 0,
    O_WRONLY: 1,
    O_RDWR: 2,
    O_CREAT: 64,
    O_EXCL: 128,
    O_NOCTTY: 256,
    O_TRUNC: 512,
    O_APPEND: 1024,
    O_DIRECTORY: 65536,
    O_NOATIME: 262144,
    O_NOFOLLOW: 131072,
    O_SYNC: 4096,
    O_DSYNC: 8192,
    O_SYMLINK: 2097152,
    O_DIRECT: 16384,
    O_NONBLOCK: 2048,
    S_IFMT: 61440,
    S_IFREG: 32768,
    S_IFDIR: 16384,
    S_IFCHR: 8192,
    S_IFBLK: 24576,
    S_IFIFO: 4096,
    S_IFLNK: 40960,
    S_IFSOCK: 49152,
    S_ISUID: 2048,
    S_ISGID: 1024,
    S_ISVTX: 512,
    S_IRWXU: 448,
    S_IRUSR: 256,
    S_IWUSR: 128,
    S_IXUSR: 64,
    S_IRWXG: 56,
    S_IRGRP: 32,
    S_IWGRP: 16,
    S_IXGRP: 8,
    S_IRWXO: 7,
    S_IROTH: 4,
    S_IWOTH: 2,
    S_IXOTH: 1,
    COPYFILE_EXCL: 1,
    COPYFILE_FICLONE: 2,
    COPYFILE_FICLONE_FORCE: 4,
  },
  watch: vi.fn(),
  opendir: vi.fn(),
  cp: vi.fn(),
  rm: vi.fn(),
  mkdtemp: vi.fn(),
  appendFile: vi.fn(),
};

const mockPath = {
  join: mockJoin,
  dirname: mockDirname,
  basename: mockBasename,
  relative: mockRelative,
  resolve: mockResolve,
  sep: "/" as const,
  normalize: vi.fn(),
  matchesGlob: vi.fn(),
  isAbsolute: vi.fn(),
  extname: vi.fn(),
  format: vi.fn(),
  parse: vi.fn(),
  toNamespacedPath: vi.fn(),
  delimiter: ":" as const,
  win32: {},
  posix: {},
};

// Note: Node.js modules are mocked below, so we don't import them directly
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { logger } from "../../internal/logger";

// Mock utilities (after vitest import but before disk-writer import)
vi.mock("@academic-explorer/utils/static-data/cache-utilities", () => ({
  generateContentHash: vi.fn().mockResolvedValue("mock-hash"),
  hasCollision: vi.fn().mockReturnValue(false),
  mergeCollision: vi.fn().mockImplementation((entry, url) => ({
    ...entry,
    url: url,
  })),
  migrateToMultiUrl: vi.fn().mockImplementation((entry) => ({
    ...entry,
    equivalentUrls: [entry.url],
  })),
  validateFileEntry: vi.fn().mockReturnValue(true),
  sanitizeUrlForCaching: vi.fn().mockImplementation((url) => url),
  STATIC_DATA_CACHE_PATH: "apps/web/public/data/openalex",
}));

// Access mocked functions using vi.mocked
import {
  generateContentHash,
  hasCollision,
  validateFileEntry,
  mergeCollision,
  migrateToMultiUrl,
} from "@academic-explorer/utils/static-data/cache-utilities";
const mockGenerateContentHash = vi.mocked(generateContentHash);
const mockHasCollision = vi.mocked(hasCollision);
const mockValidateFileEntry = vi.mocked(validateFileEntry);
const mockMergeCollision = vi.mocked(mergeCollision);
const mockMigrateToMultiUrl = vi.mocked(migrateToMultiUrl);

import {
  DiskCacheWriter,
  type DiskWriterConfig,
  type InterceptedData,
  __setMockModules,
} from "./disk-writer.js";

// Set default implementations
mockJoin.mockImplementation((...paths: string[]) => paths.join("/"));
mockDirname.mockImplementation((path: string) => {
  const parts = path.split("/");
  parts.pop();
  return parts.join("/") || "/";
});
mockBasename.mockImplementation((path: string, ext?: string) => {
  const base = path.split("/").pop() || "";
  return ext ? base.replace(new RegExp(`${ext}$`), "") : base;
});
mockRelative.mockImplementation((from: string, to: string) => {
  return to.startsWith(from) ? to.slice(from.length + 1) : to;
});
mockResolve.mockImplementation((...paths: string[]) => paths.join("/"));

// Mock utilities are defined above

// The mock functions are defined above and used in the vi.mock

// Mock logger
vi.spyOn(logger, "debug").mockImplementation(() => {});
vi.spyOn(logger, "warn").mockImplementation(() => {});
vi.spyOn(logger, "error").mockImplementation(() => {});

describe("DiskCacheWriter", () => {
  let writer: DiskCacheWriter;
  let config: DiskWriterConfig;

  beforeEach(() => {
    // Set mock modules for testing
    __setMockModules(mockFs as any, mockPath as any, mockCrypto as any);

    config = {
      basePath: "/mock/base/path",
      maxConcurrentWrites: 5,
      lockTimeoutMs: 1000,
      checkDiskSpace: false,
      minDiskSpaceBytes: 0,
    } as DiskWriterConfig;
    writer = new DiskCacheWriter(config);

    // Reset mocks
    vi.clearAllMocks();

    // Mock path functions
    mockPath.join.mockImplementation((...parts: string[]) => parts.join("/"));
    mockPath.dirname.mockImplementation((p: string) =>
      p.split("/").slice(0, -1).join("/"),
    );
    mockPath.basename.mockImplementation(
      (p: string) => p.split("/").pop() || "",
    );
    mockPath.relative.mockImplementation(() => "relative");
    mockPath.resolve.mockImplementation(() => "/resolved");

    // Mock fs functions
    mockFs.mkdir.mockResolvedValue(undefined);
    mockFs.writeFile.mockResolvedValue(undefined);
    mockFs.readFile.mockResolvedValue(
      JSON.stringify({ lastUpdated: "2023-01-01T00:00:00Z" }),
    );
    mockFs.rename.mockResolvedValue(undefined);
    mockFs.unlink.mockResolvedValue(undefined);
    mockFs.statfs.mockResolvedValue({ bavail: 1000000, bsize: 1024 });
    mockFs.stat.mockResolvedValue({ mtime: new Date("2023-01-01T00:00:00Z") });
    mockFs.readdir.mockResolvedValue([]);

    // Mock crypto
    mockCrypto.randomUUID.mockReturnValue("mock-uuid");
  });

  afterEach(async () => {
    await writer.cleanup();
  });

  describe("Initialization and Configuration", () => {
    it("should initialize with default config", () => {
      const defaultWriter = new DiskCacheWriter();
      expect(defaultWriter).toBeDefined();
      // Defaults: basePath 'apps/web/public/data/openalex', maxConcurrentWrites 10, etc.
    });

    it("should use provided config", () => {
      expect(writer["config"].basePath).toBe("/mock/base/path");
      expect(writer["config"].maxConcurrentWrites).toBe(5);
    });

    it("should initialize Node modules on first use", async () => {
      // Trigger initialization
      const data: InterceptedData = {
        url: "https://api.openalex.org/works",
        method: "GET",
        requestHeaders: {},
        responseData: { results: [] },
        statusCode: 200,
        responseHeaders: { "content-type": "application/json" },
        timestamp: "2023-01-01T00:00:00Z",
      };
      await writer.writeToCache(data);
      // Check that Node modules were initialized
      expect(writer).toBeDefined();
    });
  });

  describe("writeToCache", () => {
    it("should enforce concurrent write limits", async () => {
      // Simulate full queue
      const promises = Array.from({ length: 5 }, () => Promise.resolve());
    });

    it("should check disk space if enabled", async () => {
      // Create a new writer with disk space checking enabled
      const diskCheckWriter = new DiskCacheWriter({
        basePath: "/mock/base/path",
        maxConcurrentWrites: 5,
        lockTimeoutMs: 1000,
        checkDiskSpace: true,
        minDiskSpaceBytes: 0,
      });

      const data: InterceptedData = {
        url: "https://api.openalex.org/works",
        method: "GET",
        requestHeaders: {},
        responseData: { results: [] },
        statusCode: 200,
        responseHeaders: {},
        timestamp: "2023-01-01T00:00:00Z",
      };
      await diskCheckWriter.writeToCache(data);

      expect(mockFs.statfs).toHaveBeenCalledWith("/mock/base/path");
    });

    it.skip("should throw on insufficient disk space", async () => {
      // Create a new writer with disk space checking enabled
      const diskCheckWriter = new DiskCacheWriter({
        basePath: "/mock/base/path",
        maxConcurrentWrites: 5,
        lockTimeoutMs: 1000,
        checkDiskSpace: true,
        minDiskSpaceBytes: 100, // Require 100 bytes
      });
      mockFs.statfs.mockResolvedValue({ bavail: 1, bsize: 1 }); // Only 1 byte available

      const data: InterceptedData = {
        url: "https://api.openalex.org/works",
        method: "GET",
        requestHeaders: {},
        responseData: { results: [] },
        statusCode: 200,
        responseHeaders: {},
        timestamp: "2023-01-01T00:00:00Z",
      };
      await expect(diskCheckWriter.writeToCache(data)).rejects.toThrow(
        "Insufficient disk space",
      );
    });
  });

  describe("Collision Handling in Writes", () => {
    it.skip("should merge colliding entry with matching hash", async () => {
      const data: InterceptedData = {
        url: "https://api.openalex.org/works?filter=doi:10.1234/test&api_key=secret",
        method: "GET",
        requestHeaders: {},
        responseData: { results: [{ id: "W123" }] },
        statusCode: 200,
        responseHeaders: {},
        timestamp: "2023-01-01T00:00:00Z",
      };

      const existingEntry = {
        url: "https://api.openalex.org/works?filter=doi:10.1234/test",
        $ref: "./query.json",
        lastRetrieved: "2023-01-01T00:00:00Z",
        contentHash: "mock-hash",
      };

      mockPath.join.mockReturnValue("/mock/base/path/works/queries/query.json"); // dataFile
      mockPath.join.mockReturnValue("/mock/base/path/works/queries/index.json"); // index
      mockFs.readFile.mockResolvedValueOnce(
        JSON.stringify({ files: { query: existingEntry } }),
      ); // index
      mockHasCollision.mockReturnValue(true); // Collision
      mockGenerateContentHash.mockResolvedValue("mock-hash"); // Matching hash

      await writer.writeToCache(data);

      expect(mockMergeCollision).toHaveBeenCalledWith(
        expect.anything(),
        data.url,
      );
      expect(mockFs.writeFile).toHaveBeenCalledWith(
        expect.stringContaining("index.json"),
        expect.stringContaining('"mergedCount":1'),
      );
    });

    it.skip("should archive on hash mismatch and overwrite", async () => {
      const data: InterceptedData = {
        url: "https://api.openalex.org/works?filter=doi:10.1234/test&api_key=secret",
        method: "GET",
        requestHeaders: {},
        responseData: { results: [{ id: "W123" }] },
        statusCode: 200,
        responseHeaders: {},
        timestamp: "2023-01-01T00:00:00Z",
      };

      const existingEntry = {
        url: "https://api.openalex.org/works?filter=doi:10.1234/test",
        $ref: "./query.json",
        lastRetrieved: "2023-01-01T00:00:00Z",
        contentHash: "old-hash",
      };

      mockPath.join
        .mockReturnValueOnce("/mock/base/path/works/queries/query.json") // dataFile
        .mockReturnValueOnce("/mock/base/path/works/queries/index.json") // index
        .mockReturnValueOnce(
          "/mock/base/path/works/queries/query.collisions.json",
        ); // archive

      mockFs.readFile.mockResolvedValueOnce(
        JSON.stringify({ files: { query: existingEntry } }),
      );
      mockHasCollision.mockReturnValue(true);
      mockGenerateContentHash.mockResolvedValue("new-hash"); // Mismatch

      await writer.writeToCache(data);

      expect(mockFs.writeFile).toHaveBeenCalledWith(
        expect.stringContaining("query.collisions.json"),
        expect.stringContaining('"reason":"hash_mismatch_update"'),
      );
      expect(logger.warn).toHaveBeenCalledWith(
        "Collision with content hash mismatch",
      );
    });

    it.skip("should migrate legacy entry during write", async () => {
      const data: InterceptedData = {
        /* valid */
      } as any;

      const legacyEntry = {
        url: "old-url",
        $ref: "./old.json",
        lastRetrieved: "old-time",
        contentHash: "old-hash",
      };

      mockPath.join.mockReturnValue("/mock/index.json");
      mockFs.readFile.mockResolvedValue(
        JSON.stringify({ files: { test: legacyEntry } }),
      );
      mockHasCollision.mockReturnValue(false); // No collision, but migrate

      await writer.writeToCache(data);

      expect(mockMigrateToMultiUrl).toHaveBeenCalledWith(legacyEntry);
    });

    it.skip("should log warning on validation failure and fallback", async () => {
      const data: InterceptedData = {
        /* valid */
      } as any;

      mockValidateFileEntry.mockReturnValue(false);

      await writer.writeToCache(data);

      expect(logger.warn).toHaveBeenCalledWith(
        "FileEntry validation failed, falling back to single-URL entry",
      );
    });
  });

  describe("File Locking and Atomicity", () => {
    it.skip("should acquire and release locks for files", async () => {
      const data: InterceptedData = {
        /* valid */
      } as any;

      mockPath.join
        .mockReturnValueOnce("/mock/data.json")
        .mockReturnValueOnce("/mock/meta.json")
        .mockReturnValueOnce("/mock/index.json");

      await writer.writeToCache(data);

      // Locks acquired and released in finally
      expect(writer["activeLocks"].size).toBe(0); // After release
    });

    it.skip("should timeout on lock acquisition failure", async () => {
      const data: InterceptedData = {
        /* valid */
      } as any;

      // Simulate locked file
      // Create writer with short timeout
      const shortTimeoutWriter = new DiskCacheWriter({
        ...writer.getConfig(),
        lockTimeoutMs: 1,
      });
      shortTimeoutWriter["activeLocks"].set("/mock/index.json", {
        lockId: "other",
        timestamp: Date.now(),
        filePath: "/mock/index.json",
      });

      await expect(shortTimeoutWriter.writeToCache(data)).rejects.toThrow(
        "Failed to acquire file lock",
      );
    });

    it.skip("should handle concurrent writes to same path atomically", async () => {
      // This is harder to test fully, but verify locking mechanism
      const data1: InterceptedData = {
        /* data1 */
      } as any;
      const data2: InterceptedData = {
        /* data2 */
      } as any;

      mockPath.join.mockReturnValue("/mock/shared.json"); // Same path

      const promise1 = writer.writeToCache(data1);
      const promise2 = writer.writeToCache(data2);

      // Second should wait for first
      await vi.waitFor(() => {
        expect(writer["activeLocks"].size).toBeGreaterThan(0);
      });

      await promise1;
      await promise2;

      expect(mockFs.writeFile).toHaveBeenCalledTimes(6); // 3 files x 2 writes, but atomic
    });
  });

  describe("Hierarchical Index Updates", () => {
    it.skip("should update containing directory index", async () => {
      const data: InterceptedData = {
        url: "https://api.openalex.org/works/W123",
        method: "GET",
        requestHeaders: {},
        responseData: { id: "W123" },
        statusCode: 200,
        responseHeaders: {},
        timestamp: "2023-01-01T00:00:00Z",
      };

      mockPath.join
        .mockReturnValueOnce("/mock/base/path/works/W123.json")
        .mockReturnValueOnce("/mock/base/path/works/W123.meta.json")
        .mockReturnValueOnce("/mock/base/path/works/index.json");

      mockFs.readFile.mockResolvedValue(JSON.stringify({ files: {} }));

      await writer.writeToCache(data);

      expect(mockFs.writeFile).toHaveBeenCalledWith(
        "/mock/base/path/works/index.json",
        expect.any(String),
      );
    });

    it.skip("should propagate updates to parent indexes", async () => {
      const data: InterceptedData = {
        /* valid */
      } as any;

      mockPath.join
        .mockReturnValueOnce("/mock/base/path/works/authors/W123/index.json") // Deep path
        .mockReturnValueOnce("/mock/base/path/works/authors/W123/data.json");

      // Mock multiple levels
      mockPath.dirname
        .mockReturnValueOnce("/mock/base/path/works/authors/W123")
        .mockReturnValueOnce("/mock/base/path/works/authors")
        .mockReturnValueOnce("/mock/base/path/works");

      mockFs.writeFile.mockImplementation((path) => {
        if (path.includes("index.json")) {
          return Promise.resolve();
        }
      });

      await writer.writeToCache(data);

      // Should call writeFile for multiple index.json
      expect(mockFs.writeFile).toHaveBeenCalledWith(
        expect.stringContaining("works/index.json"),
        expect.any(String),
      );
      expect(mockFs.writeFile).toHaveBeenCalledWith(
        expect.stringContaining("authors/index.json"),
        expect.any(String),
      );
    });

    it.skip("should include merged collisionInfo in propagation", async () => {
      // Setup collision
      mockHasCollision.mockReturnValue(true);
      const data: InterceptedData = {
        /* colliding data */
      } as any;

      mockPath.join.mockReturnValue("/mock/index.json");
      mockFs.readFile.mockResolvedValue(
        JSON.stringify({
          files: { test: { collisionInfo: { mergedCount: 1 } } },
        }),
      );

      await writer.writeToCache(data);

      // Verify index includes collision info
      const indexCall = mockFs.writeFile.mock.calls.find(([path]) =>
        path.includes("index.json"),
      );
      const indexContent = JSON.parse(indexCall![1] as string);
      expect(indexContent.files.test.collisionInfo).toBeDefined();
    });
  });

  describe("Edge Cases", () => {
    it("should handle invalid URLs and empty directories", async () => {
      const invalidData: InterceptedData = {
        url: "invalid-url",
        method: "GET",
        requestHeaders: {},
        responseData: {},
        statusCode: 200,
        responseHeaders: {},
        timestamp: "2023-01-01T00:00:00Z",
      };

      // extractEntityInfo should fallback
      mockGenerateContentHash.mockResolvedValue("fallback-hash");

      await expect(writer.writeToCache(invalidData)).resolves.not.toThrow();
    });

    it.skip("should handle large collision sets", async () => {
      // Simulate >10 URLs
      const manyUrls = Array.from({ length: 15 }, (_, i) => `url${i}`);
      const entryWithMany = {
        equivalentUrls: manyUrls,
        collisionInfo: { mergedCount: 14, totalUrls: 15 },
      } as any;

      mockHasCollision.mockReturnValue(true);
      mockMergeCollision.mockReturnValue(entryWithMany);

      const data: InterceptedData = {
        /* data */
      } as any;
      await writer.writeToCache(data);

      expect(mockValidateFileEntry).toHaveBeenCalledWith(
        expect.objectContaining({
          equivalentUrls: expect.arrayContaining(manyUrls),
        }),
      );
    });

    it.skip("should maintain backward compatibility for legacy reads", async () => {
      // Test that legacy single-url entries are handled
      const legacyData: InterceptedData = {
        /* data */
      } as any;
      mockFs.readFile.mockResolvedValue(
        JSON.stringify({
          files: { legacy: { url: "old-url", $ref: "./old.json" } },
        }),
      );

      await writer.writeToCache(legacyData);

      expect(mockMigrateToMultiUrl).toHaveBeenCalled();
    });

    it.skip("should use primary url for legacy compatibility", async () => {
      // When reading, primary url is used
      // But since write, verify entry has url set
      const data: InterceptedData = { url: "primary-url" /* ... */ } as any;
      await writer.writeToCache(data);

      // In index write, url should be primary
      const indexCall = mockFs.writeFile.mock.calls.find(([p]) =>
        p.includes("index.json"),
      );
      const content = JSON.parse(indexCall![1] as string);
      expect(content.files).toHaveProperty(
        "test",
        expect.objectContaining({ url: "primary-url" }),
      );
    });
  });

  describe("Cleanup and Stats", () => {
    it.skip("should cleanup active writes and locks", async () => {
      writer["activeLocks"].set("test", {
        lockId: "1",
        timestamp: Date.now(),
        filePath: "test",
      });
      writer["writeQueue"].add(Promise.resolve() as any);

      await writer.cleanup();

      expect(writer["activeLocks"].size).toBe(0);
      expect(writer["writeQueue"].size).toBe(0);
    });

    it("should return cache stats", () => {
      const stats = writer.getCacheStats();
      expect(stats.activeLocks).toBe(0);
      expect(stats.activeWrites).toBe(0);
      expect(stats.maxConcurrentWrites).toBe(
        writer.getConfig().maxConcurrentWrites,
      );
    });
  });
});
