/**
 * Reusable mock factories for consistent test data across all projects
 * in the Academic Explorer workspace.
 */

import { vi, type Mock } from "vitest";
import type { GraphNode, SearchOptions } from "@academic-explorer/graph";
import type { QueryClient } from "@tanstack/react-query";

/**
 * Graph node factory for creating test graph nodes
 */
export const GraphNodeFactory = {
  /**
   * Create a basic work node
   */
  createWorkNode: (overrides: Partial<GraphNode> = {}): GraphNode => ({
    id: "test-work-node",
    label: "Test Work",
    entityType: "works",
    entityId: "W123456789",
    position: { x: 100, y: 100 },
    externalIds: [],
    ...overrides,
  }),

  /**
   * Create a basic author node
   */
  createAuthorNode: (overrides: Partial<GraphNode> = {}): GraphNode => ({
    id: "test-author-node",
    label: "Test Author",
    entityType: "authors",
    entityId: "A123456789",
    position: { x: 200, y: 200 },
    externalIds: [
      {
        entityType: "orcid",
        value: "0000-0000-0000-0000",
        url: "https://orcid.org/0000-0000-0000-0000",
      },
    ],
    ...overrides,
  }),

  /**
   * Create a basic institution node
   */
  createInstitutionNode: (overrides: Partial<GraphNode> = {}): GraphNode => ({
    id: "test-institution-node",
    label: "Test Institution",
    entityType: "institutions",
    entityId: "I123456789",
    position: { x: 300, y: 300 },
    externalIds: [
      {
        entityType: "ror",
        value: "01abc23de",
        url: "https://ror.org/01abc23de",
      },
    ],
    ...overrides,
  }),

  /**
   * Create a complex node with multiple external IDs
   */
  createComplexNode: (overrides: Partial<GraphNode> = {}): GraphNode => ({
    id: "complex-node",
    label: "Complex Node",
    entityType: "works",
    entityId: "W987654321",
    position: { x: 0, y: 0 },
    externalIds: [
      {
        entityType: "doi",
        value: "10.1234/test.123",
        url: "https://doi.org/10.1234/test.123",
      },
      {
        entityType: "pmid",
        value: "12345678",
        url: "https://pubmed.ncbi.nlm.nih.gov/12345678",
      },
    ],
    ...overrides,
  }),

  /**
   * Create multiple nodes for testing collections
   */
  createNodeCollection: (
    count: number,
    type: "works" | "authors" | "institutions" = "works"
  ): GraphNode[] => {
    return Array.from({ length: count }, (_, index) => {
      const baseId = type === "works" ? "W" : type === "authors" ? "A" : "I";
      const entityId = `${baseId}${String(index + 1).padStart(9, "0")}`;

      return {
        id: `${type}-node-${index}`,
        label: `${type.slice(0, -1)} ${index + 1}`,
        entityType: type,
        entityId,
        position: {
          x: Math.random() * 1000,
          y: Math.random() * 1000,
        },
        externalIds: [],
      };
    });
  },
};

/**
 * OpenAlex API response factories
 */
export const OpenAlexResponseFactory = {
  /**
   * Create a basic OpenAlex response
   */
  createResponse: <T = any>(
    results: T[] = [],
    overrides: {
      count?: number;
      db_response_time_ms?: number;
      page?: number;
      per_page?: number;
    } = {}
  ) => ({
    results,
    meta: {
      count: overrides.count ?? results.length,
      db_response_time_ms: overrides.db_response_time_ms ?? 100,
      page: overrides.page ?? 1,
      per_page: overrides.per_page ?? 25,
      ...overrides,
    },
  }),

  /**
   * Create a work response
   */
  createWorkResponse: (count = 1) => {
    const works = Array.from({ length: count }, (_, index) => ({
      id: `https://openalex.org/W${String(index + 1).padStart(9, "0")}`,
      doi: `https://doi.org/10.1234/work.${index + 1}`,
      title: `Test Work ${index + 1}`,
      display_name: `Test Work ${index + 1}`,
      publication_year: 2024,
      publication_date: "2024-01-01",
      type: "article",
      cited_by_count: Math.floor(Math.random() * 100),
      is_oa: true,
      authorships: [],
      institutions: [],
      concepts: [],
      mesh: [],
      locations: [],
      referenced_works: [],
      related_works: [],
    }));

    return OpenAlexResponseFactory.createResponse(works);
  },

  /**
   * Create an author response
   */
  createAuthorResponse: (count = 1) => {
    const authors = Array.from({ length: count }, (_, index) => ({
      id: `https://openalex.org/A${String(index + 1).padStart(9, "0")}`,
      orcid: `https://orcid.org/0000-0000-0000-000${index}`,
      display_name: `Test Author ${index + 1}`,
      display_name_alternatives: [],
      works_count: Math.floor(Math.random() * 50),
      cited_by_count: Math.floor(Math.random() * 1000),
      last_known_institution: null,
      x_concepts: [],
      counts_by_year: [],
      works_api_url: `https://api.openalex.org/works?filter=author.id:A${String(index + 1).padStart(9, "0")}`,
      updated_date: "2024-01-01",
      created_date: "2024-01-01",
    }));

    return OpenAlexResponseFactory.createResponse(authors);
  },

  /**
   * Create an institution response
   */
  createInstitutionResponse: (count = 1) => {
    const institutions = Array.from({ length: count }, (_, index) => ({
      id: `https://openalex.org/I${String(index + 1).padStart(9, "0")}`,
      ror: `https://ror.org/0${String(index + 1).padStart(8, "0")}`,
      display_name: `Test Institution ${index + 1}`,
      country_code: "US",
      type: "education",
      homepage_url: `https://institution${index + 1}.edu`,
      image_url: `https://institution${index + 1}.edu/logo.png`,
      image_thumbnail_url: `https://institution${index + 1}.edu/logo-thumb.png`,
      works_count: Math.floor(Math.random() * 1000),
      cited_by_count: Math.floor(Math.random() * 10000),
      x_concepts: [],
      counts_by_year: [],
      works_api_url: `https://api.openalex.org/works?filter=institution.id:I${String(index + 1).padStart(9, "0")}`,
      updated_date: "2024-01-01",
      created_date: "2024-01-01",
    }));

    return OpenAlexResponseFactory.createResponse(institutions);
  },
};

