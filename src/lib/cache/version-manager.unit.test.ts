/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
	getCurrentAppVersion,
	getCurrentBuildInfo,
	createAppMetadata,
	isVersionChange,
	shouldInvalidateCache,
	logVersionComparison,
	type AppMetadata
} from "./version-manager";
import * as buildInfoModule from "@/lib/build-info";

// Mock the build info module
vi.mock("@/lib/build-info");

const mockGetBuildInfo = vi.mocked(buildInfoModule.getBuildInfo);

// Mock logger
vi.mock("@/lib/logger", () => ({
	logger: {
		info: vi.fn(),
		warn: vi.fn(),
		error: vi.fn(),
		debug: vi.fn(),
	},
	logError: vi.fn(),
}));

describe("Version Manager", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("getCurrentAppVersion", () => {
		it("should return version from build info", () => {
			mockGetBuildInfo.mockReturnValue({
				version: "1.2.3",
				buildTimestamp: "2023-01-01T00:00:00.000Z",
				commitHash: "abc123",
				shortCommitHash: "abc123",
				commitTimestamp: "2023-01-01T00:00:00.000Z",
				branchName: "main",
				repositoryUrl: "https://github.com/test/repo"
			});

			expect(getCurrentAppVersion()).toBe("1.2.3");
		});

		it("should return 'dev' when build info throws", () => {
			mockGetBuildInfo.mockImplementation(() => {
				throw new Error("Build info not available");
			});

			expect(getCurrentAppVersion()).toBe("dev");
		});
	});

	describe("getCurrentBuildInfo", () => {
		it("should return build info when available", () => {
			const mockBuildInfo = {
				version: "1.2.3",
				buildTimestamp: "2023-01-01T00:00:00.000Z",
				commitHash: "abc123",
				shortCommitHash: "abc123",
				commitTimestamp: "2023-01-01T00:00:00.000Z",
				branchName: "main",
				repositoryUrl: "https://github.com/test/repo"
			};

			mockGetBuildInfo.mockReturnValue(mockBuildInfo);

			expect(getCurrentBuildInfo()).toEqual(mockBuildInfo);
		});

		it("should return null when build info throws", () => {
			mockGetBuildInfo.mockImplementation(() => {
				throw new Error("Build info not available");
			});

			expect(getCurrentBuildInfo()).toBeNull();
		});
	});

	describe("createAppMetadata", () => {
		it("should create metadata with current version and build info", () => {
			const mockBuildInfo = {
				version: "1.2.3",
				buildTimestamp: "2023-01-01T00:00:00.000Z",
				commitHash: "abc123def",
				shortCommitHash: "abc123",
				commitTimestamp: "2023-01-01T00:00:00.000Z",
				branchName: "main",
				repositoryUrl: "https://github.com/test/repo"
			};

			mockGetBuildInfo.mockReturnValue(mockBuildInfo);

			const metadata = createAppMetadata();

			expect(metadata.version).toBe("1.2.3");
			expect(metadata.buildTimestamp).toBe("2023-01-01T00:00:00.000Z");
			expect(metadata.commitHash).toBe("abc123def");
			expect(metadata.lastCacheInvalidation).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/);
			expect(metadata.installationTime).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/);
		});

		it("should handle missing build info gracefully", () => {
			mockGetBuildInfo.mockReturnValue(null);

			const metadata = createAppMetadata();

			expect(metadata.version).toBe("dev");
			expect(metadata.buildTimestamp).toBeUndefined();
			expect(metadata.commitHash).toBeUndefined();
		});
	});

	describe("isVersionChange", () => {
		it("should detect version changes", () => {
			expect(isVersionChange("1.0.0", "1.0.1")).toBe(true);
			expect(isVersionChange("1.0.0", "2.0.0")).toBe(true);
			expect(isVersionChange("dev", "1.0.0")).toBe(true);
		});

		it("should not detect same versions", () => {
			expect(isVersionChange("1.0.0", "1.0.0")).toBe(false);
			expect(isVersionChange("dev", "dev")).toBe(false);
		});

		it("should always detect changes involving dev versions", () => {
			expect(isVersionChange("dev", "1.0.0")).toBe(true);
			expect(isVersionChange("1.0.0", "dev")).toBe(true);
			expect(isVersionChange("dev", "dev")).toBe(false);
		});
	});

	describe("shouldInvalidateCache", () => {
		it("should invalidate when no stored metadata", () => {
			const result = shouldInvalidateCache(null, "1.0.0");

			expect(result.shouldInvalidate).toBe(true);
			expect(result.reason).toContain("No stored version metadata");
		});

		it("should invalidate when version changes", () => {
			const storedMetadata: AppMetadata = {
				version: "1.0.0",
				lastCacheInvalidation: "2023-01-01T00:00:00.000Z",
				installationTime: "2023-01-01T00:00:00.000Z"
			};

			const result = shouldInvalidateCache(storedMetadata, "1.0.1");

			expect(result.shouldInvalidate).toBe(true);
			expect(result.reason).toContain("Version changed from 1.0.0 to 1.0.1");
		});

		it("should not invalidate when version is same", () => {
			const storedMetadata: AppMetadata = {
				version: "1.0.0",
				lastCacheInvalidation: "2023-01-01T00:00:00.000Z",
				installationTime: "2023-01-01T00:00:00.000Z"
			};

			const result = shouldInvalidateCache(storedMetadata, "1.0.0");

			expect(result.shouldInvalidate).toBe(false);
		});

		it("should invalidate for dev version with different commit hash", () => {
			mockGetBuildInfo.mockReturnValue({
				version: "dev",
				buildTimestamp: "2023-01-01T00:00:00.000Z",
				commitHash: "newcommit123",
				shortCommitHash: "newcom",
				commitTimestamp: "2023-01-01T00:00:00.000Z",
				branchName: "feature",
				repositoryUrl: "https://github.com/test/repo"
			});

			const storedMetadata: AppMetadata = {
				version: "dev",
				commitHash: "oldcommit456",
				lastCacheInvalidation: "2023-01-01T00:00:00.000Z",
				installationTime: "2023-01-01T00:00:00.000Z"
			};

			const result = shouldInvalidateCache(storedMetadata, "dev");

			expect(result.shouldInvalidate).toBe(true);
			expect(result.reason).toContain("Development build commit changed");
		});

		it("should not invalidate for dev version with same commit hash", () => {
			mockGetBuildInfo.mockReturnValue({
				version: "dev",
				buildTimestamp: "2023-01-01T00:00:00.000Z",
				commitHash: "samecommit123",
				shortCommitHash: "samecom",
				commitTimestamp: "2023-01-01T00:00:00.000Z",
				branchName: "feature",
				repositoryUrl: "https://github.com/test/repo"
			});

			const storedMetadata: AppMetadata = {
				version: "dev",
				commitHash: "samecommit123",
				lastCacheInvalidation: "2023-01-01T00:00:00.000Z",
				installationTime: "2023-01-01T00:00:00.000Z"
			};

			const result = shouldInvalidateCache(storedMetadata, "dev");

			expect(result.shouldInvalidate).toBe(false);
		});

		it("should handle missing commit hashes gracefully", () => {
			mockGetBuildInfo.mockReturnValue({
				version: "dev",
				buildTimestamp: "2023-01-01T00:00:00.000Z",
				commitHash: "abc123",
				shortCommitHash: "abc123",
				commitTimestamp: "2023-01-01T00:00:00.000Z",
				branchName: "feature",
				repositoryUrl: "https://github.com/test/repo"
			});

			const storedMetadata: AppMetadata = {
				version: "dev",
				// No commitHash in stored metadata
				lastCacheInvalidation: "2023-01-01T00:00:00.000Z",
				installationTime: "2023-01-01T00:00:00.000Z"
			};

			const result = shouldInvalidateCache(storedMetadata, "dev");

			expect(result.shouldInvalidate).toBe(false);
		});
	});

	describe("logVersionComparison", () => {
		it("should log warning for invalidation", async () => {
			const loggerModule = await import("@/lib/logger");

			const storedMetadata: AppMetadata = {
				version: "1.0.0",
				commitHash: "oldcommit",
				lastCacheInvalidation: "2023-01-01T00:00:00.000Z",
				installationTime: "2023-01-01T00:00:00.000Z"
			};

			mockGetBuildInfo.mockReturnValue({
				version: "1.0.1",
				buildTimestamp: "2023-01-01T00:00:00.000Z",
				commitHash: "newcommit",
				shortCommitHash: "newcom",
				commitTimestamp: "2023-01-01T00:00:00.000Z",
				branchName: "main",
				repositoryUrl: "https://github.com/test/repo"
			});

			logVersionComparison(storedMetadata, "1.0.1", true, "Test reason");

			expect(loggerModule.logger.warn).toHaveBeenCalledWith(
				"cache",
				"Cache invalidation triggered by version change",
				expect.objectContaining({
					oldVersion: "1.0.0",
					newVersion: "1.0.1",
					reason: "Test reason",
					oldCommit: "oldcomm",
					newCommit: "newcomm"
				})
			);
		});

		it("should log info for preserved cache", async () => {
			const loggerModule = await import("@/lib/logger");

			logVersionComparison(null, "1.0.0", false);

			expect(loggerModule.logger.debug).toHaveBeenCalledWith(
				"cache",
				"Version check passed - cache preserved",
				expect.objectContaining({
					version: "1.0.0"
				})
			);
		});
	});
});