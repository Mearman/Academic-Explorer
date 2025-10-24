/**
 * Example: Mock Provider Testing Patterns
 *
 * Demonstrates: Testing strategies for consumers of the provider system
 * Use cases: Unit testing, integration testing, mocking strategies
 * Prerequisites: Understanding of testing patterns and mocking frameworks
 */

import { describe, it, expect, beforeEach, afterEach, vi as _vi } from "vitest";
import { GraphDataProvider, ProviderRegistry } from "../../../providers";
import type {
  SearchQuery,
  ProviderExpansionOptions,
  GraphExpansion,
} from "../../../providers/base-provider";
import type { GraphNode, EntityIdentifier } from "../../../types/core";

// Example consumer service that uses the provider system
class ResearchAnalysisService {
  constructor(
    private provider: GraphDataProvider,
    private options = { enableCaching: true },
  ) {}

  async analyzeAuthor(authorId: string) {
    const author = await this.provider.fetchEntity(authorId);
    const expansion = await this.provider.expandEntity(authorId, { limit: 20 });

    const works = expansion.nodes.filter((node) => node.entityType === "works");
    const institutions = expansion.nodes.filter(
      (node) => node.entityType === "institutions",
    );

    return {
      author: {
        id: author.id,
        name: author.label,
        totalWorks: works.length,
      },
      productivity: {
        averageCitationsPerWork: this.calculateAverageCitations(works),
        collaborationScore: this.calculateCollaborationScore(
          expansion.edges.length,
          works.length,
        ),
      },
      affiliations: institutions.map((inst) => ({
        id: inst.id,
        name: inst.label,
      })),
    };
  }

  async findSimilarResearchers(authorId: string, threshold = 0.7) {
    const baseAuthor = await this.provider.fetchEntity(authorId);
    const expansion = await this.provider.expandEntity(authorId, { limit: 50 });

    // Extract research topics from the author's work
    const topics = this.extractResearchTopics(expansion.nodes);

    // Search for authors with similar topics
    const similarAuthors = [];
    for (const topic of topics.slice(0, 3)) {
      // Check top 3 topics
      const results = await this.provider.searchEntities({
        query: topic,
        entityTypes: ["authors"],
        limit: 10,
      });

      similarAuthors.push(...results);
    }

    // Remove duplicates and the original author
    const uniqueAuthors = Array.from(
      new Map(similarAuthors.map((author) => [author.id, author])).values(),
    ).filter((author) => author.id !== authorId);

    return {
      baseAuthor: {
        id: baseAuthor.id,
        name: baseAuthor.label,
      },
      similarAuthors: uniqueAuthors.slice(0, 10).map((author) => ({
        id: author.id,
        name: author.label,
        similarityScore: Math.random() * 0.3 + threshold, // Mock similarity calculation
      })),
    };
  }

  async generateResearchReport(entityIds: string[]) {
    const entities = await this.provider.fetchEntities(entityIds);

    const report = {
      summary: {
        totalEntities: entities.length,
        entityTypes: this.countEntityTypes(entities),
        generatedAt: new Date().toISOString(),
      },
      entities: entities.map((entity) => ({
        id: entity.id,
        type: entity.entityType,
        name: entity.label,
        externalIds: entity.externalIds.length,
      })),
      healthCheck: await this.provider.isHealthy(),
    };

    return report;
  }

  private calculateAverageCitations(works: GraphNode[]): number {
    const totalCitations = works.reduce((sum, work) => {
      const citations = (work.entityData as any)?.cited_by_count || 0;
      return sum + citations;
    }, 0);

    return works.length > 0 ? totalCitations / works.length : 0;
  }

  private calculateCollaborationScore(
    edgeCount: number,
    workCount: number,
  ): number {
    if (workCount === 0) return 0;
    return Math.min(edgeCount / workCount, 5); // Cap at 5 for normalization
  }

  private extractResearchTopics(_nodes: GraphNode[]): string[] {
    // Mock topic extraction - in real implementation would analyze entity data
    return [
      "machine learning",
      "natural language processing",
      "computer vision",
    ];
  }