/**
 * Service mock factories
 */
export const ServiceMockFactory = {
  /**
   * Create GraphDataService mock
   */
  createGraphDataServiceMock: () => ({
    loadEntityGraph: vi.fn(),
    loadEntityIntoGraph: vi.fn(),
    loadEntityIntoRepository: vi.fn(),
    expandNode: vi.fn(),
    searchAndVisualize: vi.fn(),
    loadAllCachedNodes: vi.fn(),
  }),

  /**
   * Create QueryClient mock
   */
  createQueryClientMock: (): Partial<QueryClient> => ({
    getQueryData: vi.fn(),
    setQueryData: vi.fn(),
    getQueryState: vi.fn(),
    removeQueries: vi.fn(),
    refetchQueries: vi.fn(),
    clear: vi.fn(),
    invalidateQueries: vi.fn(),
    prefetchQuery: vi.fn(),
    fetchQuery: vi.fn(),
    getQueryCache: vi.fn(),
    getMutationCache: vi.fn(),
    defaultQueryOptions: vi.fn(),
    defaultMutationOptions: vi.fn(),
    mount: vi.fn(),
    unmount: vi.fn(),
  }),
};

/**
 * Store mock factories
 */
export const StoreMockFactory = {
  /**
   * Create GraphStore mock
   */
  createGraphStoreMock: () => ({
    isLoading: false,
    error: null,
    nodes: {},
    edges: [],
    traversalDepth: 2,
    pinnedNodes: new Set<string>(),
    setLoading: vi.fn(),
    setError: vi.fn(),
    clear: vi.fn(),
    calculateNodeDepths: vi.fn(),
    markNodeAsLoading: vi.fn(),
    addNode: vi.fn(),
    addEdge: vi.fn(),
    removeNode: vi.fn(),
    removeEdge: vi.fn(),
    updateNodePosition: vi.fn(),
    pinNode: vi.fn(),
    unpinNode: vi.fn(),
  }),

  /**
   * Create LayoutStore mock
   */
  createLayoutStoreMock: () => ({
    sidebarWidth: 300,
    isLeftSidebarOpen: true,
    isRightSidebarOpen: false,
    setSidebarWidth: vi.fn(),
    setLeftSidebarOpen: vi.fn(),
    setRightSidebarOpen: vi.fn(),
    toggleLeftSidebar: vi.fn(),
    toggleRightSidebar: vi.fn(),
  }),

  /**
   * Create SettingsStore mock
   */
  createSettingsStoreMock: () => ({
    theme: "light",
    language: "en",
    setTheme: vi.fn(),
    setLanguage: vi.fn(),
  }),
};

/**
 * Event mock factories
 */
