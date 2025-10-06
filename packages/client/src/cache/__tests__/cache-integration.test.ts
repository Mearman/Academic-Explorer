/**
 * Cache Integration Tests - CachedOpenAlexClient Integration
 *
 * Tests for the CachedOpenAlexClient that integrates static data caching
 * with multi-tier fallback to the OpenAlex API.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  CachedOpenAlexClient,
  type CachedClientConfig,
} from "../../cached-client";

// Mock the static data provider
vi.mock("../../internal/static-data-provider", () => ({
  staticDataProvider: {
    getStaticData: vi.fn(),
    hasStaticData: vi.fn(),
    getCacheStatistics: vi.fn(),
    clearCache: vi.fn(),
    getEnvironment: vi.fn(() => ({
      isDevelopment: false,
      isProduction: true,
      isTest: true,
    })),
  },
}));

// Mock the base client
vi.mock("../../client", () => ({
  OpenAlexBaseClient: class {
    constructor(config: any) {
      this.config = config;
    }
    config: any;
    async getById<T>(endpoint: string, id: string, params = {}): Promise<T> {
      throw new Error("API call failed");
    }
    updateConfig(config: any): void {
      // Mock implementation
    }
  },
}));

// Mock entity APIs
vi.mock("../../entities/works", () => ({
  WorksApi: class {
    constructor(client: any) {
      this.client = client;
    }
    client: any;
  },
}));

vi.mock("../../entities/authors", () => ({
  AuthorsApi: class {
    constructor(client: any) {
      this.client = client;
    }
    client: any;
  },
}));

vi.mock("../../entities/sources", () => ({
  SourcesApi: class {
    constructor(client: any) {
      this.client = client;
    }
    client: any;
  },
}));

vi.mock("../../entities/institutions", () => ({
  InstitutionsApi: class {
    constructor(client: any) {
      this.client = client;
    }
    client: any;
  },
}));

vi.mock("../../entities/topics", () => ({
  TopicsApi: class {
    constructor(client: any) {
      this.client = client;
    }
    client: any;
  },
}));

vi.mock("../../entities/publishers", () => ({
  PublishersApi: class {
    constructor(client: any) {
      this.client = client;
    }
    client: any;
  },
}));

vi.mock("../../entities/funders", () => ({
  FundersApi: class {
    constructor(client: any) {
      this.client = client;
    }
    client: any;
  },
}));

vi.mock("../../entities/keywords", () => ({
  KeywordsApi: class {
    constructor(client: any) {
      this.client = client;
    }
    client: any;
  },
}));

vi.mock("../../entities/text-analysis", () => ({
  TextAnalysisApi: class {
    constructor(client: any) {
      this.client = client;
    }
    client: any;
  },
}));

vi.mock("../../entities/concepts", () => ({
  ConceptsApi: class {
    constructor(client: any) {
      this.client = client;
    }
    client: any;
  },
}));

// Mock utils
vi.mock("../../internal/static-data-utils", () => ({
  toStaticEntityType: vi.fn((entityType: string) => entityType),
  cleanOpenAlexId: vi.fn((id: string) => id),
}));

vi.mock("@academic-explorer/utils", () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Import the mocked static data provider
import { staticDataProvider } from "../../internal/static-data-provider";

describe("Cache Integration - CachedOpenAlexClient", () => {
  let cachedClient: CachedOpenAlexClient;

  beforeEach(() => {
    vi.clearAllMocks();

    const config: CachedClientConfig = {
      staticCacheEnabled: true,
      staticCacheGitHubPagesUrl: "https://example.github.io",
      staticCacheLocalDir: "/tmp/cache",
    };

    cachedClient = new CachedOpenAlexClient(config);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("Client Configuration", () => {
    it("should initialize with static cache enabled", () => {
      expect(cachedClient).toBeInstanceOf(CachedOpenAlexClient);
      expect(cachedClient.staticCacheEnabled).toBe(true);
    });

    it("should have access to all entity APIs", () => {
      expect(cachedClient.client.works).toBeDefined();
      expect(cachedClient.client.authors).toBeDefined();
      expect(cachedClient.client.sources).toBeDefined();
      expect(cachedClient.client.institutions).toBeDefined();
      expect(cachedClient.client.topics).toBeDefined();
      expect(cachedClient.client.publishers).toBeDefined();
      expect(cachedClient.client.funders).toBeDefined();
      expect(cachedClient.client.keywords).toBeDefined();
      expect(cachedClient.client.textAnalysis).toBeDefined();
      expect(cachedClient.client.concepts).toBeDefined();
    });

    it("should have getEntity method", () => {
      expect(typeof cachedClient.client.getEntity).toBe("function");
    });
  });

  describe("Static Data Provider Integration", () => {
    it("should use static data provider for entity lookup", async () => {
      const testData = { id: "W123", title: "Test Work" };

      // Mock the static data provider to return test data
      staticDataProvider.getStaticData.mockResolvedValue({
        found: true,
        data: testData,
        tier: "memory",
        loadTime: 10,
      });

      // Call getEntity which should use the static data provider
      const result = await cachedClient.client.getEntity("W123");

      expect(staticDataProvider.getStaticData).toHaveBeenCalledWith(
        "works",
        "W123",
      );
      expect(result).toEqual(testData);
    });

    it("should fallback to API when static cache misses", async () => {
      const testData = { id: "W123", title: "API Work" };

      // Mock static cache miss
      staticDataProvider.getStaticData.mockResolvedValue({
        found: false,
        data: undefined,
      });

      // Mock API success
      const getByIdSpy = vi
        .spyOn(cachedClient, "getById")
        .mockResolvedValue(testData);

      const result = await cachedClient.client.getEntity("W123");

      expect(staticDataProvider.getStaticData).toHaveBeenCalledWith(
        "works",
        "W123",
      );
      expect(getByIdSpy).toHaveBeenCalledWith("works", "W123");
      expect(result).toEqual(testData);
    });

    it("should track request statistics", () => {
      const stats = cachedClient.getRequestStats();
      expect(stats).toBeDefined();
      expect(typeof stats.totalRequests).toBe("number");
      expect(typeof stats.cacheHits).toBe("number");
      expect(typeof stats.apiFallbacks).toBe("number");
      expect(typeof stats.errors).toBe("number");
    });

    it("should get static cache statistics", async () => {
      const mockStats = {
        totalRequests: 100,
        hits: 80,
        misses: 20,
        hitRate: 0.8,
        tierStats: {},
        bandwidthSaved: 1000,
        lastUpdated: Date.now(),
      };

      staticDataProvider.getCacheStatistics.mockResolvedValue(mockStats);

      const stats = await cachedClient.getStaticCacheStats();
      expect(stats).toEqual(mockStats);
    });
  });

  describe("Entity Type Detection", () => {
    it("should detect works entity type", async () => {
      staticDataProvider.getStaticData.mockResolvedValue({
        found: true,
        data: { id: "W123", title: "Work" },
      });

      await cachedClient.client.getEntity("W123");
      expect(staticDataProvider.getStaticData).toHaveBeenCalledWith(
        "works",
        "W123",
      );
    });

    it("should detect authors entity type", async () => {
      staticDataProvider.getStaticData.mockResolvedValue({
        found: true,
        data: { id: "A123", name: "Author" },
      });

      await cachedClient.client.getEntity("A123");
      expect(staticDataProvider.getStaticData).toHaveBeenCalledWith(
        "authors",
        "A123",
      );
    });

    it("should detect sources entity type", async () => {
      staticDataProvider.getStaticData.mockResolvedValue({
        found: true,
        data: { id: "S123", name: "Source" },
      });

      await cachedClient.client.getEntity("S123");
      expect(staticDataProvider.getStaticData).toHaveBeenCalledWith(
        "sources",
        "S123",
      );
    });
  });

  describe("Error Handling and Resilience", () => {
    it("should handle static cache errors gracefully", async () => {
      const testData = { id: "W123", title: "API Work" };

      // Mock static cache error
      staticDataProvider.getStaticData.mockRejectedValue(
        new Error("Cache error"),
      );

      // Mock API success
      const getByIdSpy = vi
        .spyOn(cachedClient, "getById")
        .mockResolvedValue(testData);

      const result = await cachedClient.client.getEntity("W123");

      expect(result).toEqual(testData);
      expect(getByIdSpy).toHaveBeenCalledWith("works", "W123");
    });

    it("should handle API errors and attempt static cache fallback", async () => {
      const testData = { id: "W123", title: "Cached Work" };

      // Mock static cache miss first
      staticDataProvider.getStaticData.mockResolvedValueOnce({
        found: false,
        data: undefined,
      });

      // Mock API error
      const getByIdSpy = vi
        .spyOn(cachedClient, "getById")
        .mockRejectedValue(new Error("API error"));

      // Mock static cache fallback success
      staticDataProvider.getStaticData.mockResolvedValueOnce({
        found: true,
        data: testData,
        tier: "memory",
        loadTime: 5,
      });

      const result = await cachedClient.client.getEntity("W123");

      expect(result).toEqual(testData);
      expect(staticDataProvider.getStaticData).toHaveBeenCalledTimes(2);
    });

    it("should return null when both cache and API fail", async () => {
      // Mock static cache miss
      staticDataProvider.getStaticData.mockResolvedValue({
        found: false,
        data: undefined,
      });

      // Mock API error
      const getByIdSpy = vi
        .spyOn(cachedClient, "getById")
        .mockRejectedValue(new Error("API error"));

      const result = await cachedClient.client.getEntity("W123");

      expect(result).toBeNull();
    });
  });

  describe("Cache Control Methods", () => {
    it("should check if entity exists in static cache", async () => {
      staticDataProvider.hasStaticData.mockResolvedValue(true);

      const exists = await cachedClient.hasStaticEntity("W123");
      expect(exists).toBe(true);
      expect(staticDataProvider.hasStaticData).toHaveBeenCalledWith(
        "works",
        "W123",
      );
    });

    it("should return false when static cache is disabled", async () => {
      cachedClient.setStaticCacheEnabled(false);

      const exists = await cachedClient.hasStaticEntity("W123");
      expect(exists).toBe(false);
      expect(staticDataProvider.hasStaticData).not.toHaveBeenCalled();
    });

    it("should clear static cache", async () => {
      await cachedClient.clearStaticCache();
      expect(staticDataProvider.clearCache).toHaveBeenCalled();
    });

    it("should enable and disable static caching", () => {
      cachedClient.setStaticCacheEnabled(false);
      expect(cachedClient.staticCacheEnabled).toBe(false);

      cachedClient.setStaticCacheEnabled(true);
      expect(cachedClient.staticCacheEnabled).toBe(true);
    });

    it("should get static cache environment", () => {
      const env = cachedClient.getStaticCacheEnvironment();
      expect(env).toBeDefined();
      expect(typeof env.isDevelopment).toBe("boolean");
      expect(typeof env.isProduction).toBe("boolean");
      expect(typeof env.isTest).toBe("boolean");
    });
  });

  describe("Configuration Updates", () => {
    it("should update static cache configuration", () => {
      cachedClient.updateConfig({
        staticCacheEnabled: false,
        staticCacheGitHubPagesUrl: "https://new-url.com",
      });

      expect(cachedClient.staticCacheEnabled).toBe(false);
    });
  });
});