  private countEntityTypes(entities: GraphNode[]): Record<string, number> {
    return entities.reduce(
      (counts, entity) => {
        counts[entity.entityType] = (counts[entity.entityType] || 0) + 1;
        return counts;
      },
      {} as Record<string, number>,
    );
  }
}

// Test-specific mock provider
class TestMockProvider extends GraphDataProvider {
  private mockData: Map<string, GraphNode> = new Map();
  private mockExpansions: Map<string, GraphExpansion> = new Map();
  private mockSearchResults: Map<string, GraphNode[]> = new Map();
  private shouldThrowError = false;
  private errorMessage = "Mock error";

  constructor(name = "test-mock") {
    super({ name });
  }

  // Test setup methods
  addMockEntity(entity: GraphNode): void {
    this.mockData.set(entity.id, entity);
  }

  addMockExpansion(nodeId: string, expansion: GraphExpansion): void {
    this.mockExpansions.set(nodeId, expansion);
  }

  addMockSearchResults(query: string, results: GraphNode[]): void {
    this.mockSearchResults.set(query, results);
  }

  setErrorMode(shouldThrow: boolean, message = "Mock error"): void {
    this.shouldThrowError = shouldThrow;
    this.errorMessage = message;
  }

  clearMockData(): void {
    this.mockData.clear();
    this.mockExpansions.clear();
    this.mockSearchResults.clear();
    this.shouldThrowError = false;

    // Reset stats as well for proper test isolation
    this.stats.totalRequests = 0;
    this.stats.successfulRequests = 0;
    this.stats.failedRequests = 0;
    this.stats.avgResponseTime = 0;
    this.stats.lastRequestTime = 0;
  }

  // Provider interface implementation
  async fetchEntity(id: EntityIdentifier): Promise<GraphNode> {
    const operation = async (): Promise<GraphNode> => {
      if (this.shouldThrowError) {
        throw new Error(this.errorMessage);
      }

      const entity = this.mockData.get(id);
      if (!entity) {
        throw new Error(`Entity ${id} not found in mock data`);
      }

      this.onEntityFetched(entity);
      return entity;
    };

    return this.trackRequest(operation());
  }

  async searchEntities(query: SearchQuery): Promise<GraphNode[]> {
    const operation = async (): Promise<GraphNode[]> => {
      if (this.shouldThrowError) {
        throw new Error(this.errorMessage);
      }

      const results = this.mockSearchResults.get(query.query) || [];
      return results
        .filter((result) => query.entityTypes.includes(result.entityType))
        .slice(0, query.limit || 20);
    };

    return this.trackRequest(operation());
  }

  async expandEntity(
    nodeId: string,
    options: ProviderExpansionOptions,
  ): Promise<GraphExpansion> {
    const operation = async (): Promise<GraphExpansion> => {
      if (this.shouldThrowError) {
        throw new Error(this.errorMessage);
      }

      const expansion = this.mockExpansions.get(nodeId);
      if (!expansion) {
        // Return empty expansion if none configured
        return {
          nodes: [],
          edges: [],
          metadata: {
            expandedFrom: nodeId,
            depth: 1,
            totalFound: 0,
            options,
          },
        };
      }

      // Apply limits from options
      const limitedExpansion = {
        ...expansion,
        nodes: expansion.nodes.slice(0, options.limit || 10),
        edges: expansion.edges.slice(0, (options.limit || 10) * 2),
      };

      limitedExpansion.metadata.totalFound = limitedExpansion.nodes.length;
      limitedExpansion.metadata.options = options;

      return limitedExpansion;
    };

    return this.trackRequest(operation());
  }

  async isHealthy(): Promise<boolean> {
    return !this.shouldThrowError;
  }

  // Test utilities
  getRequestCount(): number {
    return this.getProviderInfo().stats.totalRequests;
  }

  getSuccessCount(): number {
    return this.getProviderInfo().stats.successfulRequests;
  }

  getFailureCount(): number {
    return this.getProviderInfo().stats.failedRequests;
  }
}

