/**
 * Test environment initialization and cleanup utilities
 * Provides consistent test environment setup across all graph package tests
 */

import { vi } from 'vitest';
import { EventEmitter } from 'events';
import type { GraphNode, GraphEdge, EntityType } from '../../types/core';
import type { GraphDataProvider, ProviderRegistry } from '../../providers/base-provider';

/**
 * Test environment configuration
 */
export interface TestEnvironmentConfig {
  enableMockTimers?: boolean;
  enableMockFetch?: boolean;
  enableMockEventEmitter?: boolean;
  enableMockConsole?: boolean;
  mockProviders?: boolean;
  memoryTracking?: boolean;
}

/**
 * Test environment state
 */
export interface TestEnvironmentState {
  originalTimers: {
    setTimeout: typeof setTimeout;
    clearTimeout: typeof clearTimeout;
    setInterval: typeof setInterval;
    clearInterval: typeof clearInterval;
  };
  originalFetch: typeof fetch;
  originalConsole: {
    log: typeof console.log;
    warn: typeof console.warn;
    error: typeof console.error;
    debug: typeof console.debug;
  };
  mockProviders: Map<string, MockProvider>;
  eventEmitters: Set<EventEmitter>;
  activeTimers: Set<number>;
  memoryBaseline?: number;
}

/**
 * Mock provider for testing
 */
export class MockProvider extends EventEmitter {
  private entities = new Map<string, GraphNode>();
  private readonly config: TestEnvironmentConfig;

  constructor(name: string, config: TestEnvironmentConfig = {}) {
    super();
    this.config = config;

    // Store reference for cleanup
    if (globalThis.__TEST_ENV_STATE__) {
      globalThis.__TEST_ENV_STATE__.mockProviders.set(name, this);
      globalThis.__TEST_ENV_STATE__.eventEmitters.add(this);
    }
  }

  async fetchEntity(id: string): Promise<GraphNode> {
    const entity = this.entities.get(id);
    if (!entity) {
      throw new Error(`Entity ${id} not found`);
    }
    this.emit('entityFetched', entity);
    return entity;
  }

  async searchEntities(query: any): Promise<GraphNode[]> {
    const results = Array.from(this.entities.values()).filter(entity =>
      entity.label.toLowerCase().includes(query.query.toLowerCase())
    );
    return results.slice(0, query.limit || 10);
  }

  async expandEntity(nodeId: string, options: any) {
    const node = this.entities.get(nodeId);
    if (!node) {
      throw new Error(`Node ${nodeId} not found`);
    }

    return {
      nodes: [node],
      edges: [],
      metadata: {
        expandedFrom: nodeId,
        depth: options.depth || 1,
        totalFound: 1,
        options,
      },
    };
  }

  async isHealthy(): Promise<boolean> {
    return true;
  }

  getProviderInfo() {
    return {
      name: 'mock-provider',
      version: '1.0.0',
      stats: {
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        avgResponseTime: 0,
        lastRequestTime: 0,
      },
    };
  }

  // Test utilities
  setEntity(id: string, entity: GraphNode): void {
    this.entities.set(id, entity);
  }

  clearEntities(): void {
    this.entities.clear();
  }

  getEntityCount(): number {
    return this.entities.size;
  }

  destroy(): void {
    this.entities.clear();
    this.removeAllListeners();
  }
}

declare global {
  var __TEST_ENV_STATE__: TestEnvironmentState;
}

/**
 * Initialize test environment with specified configuration
 */
export function setupTestEnvironment(config: TestEnvironmentConfig = {}): TestEnvironmentState {
  // Initialize global state if not exists
  if (!globalThis.__TEST_ENV_STATE__) {
    globalThis.__TEST_ENV_STATE__ = {
      originalTimers: {
        setTimeout,
        clearTimeout,
        setInterval,
        clearInterval,
      },
      originalFetch: globalThis.fetch,
      originalConsole: {
        log: console.log,
        warn: console.warn,
        error: console.error,
        debug: console.debug,
      },
      mockProviders: new Map(),
      eventEmitters: new Set(),
      activeTimers: new Set(),
    };
  }

  const state = globalThis.__TEST_ENV_STATE__;

  // Setup memory tracking baseline
  if (config.memoryTracking && typeof performance !== 'undefined' && (performance as any).memory) {
    state.memoryBaseline = (performance as any).memory.usedJSHeapSize;
  }

  // Setup mock timers
  if (config.enableMockTimers !== false) {
    vi.useFakeTimers();
  }

  // Setup mock fetch
  if (config.enableMockFetch) {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue({}),
      text: vi.fn().mockResolvedValue(''),
    } as any);
  }

  // Setup mock console (suppress noise)
  if (config.enableMockConsole) {
    console.log = vi.fn();
    console.warn = vi.fn();
    console.error = vi.fn();
    console.debug = vi.fn();
  }

  return state;
}

/**
 * Clean up test environment and restore original functions
 */