export const EventMockFactory = {
  /**
   * Create a React mouse event
   */
  createMouseEvent: (overrides: Partial<React.MouseEvent> = {}): React.MouseEvent => ({
    preventDefault: vi.fn(),
    stopPropagation: vi.fn(),
    clientX: 100,
    clientY: 100,
    button: 0,
    buttons: 1,
    ctrlKey: false,
    shiftKey: false,
    altKey: false,
    metaKey: false,
    type: "click",
    target: document.createElement("div"),
    currentTarget: document.createElement("div"),
    eventPhase: Event.AT_TARGET,
    bubbles: true,
    cancelable: true,
    defaultPrevented: false,
    isTrusted: true,
    timeStamp: Date.now(),
    nativeEvent: new MouseEvent("click"),
    ...overrides,
  } as React.MouseEvent),

  /**
   * Create a native mouse event
   */
  createNativeMouseEvent: (overrides: Partial<MouseEvent> = {}): MouseEvent => ({
    preventDefault: vi.fn(),
    stopPropagation: vi.fn(),
    clientX: 100,
    clientY: 100,
    button: 0,
    buttons: 1,
    ctrlKey: false,
    shiftKey: false,
    altKey: false,
    metaKey: false,
    type: "click",
    target: document.createElement("div"),
    currentTarget: document.createElement("div"),
    eventPhase: Event.AT_TARGET,
    bubbles: true,
    cancelable: true,
    defaultPrevented: false,
    isTrusted: true,
    timeStamp: Date.now(),
    ...overrides,
  } as MouseEvent),

  /**
   * Create a context menu event
   */
  createContextMenuEvent: (x = 100, y = 100): React.MouseEvent => ({
    ...EventMockFactory.createMouseEvent({ clientX: x, clientY: y }),
    type: "contextmenu",
  }),

  /**
   * Create a keyboard event
   */
  createKeyboardEvent: (
    key: string,
    overrides: Partial<React.KeyboardEvent> = {}
  ): React.KeyboardEvent => ({
    preventDefault: vi.fn(),
    stopPropagation: vi.fn(),
    key,
    code: key,
    charCode: key.charCodeAt(0),
    keyCode: key.charCodeAt(0),
    ctrlKey: false,
    shiftKey: false,
    altKey: false,
    metaKey: false,
    type: "keydown",
    target: document.createElement("input"),
    currentTarget: document.createElement("input"),
    eventPhase: Event.AT_TARGET,
    bubbles: true,
    cancelable: true,
    defaultPrevented: false,
    isTrusted: true,
    timeStamp: Date.now(),
    nativeEvent: new KeyboardEvent("keydown", { key }),
    ...overrides,
  } as React.KeyboardEvent),
};

/**
 * Search options factory
 */
export const SearchOptionsFactory = {
  /**
   * Create default search options
   */
  createDefaultOptions: (overrides: Partial<SearchOptions> = {}): SearchOptions => ({
    query: "test query",
    entityTypes: ["works", "authors", "sources", "institutions"],
    includeExternalIds: true,
    preferExternalIdResults: false,
    limit: 20,
    ...overrides,
  }),

  /**
   * Create work-specific search options
   */
  createWorkSearchOptions: (overrides: Partial<SearchOptions> = {}): SearchOptions => ({
    ...SearchOptionsFactory.createDefaultOptions(),
    entityTypes: ["works"],
    ...overrides,
  }),

  /**
   * Create author-specific search options
   */
  createAuthorSearchOptions: (overrides: Partial<SearchOptions> = {}): SearchOptions => ({
    ...SearchOptionsFactory.createDefaultOptions(),
    entityTypes: ["authors"],
    ...overrides,
  }),
};

/**
 * Error factory for consistent error testing
 */
export const ErrorFactory = {
  /**
   * Create a standard error
   */
  createError: (message = "Test error", status = 500): Error => {
    const error = new Error(message);
    (error as any).status = status;
    return error;
  },

  /**
   * Create an OpenAlex API error
   */
  createOpenAlexError: (message = "API Error", status = 400) => {
    const error = ErrorFactory.createError(message, status);
    (error as any).isOpenAlexError = true;
    return error;
  },

  /**
   * Create a network error
   */
  createNetworkError: (message = "Network error"): Error => {
    const error = ErrorFactory.createError(message);
    (error as any).isNetworkError = true;
    return error;
  },

  /**
   * Create a timeout error
   */
  createTimeoutError: (message = "Request timeout"): Error => {
    const error = ErrorFactory.createError(message);
    (error as any).isTimeoutError = true;
    return error;
  },
};

/**
 * Timer and async utilities for testing
 */
export const TimerMocks = {
  /**
   * Create a controlled timer for testing time-based functionality
   */
  createControlledTimer: () => {
    let currentTime = 0;
    const timer = {
      now: vi.fn().mockImplementation(() => currentTime),
      advance: (ms: number) => {
        currentTime += ms;
      },
      setTime: (time: number) => {
        currentTime = time;
      },
      reset: () => {
        currentTime = 0;
      },
    };

    // Replace global performance.now
    Object.defineProperty(global, "performance", {
      value: { now: timer.now },
      configurable: true,
    });

    return timer;
  },

  /**
   * Create a promise that resolves after a delay
   */
  createDelayedPromise: <T>(value: T, delay = 100): Promise<T> => {
    return new Promise((resolve) => {
      setTimeout(() => resolve(value), delay);
    });
  },

  /**
   * Create a promise that rejects after a delay
   */
  createDelayedRejection: (error: Error, delay = 100): Promise<never> => {
    return new Promise((_, reject) => {
      setTimeout(() => reject(error), delay);
    });
  },
};

/**
 * Mock data generators for performance testing
 */
export const DataGenerator = {
  /**
   * Generate a large dataset for performance testing
   */
  generateLargeDataset: <T>(
    generator: (index: number) => T,
    count: number
  ): T[] => {
    return Array.from({ length: count }, (_, index) => generator(index));
  },

  /**
   * Generate random string of specified length
   */
  generateRandomString: (length = 10): string => {
    const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
    return Array.from({ length }, () =>
      chars.charAt(Math.floor(Math.random() * chars.length))
    ).join("");
  },

  /**
   * Generate random ID with prefix
   */
  generateRandomId: (prefix = "test"): string => {
    return `${prefix}_${DataGenerator.generateRandomString(8)}`;
  },
};