describe("Example: Mock Provider Testing Patterns", () => {
  let mockProvider: TestMockProvider;
  let analysisService: ResearchAnalysisService;

  beforeEach(() => {
    mockProvider = new TestMockProvider();
    analysisService = new ResearchAnalysisService(mockProvider);
  });

  afterEach(() => {
    mockProvider.destroy();
  });

  describe("Unit Testing with Mock Providers", () => {
    it("demonstrates testing service logic with predictable data", async () => {
      // Given: Mock author data
      const mockAuthor: GraphNode = {
        id: "A5017898742",
        entityType: "authors",
        entityId: "A5017898742",
        label: "Dr. Test Researcher",
        x: 0,
        y: 0,
        externalIds: [],
        entityData: {
          works_count: 25,
          cited_by_count: 1500,
        },
      };

      const mockWork: GraphNode = {
        id: "W2741809807",
        entityType: "works",
        entityId: "W2741809807",
        label: "Important Research Paper",
        x: 0,
        y: 0,
        externalIds: [],
        entityData: {
          cited_by_count: 150,
          publication_year: 2023,
        },
      };

      mockProvider.addMockEntity(mockAuthor);
      mockProvider.addMockExpansion("A5017898742", {
        nodes: [mockWork],
        edges: [
          {
            id: "edge1",
            source: "A5017898742",
            target: "W2741809807",
            type: "authored" as any,
          },
        ],
        metadata: {
          expandedFrom: "A5017898742",
          depth: 1,
          totalFound: 1,
          options: {},
        },
      });

      // When: Analyzing the author
      const analysis = await analysisService.analyzeAuthor("A5017898742");

      // Then: Should return expected analysis structure
      expect(analysis).toMatchObject({
        author: {
          id: "A5017898742",
          name: "Dr. Test Researcher",
          totalWorks: 1,
        },
        productivity: {
          averageCitationsPerWork: 150,
          collaborationScore: expect.any(Number),
        },
        affiliations: [],
      });

      // Best Practice: Verify provider interactions
      expect(mockProvider.getRequestCount()).toBe(2); // fetch + expand
      expect(mockProvider.getSuccessCount()).toBe(2);
      expect(mockProvider.getFailureCount()).toBe(0);
    });

    it("demonstrates testing error handling scenarios", async () => {
      // Given: Provider configured to throw errors
      mockProvider.setErrorMode(true, "Network connectivity error");

      // When: Attempting analysis with failing provider
      await expect(
        analysisService.analyzeAuthor("A5017898742"),
      ).rejects.toThrow("Network connectivity error");

      // Then: Service should propagate provider errors appropriately
      expect(mockProvider.getFailureCount()).toBeGreaterThan(0);
    });

    it("demonstrates testing with partial data", async () => {
      // Given: Author with minimal data
      const minimalAuthor: GraphNode = {
        id: "A5045033332",
        entityType: "authors",
        entityId: "A5045033332",
        label: "New Researcher",
        x: 0,
        y: 0,
        externalIds: [],
        entityData: {
          works_count: 0,
          cited_by_count: 0,
        },
      };

      mockProvider.addMockEntity(minimalAuthor);
      // No expansion data - will return empty expansion

      // When: Analyzing author with no works
      const analysis = await analysisService.analyzeAuthor("A5045033332");

      // Then: Should handle empty data gracefully
      expect(analysis).toMatchObject({
        author: {
          id: "A5045033332",
          name: "New Researcher",
          totalWorks: 0,
        },
        productivity: {
          averageCitationsPerWork: 0,
          collaborationScore: 0,
        },
        affiliations: [],
      });
    });

    it("demonstrates testing search functionality", async () => {
      // Given: Mock search results
      const searchResults: GraphNode[] = [
        {
          id: "A5023888391",
          entityType: "authors",
          entityId: "A5023888391",
          label: "Similar Researcher 1",
          x: 0,
          y: 0,
          externalIds: [],
        },
        {
          id: "A5023888392",
          entityType: "authors",
          entityId: "A5023888392",
          label: "Similar Researcher 2",
          x: 0,
          y: 0,
          externalIds: [],
        },
      ];

      // Mock the base author
      mockProvider.addMockEntity({
        id: "A5017898742",
        entityType: "authors",
        entityId: "A5017898742",
        label: "Base Researcher",
        x: 0,
        y: 0,
        externalIds: [],
      });

      // Mock expansion data
      mockProvider.addMockExpansion("A5017898742", {
        nodes: [],
        edges: [],
        metadata: {
          expandedFrom: "A5017898742",
          depth: 1,
          totalFound: 0,
          options: {},
        },
      });

      // Mock search results for each topic
      mockProvider.addMockSearchResults("machine learning", searchResults);
      mockProvider.addMockSearchResults("natural language processing", [
        searchResults[0],
      ]);
      mockProvider.addMockSearchResults("computer vision", [searchResults[1]]);

      // When: Finding similar researchers
      const result =
        await analysisService.findSimilarResearchers("A5017898742");

      // Then: Should return similar researchers
      expect(result.baseAuthor).toMatchObject({
        id: "A5017898742",
        name: "Base Researcher",
      });

      expect(result.similarAuthors.length).toBeGreaterThan(0);
      expect(result.similarAuthors[0]).toMatchObject({
        id: expect.any(String),
        name: expect.any(String),
        similarityScore: expect.any(Number),
      });

      // Best Practice: Verify no duplicate authors
      const authorIds = result.similarAuthors.map((a) => a.id);
      expect(new Set(authorIds).size).toBe(authorIds.length);
    });
  });

  describe("Integration Testing Patterns", () => {
    it("demonstrates testing with provider registry", async () => {
      // Given: Multiple mock providers in registry
      const registry = new ProviderRegistry();
      const primaryProvider = new TestMockProvider("primary");
      const fallbackProvider = new TestMockProvider("fallback");

      registry.register(primaryProvider);
      registry.register(fallbackProvider);

      // Setup different data in each provider
      primaryProvider.addMockEntity({
        id: "A5017898742",
        entityType: "authors",
        entityId: "A5017898742",
        label: "Primary Author Data",
        x: 0,
        y: 0,
        externalIds: [],
      });

      fallbackProvider.addMockEntity({
        id: "A5017898742",
        entityType: "authors",
        entityId: "A5017898742",
        label: "Fallback Author Data",
        x: 0,
        y: 0,
        externalIds: [],
      });

      // When: Using different providers
      const primaryService = new ResearchAnalysisService(
        registry.get("primary")!,
      );
      const fallbackService = new ResearchAnalysisService(
        registry.get("fallback")!,
      );

      const primaryReport = await primaryService.generateResearchReport([
        "A5017898742",
      ]);
      const fallbackReport = await fallbackService.generateResearchReport([
        "A5017898742",
      ]);

      // Then: Should get different data from different providers
      expect(primaryReport.entities[0].name).toBe("Primary Author Data");
      expect(fallbackReport.entities[0].name).toBe("Fallback Author Data");

      // Cleanup
      registry.destroy();
    });

    it("demonstrates testing provider failover scenarios", async () => {
      // Given: Primary provider that fails, fallback that works
      const primaryProvider = new TestMockProvider("primary");
      const fallbackProvider = new TestMockProvider("fallback");

      primaryProvider.setErrorMode(true, "Primary service unavailable");
      fallbackProvider.addMockEntity({
        id: "A5017898742",
        entityType: "authors",
        entityId: "A5017898742",
        label: "Fallback Data",
        x: 0,
        y: 0,
        externalIds: [],
      });

      // When: Implementing failover logic
      const attemptWithFailover = async (entityId: string) => {
        try {
          const primaryService = new ResearchAnalysisService(primaryProvider);
          return await primaryService.generateResearchReport([entityId]);
        } catch (_primaryError) {
          console.log("Primary failed, trying fallback...");
          const fallbackService = new ResearchAnalysisService(fallbackProvider);
          return await fallbackService.generateResearchReport([entityId]);
        }
      };

      const report = await attemptWithFailover("A5017898742");

      // Then: Should succeed with fallback data
      expect(report.entities[0].name).toBe("Fallback Data");
      expect(report.healthCheck).toBe(true); // Fallback provider is healthy

      // Cleanup
      primaryProvider.destroy();
      fallbackProvider.destroy();
    });

    it("demonstrates testing concurrent operations", async () => {
      // Given: Mock data for multiple entities
      const entities = [
        "A5017898001",
        "A5017898002",
        "A5017898003",
        "A5017898004",
        "A5017898005",
      ];
      entities.forEach((id) => {
        mockProvider.addMockEntity({
          id,
          entityType: "authors",
          entityId: id,
          label: `Author ${id}`,
          x: 0,
          y: 0,
          externalIds: [],
        });
      });

      // When: Processing entities concurrently
      const concurrentReports = entities.map((id) =>
        analysisService.generateResearchReport([id]),
      );

      const reports = await Promise.all(concurrentReports);

      // Then: Should handle concurrent operations correctly
      expect(reports).toHaveLength(5);
      reports.forEach((report, index) => {
        expect(report.entities[0].id).toBe(entities[index]);
        expect(report.entities[0].name).toBe(`Author ${entities[index]}`);
      });

      // Best Practice: Verify provider handled concurrent requests
      expect(mockProvider.getRequestCount()).toBe(5);
      expect(mockProvider.getSuccessCount()).toBe(5);
    });
  });

  describe("Performance Testing Patterns", () => {
    it("demonstrates testing response times", async () => {
      // Given: Mock providers with different simulated response times
      const slowProvider = new TestMockProvider("slow");
      const fastProvider = new TestMockProvider("fast");

      // Override trackRequest to add variable delays
      const originalSlowTrackRequest =
        slowProvider["trackRequest"].bind(slowProvider);
      slowProvider["trackRequest"] = function <T>(
        promise: Promise<T>,
      ): Promise<T> {
        // Add 80-120ms delay to simulate slow responses
        const delay = 80 + Math.random() * 40;
        const delayedPromise = promise.then(async (result) => {
          await new Promise((resolve) => setTimeout(resolve, delay));
          return result;
        });
        return originalSlowTrackRequest(delayedPromise);
      };

      const originalFastTrackRequest =
        fastProvider["trackRequest"].bind(fastProvider);
      fastProvider["trackRequest"] = function <T>(
        promise: Promise<T>,
      ): Promise<T> {
        // Add 5-15ms delay to simulate fast responses
        const delay = 5 + Math.random() * 10;
        const delayedPromise = promise.then(async (result) => {
          await new Promise((resolve) => setTimeout(resolve, delay));
          return result;
        });
        return originalFastTrackRequest(delayedPromise);
      };

      // Setup same data in both providers
      const testEntity: GraphNode = {
        id: "A5017898742",
        entityType: "authors",
        entityId: "A5017898742",
        label: "Test Author",
        x: 0,
        y: 0,
        externalIds: [],
      };

      slowProvider.addMockEntity(testEntity);
      fastProvider.addMockEntity(testEntity);

      // When: Measuring performance
      const measureTime = async (provider: TestMockProvider) => {
        const start = Date.now();
        const service = new ResearchAnalysisService(provider);
        await service.generateResearchReport(["A5017898742"]);
        return Date.now() - start;
      };

      const slowTime = await measureTime(slowProvider);
      const fastTime = await measureTime(fastProvider);

      // Then: Should demonstrate performance difference
      expect(slowTime).toBeGreaterThan(fastTime);
      expect(slowTime).toBeGreaterThan(75); // At least close to minimum delay (80ms)
      expect(fastTime).toBeLessThan(50); // Should be much faster (max ~15ms + processing overhead)

      // Best Practice: Also verify provider stats tracked the timing
      const slowStats = slowProvider.getProviderInfo().stats;
      const fastStats = fastProvider.getProviderInfo().stats;
      expect(slowStats.avgResponseTime).toBeGreaterThan(
        fastStats.avgResponseTime,
      );

      // Cleanup
      slowProvider.destroy();
      fastProvider.destroy();
    });

    it("demonstrates testing memory usage patterns", async () => {
      // Given: Large dataset for memory testing
      const largeDataset = Array.from({ length: 100 }, (_, i) => ({
        id: `A${i.toString().padStart(10, "0")}`,
        entityType: "authors" as const,
        entityId: `A${i.toString().padStart(10, "0")}`,
        label: `Author ${i}`,
        x: 0,
        y: 0,
        externalIds: [],
        entityData: {
          works_count: i * 10,
          cited_by_count: i * 100,
        },
      }));

      largeDataset.forEach((entity) => mockProvider.addMockEntity(entity));

      // When: Processing large dataset
      const batchSize = 10;
      const batches = [];

      for (let i = 0; i < largeDataset.length; i += batchSize) {
        const batchIds = largeDataset.slice(i, i + batchSize).map((e) => e.id);
        const batchPromise = analysisService.generateResearchReport(batchIds);
        batches.push(batchPromise);
      }

      const reports = await Promise.all(batches);

      // Then: Should handle large dataset efficiently
      expect(reports).toHaveLength(10); // 100 entities / 10 per batch
      expect(
        reports.every((report) => report.entities.length === batchSize),
      ).toBe(true);

      // Best Practice: Verify all requests were handled
      expect(mockProvider.getSuccessCount()).toBe(100);
    });

    it("demonstrates testing caching behavior", async () => {
      // Given: Service with caching enabled
      const cachedService = new ResearchAnalysisService(mockProvider, {
        enableCaching: true,
      });

      mockProvider.addMockEntity({
        id: "A5017898742",
        entityType: "authors",
        entityId: "A5017898742",
        label: "Cached Author",
        x: 0,
        y: 0,
        externalIds: [],
      });

      mockProvider.addMockExpansion("A5017898742", {
        nodes: [],
        edges: [],
        metadata: {
          expandedFrom: "A5017898742",
          depth: 1,
          totalFound: 0,
          options: {},
        },
      });

      // When: Making repeated requests
      const firstAnalysis = await cachedService.analyzeAuthor("A5017898742");
      const initialRequestCount = mockProvider.getRequestCount();

      const secondAnalysis = await cachedService.analyzeAuthor("A5017898742");
      const finalRequestCount = mockProvider.getRequestCount();

      // Then: Results should be identical
      expect(firstAnalysis).toEqual(secondAnalysis);

      // Best Practice: Verify caching reduces provider requests
      // (In this mock implementation, caching isn't actually implemented,
      // but this shows how you would test it)
      console.log(`Requests: ${initialRequestCount} -> ${finalRequestCount}`);
    });
  });

  describe("Event Testing Patterns", () => {
    it("demonstrates testing provider event handling", async () => {
      // Given: Event listeners for testing
      const events: Array<{ type: string; data: unknown }> = [];

      mockProvider.on("entityFetched", (node: GraphNode) => {
        events.push({
          type: "entityFetched",
          data: { id: node.id, label: node.label },
        });
      });

      mockProvider.on("requestSuccess", (event: { duration: number }) => {
        events.push({ type: "requestSuccess", data: event });
      });

      mockProvider.on(
        "requestError",
        (event: { error: Error; duration: number }) => {
          events.push({
            type: "requestError",
            data: { message: event.error.message },
          });
        },
      );

      // Setup test data
      mockProvider.addMockEntity({
        id: "A5017898742",
        entityType: "authors",
        entityId: "A5017898742",
        label: "Event Test Author",
        x: 0,
        y: 0,
        externalIds: [],
      });

      // When: Performing operations that trigger events
      await analysisService.generateResearchReport(["A5017898742"]);

      // Trigger an error
      mockProvider.setErrorMode(true, "Test error");
      try {
        await analysisService.generateResearchReport(["A5023888391"]);
      } catch {
        // Expected error
      }

      // Then: Should have captured events
      expect(events.length).toBeGreaterThan(0);

      const entityFetchedEvents = events.filter(
        (e) => e.type === "entityFetched",
      );
      const successEvents = events.filter((e) => e.type === "requestSuccess");
      const errorEvents = events.filter((e) => e.type === "requestError");

      expect(entityFetchedEvents.length).toBe(1);
      expect(successEvents.length).toBe(1);
      expect(errorEvents.length).toBe(1);

      // Best Practice: Verify event data structure
      expect(entityFetchedEvents[0].data).toMatchObject({
        id: "A5017898742",
        label: "Event Test Author",
      });

      expect(errorEvents[0].data).toMatchObject({
        message: "Test error",
      });
    });
  });

  describe("Best Practices for Testing", () => {
    it("demonstrates test data management", () => {
      // Given: Centralized test data factory
      const createTestAuthor = (
        id: string,
        overrides: Partial<GraphNode> = {},
      ): GraphNode => ({
        id,
        entityType: "authors",
        entityId: id,
        label: `Test Author ${id.slice(-3)}`,
        x: 0,
        y: 0,
        externalIds: [],
        entityData: {
          works_count: 20,
          cited_by_count: 500,
        },
        ...overrides,
      });

      const createTestWork = (
        id: string,
        overrides: Partial<GraphNode> = {},
      ): GraphNode => ({
        id,
        entityType: "works",
        entityId: id,
        label: `Test Work ${id.slice(-3)}`,
        x: 0,
        y: 0,
        externalIds: [],
        entityData: {
          publication_year: 2023,
          cited_by_count: 50,
        },
        ...overrides,
      });

      // When: Creating test data with factory
      const author1 = createTestAuthor("A5017898001");
      const author2 = createTestAuthor("A5017898002", {
        label: "Special Test Author",
      });
      const work1 = createTestWork("W2741809001");

      // Then: Should have consistent structure with customizations
      expect(author1.entityType).toBe("authors");
      expect(author2.label).toBe("Special Test Author");
      expect(work1.entityType).toBe("works");

      // Best Practice: Factory ensures consistent test data structure
      expect(author1.entityData).toHaveProperty("works_count");
      expect(work1.entityData).toHaveProperty("publication_year");
    });

    it("demonstrates test isolation and cleanup", async () => {
      // Given: Test that modifies provider state
      mockProvider.addMockEntity({
        id: "A5017898111",
        entityType: "authors",
        entityId: "A5017898111",
        label: "Test Author 1",
        x: 0,
        y: 0,
        externalIds: [],
      });

      await analysisService.generateResearchReport(["A5017898111"]);
      expect(mockProvider.getRequestCount()).toBe(1);

      // When: Clearing mock data between tests
      mockProvider.clearMockData();

      // Then: Provider state should be reset
      expect(mockProvider.getRequestCount()).toBe(0); // Stats are reset
      expect(mockProvider.getSuccessCount()).toBe(0);

      // Trying to fetch cleared entity should fail
      await expect(
        analysisService.generateResearchReport(["A5017898111"]),
      ).rejects.toThrow("Entity A5017898111 not found in mock data");
    });

    it("demonstrates assertion patterns for complex data", () => {
      // Given: Complex analysis result
      const complexResult = {
        author: { id: "A5017898742", name: "Dr. Test", totalWorks: 25 },
        productivity: {
          averageCitationsPerWork: 45.2,
          collaborationScore: 3.1,
        },
        affiliations: [
          { id: "I4210140001", name: "Test University" },
          { id: "I4210140002", name: "Research Institute" },
        ],
      };

      // When: Testing with flexible assertions
      // Best Practice: Use toMatchObject for partial matching
      expect(complexResult).toMatchObject({
        author: expect.objectContaining({
          id: expect.any(String),
          name: expect.stringMatching(/^Dr\./),
          totalWorks: expect.any(Number),
        }),
        productivity: expect.objectContaining({
          averageCitationsPerWork: expect.any(Number),
          collaborationScore: expect.any(Number),
        }),
        affiliations: expect.arrayContaining([
          expect.objectContaining({
            id: expect.stringMatching(/^I\d+$/),
            name: expect.any(String),
          }),
        ]),
      });

      // Best Practice: Test specific business rules
      expect(complexResult.productivity.collaborationScore).toBeGreaterThan(0);
      expect(complexResult.productivity.collaborationScore).toBeLessThanOrEqual(
        5,
      );
      expect(complexResult.affiliations.length).toBeGreaterThanOrEqual(1);
    });
  });
});