export function cleanupTestEnvironment(): void {
  const state = globalThis.__TEST_ENV_STATE__;
  if (!state) return;

  // Restore original timers
  vi.useRealTimers();
  globalThis.setTimeout = state.originalTimers.setTimeout;
  globalThis.clearTimeout = state.originalTimers.clearTimeout;
  globalThis.setInterval = state.originalTimers.setInterval;
  globalThis.clearInterval = state.originalTimers.clearInterval;

  // Clear active timers
  state.activeTimers.forEach(id => clearTimeout(id));
  state.activeTimers.clear();

  // Restore original fetch
  if (state.originalFetch) {
    globalThis.fetch = state.originalFetch;
  }

  // Restore original console
  console.log = state.originalConsole.log;
  console.warn = state.originalConsole.warn;
  console.error = state.originalConsole.error;
  console.debug = state.originalConsole.debug;

  // Clean up mock providers
  state.mockProviders.forEach(provider => provider.destroy());
  state.mockProviders.clear();

  // Clean up event emitters
  state.eventEmitters.forEach(emitter => emitter.removeAllListeners());
  state.eventEmitters.clear();

  // Clear memory baseline
  delete state.memoryBaseline;
}

/**
 * Create a mock provider registry for testing
 */
export function createMockProviderRegistry(providers: MockProvider[] = []): ProviderRegistry {
  const registry = new (class {
    private providers = new Map<string, MockProvider>();
    private defaultProvider: string | null = null;

    register(provider: MockProvider): void {
      const name = provider.getProviderInfo().name;
      this.providers.set(name, provider);
      if (!this.defaultProvider) {
        this.defaultProvider = name;
      }
    }

    unregister(providerName: string): void {
      const provider = this.providers.get(providerName);
      if (provider) {
        provider.destroy();
        this.providers.delete(providerName);
        if (this.defaultProvider === providerName) {
          this.defaultProvider = this.providers.keys().next().value || null;
        }
      }
    }

    get(providerName?: string): MockProvider | null {
      const name = providerName || this.defaultProvider;
      return name ? this.providers.get(name) || null : null;
    }

    setDefault(providerName: string): void {
      if (this.providers.has(providerName)) {
        this.defaultProvider = providerName;
      } else {
        throw new Error(`Provider '${providerName}' not found`);
      }
    }

    listProviders(): string[] {
      return Array.from(this.providers.keys());
    }

    getStats() {
      const stats: Record<string, any> = {};
      for (const [name, provider] of this.providers) {
        stats[name] = provider.getProviderInfo().stats;
      }
      return stats;
    }

    async healthCheck() {
      const health: Record<string, boolean> = {};
      for (const [name, provider] of this.providers) {
        try {
          health[name] = await provider.isHealthy();
        } catch {
          health[name] = false;
        }
      }
      return health;
    }

    destroy(): void {
      for (const provider of this.providers.values()) {
        provider.destroy();
      }
      this.providers.clear();
      this.defaultProvider = null;
    }
  })() as unknown as ProviderRegistry;

  // Register provided mock providers
  providers.forEach(provider => (registry as any).register(provider));

  return registry;
}

/**
 * Track a timer ID for cleanup
 */
export function trackTimer(timerId: number): void {
  if (globalThis.__TEST_ENV_STATE__) {
    globalThis.__TEST_ENV_STATE__.activeTimers.add(timerId);
  }
}

/**
 * Get current memory usage (if available)
 */
export function getCurrentMemoryUsage(): number {
  if (typeof performance !== 'undefined' && (performance as any).memory) {
    return (performance as any).memory.usedJSHeapSize;
  }
  return 0;
}

/**
 * Get memory usage since baseline
 */
export function getMemoryDelta(): number {
  const state = globalThis.__TEST_ENV_STATE__;
  if (!state?.memoryBaseline) return 0;

  const current = getCurrentMemoryUsage();
  return current - state.memoryBaseline;
}

/**
 * Reset memory baseline
 */
export function resetMemoryBaseline(): void {
  const state = globalThis.__TEST_ENV_STATE__;
  if (state) {
    state.memoryBaseline = getCurrentMemoryUsage();
  }
}

/**
 * Common test environment presets
 */
export const testPresets = {
  minimal: (): TestEnvironmentConfig => ({
    enableMockTimers: false,
    enableMockFetch: false,
    enableMockEventEmitter: false,
    enableMockConsole: false,
    mockProviders: false,
    memoryTracking: false,
  }),

  standard: (): TestEnvironmentConfig => ({
    enableMockTimers: true,
    enableMockFetch: true,
    enableMockEventEmitter: true,
    enableMockConsole: true,
    mockProviders: true,
    memoryTracking: true,
  }),

  performance: (): TestEnvironmentConfig => ({
    enableMockTimers: false,
    enableMockFetch: false,
    enableMockEventEmitter: false,
    enableMockConsole: true,
    mockProviders: true,
    memoryTracking: true,
  }),

  integration: (): TestEnvironmentConfig => ({
    enableMockTimers: false,
    enableMockFetch: false,
    enableMockEventEmitter: false,
    enableMockConsole: false,
    mockProviders: false,
    memoryTracking: false,
  }),
};