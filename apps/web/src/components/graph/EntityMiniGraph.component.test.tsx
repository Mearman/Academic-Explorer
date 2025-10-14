/**
 * Component tests for EntityMiniGraph component
 * @vitest-environment jsdom
 */

import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock ResizeObserver before importing Mantine
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock window.matchMedia before importing Mantine
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

import { MantineProvider } from "@mantine/core";
import { EntityMiniGraph } from "./EntityMiniGraph";
import type { OpenAlexEntity } from "@academic-explorer/client";
import type { GraphAdapterType } from "./adapters/GraphAdapterFactory";

// Mock the theme colors hook
vi.mock("@/hooks/use-theme-colors", () => ({
  useThemeColors: () => ({
    colors: {
      text: {
        primary: "#000",
        secondary: "#666",
        tertiary: "#999",
        inverse: "#fff",
      },
      background: {
        primary: "#fff",
        secondary: "#f5f5f5",
        tertiary: "#eee",
        overlay: "rgba(0,0,0,0.8)",
        blur: "rgba(0,0,0,0.8)",
      },
      border: {
        primary: "#ccc",
        secondary: "#ddd",
      },
      primary: "#228be6",
      success: "#40c057",
      warning: "#fd7e14",
      error: "#fa5252",
      info: "#228be6",
      entity: {
        work: "#228be6", // blue
        author: "#51cf66", // author palette (green)
        source: "#c084fc", // source palette (purple)
        institution: "#fb923c", // institution palette (orange)
        concept: "#f06595", // pink
        topic: "#fa5252", // red
        publisher: "#22b8cf", // teal
        funder: "#3bc9db", // cyan
      },
    },
    getColor: vi.fn(),
    getEntityColor: vi.fn(),
    getEntityColorShade: vi.fn(),
    isDark: false,
    theme: {},
  }),
}));

// Mock the adapter factory to avoid actual imports
vi.mock("./adapters/GraphAdapterFactory", () => ({
  GraphAdapterFactory: {
    createAdapter: vi.fn().mockResolvedValue({
      convertEntitiesToGraphData: vi.fn(() => ({
        nodes: [
          { id: "test-entity", label: "Test Entity", color: "primary" },
          { id: "related-1", label: "Related 1", color: "secondary" },
        ],
        links: [{ source: "test-entity", target: "related-1" }],
      })),
      render: vi.fn(() => <div data-testid="mock-graph">Mock Graph</div>),
    }),
    getDefaultAdapter: vi.fn(() => "reactflow-hierarchical"),
    getAvailableAdapters: vi.fn(() => [
      "reactflow-hierarchical",
      "react-force-graph-3d",
    ]),
  },
}));

// Mock the adapter factory to avoid actual imports
vi.mock("./adapters/GraphAdapterFactory", () => ({
  GraphAdapterFactory: {
    createAdapter: vi.fn().mockResolvedValue({
      convertEntitiesToGraphData: vi.fn(() => ({
        nodes: [
          { id: "test-entity", label: "Test Entity", color: "primary" },
          { id: "related-1", label: "Related 1", color: "secondary" },
        ],
        links: [{ source: "test-entity", target: "related-1" }],
      })),
      render: vi.fn(() => <div data-testid="mock-graph">Mock Graph</div>),
    }),
    getDefaultAdapter: vi.fn(() => "reactflow-hierarchical"),
    getAvailableAdapters: vi.fn(() => [
      "reactflow-hierarchical",
      "react-force-graph-3d",
    ]),
  },
  type: "reactflow-hierarchical",
}));

const renderWithMantine = (component: React.ReactElement) => {
  return render(<MantineProvider>{component}</MantineProvider>);
};

const mockEntity: OpenAlexEntity = {
  id: "https://openalex.org/W123456789",
  display_name: "Test Work",
  cited_by_count: 10,
  counts_by_year: [],
  updated_date: "2023-01-01T00:00:00Z",
  created_date: "2023-01-01T00:00:00Z",
  doi: "10.1234/test",
  title: "Test Work Title",
  publication_year: 2023,
  publication_date: "2023-01-01",
  ids: {
    openalex: "https://openalex.org/W123456789",
    doi: "https://doi.org/10.1234/test",
  },
  primary_location: undefined,
  best_oa_location: undefined,
  locations: [],
  locations_count: 0,
  authorships: [],
  countries_distinct_count: 1,
  institutions_distinct_count: 1,
  corresponding_author_ids: [],
  corresponding_institution_ids: [],
  has_fulltext: false,
  cited_by_api_url: "https://api.openalex.org/works/W123456789/cited_by",
  type: "journal-article",
  indexed_in: ["crossref"],
  open_access: {
    is_oa: false,
    any_repository_has_fulltext: false,
  },
  concepts: [],
  mesh: [],
  referenced_works: [],
  referenced_works_count: 0,
  related_works: [],
  is_retracted: false,
  is_paratext: false,
};

const mockRelatedEntities: OpenAlexEntity[] = [
  {
    id: "https://openalex.org/A123456789",
    display_name: "Test Author",
    cited_by_count: 5,
    counts_by_year: [],
    updated_date: "2023-01-01T00:00:00Z",
    created_date: "2023-01-01T00:00:00Z",
    orcid: "https://orcid.org/0000-0000-0000-0000",
    display_name_alternatives: [],
    ids: {
      openalex: "https://openalex.org/A123456789",
      orcid: "https://orcid.org/0000-0000-0000-0000",
    },
    last_known_institutions: [],
    x_concepts: [],
    works_count: 10,
    works_api_url: "https://api.openalex.org/authors/A123456789/works",
  },
];

describe("EntityMiniGraph", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("should render with default props", async () => {
    renderWithMantine(
      <EntityMiniGraph
        entity={mockEntity}
        relatedEntities={mockRelatedEntities}
      />,
    );

    // Wait for the adapter to load
    await waitFor(() => {
      expect(screen.getByTestId("mock-graph")).toBeTruthy();
    });
  });

  it("should show adapter selector by default", async () => {
    renderWithMantine(
      <EntityMiniGraph
        entity={mockEntity}
        relatedEntities={mockRelatedEntities}
      />,
    );

    // Wait for the component to render
    await waitFor(() => {
      expect(screen.getByTestId("mock-graph")).toBeTruthy();
    });

    // Check if the select dropdown is present
    const select = screen.getByRole("combobox");
    expect(select).toBeTruthy();
  });

  it("should hide selector when showSelector is false", async () => {
    renderWithMantine(
      <EntityMiniGraph
        entity={mockEntity}
        relatedEntities={mockRelatedEntities}
        showSelector={false}
      />,
    );

    // Wait for the component to render
    await waitFor(() => {
      expect(screen.getByTestId("mock-graph")).toBeTruthy();
    });

    // Check that the select dropdown is not present
    const select = screen.queryByRole("combobox");
    expect(select).toBeNull();
  });

  it("should show loading state initially", () => {
    renderWithMantine(
      <EntityMiniGraph
        entity={mockEntity}
        relatedEntities={mockRelatedEntities}
      />,
    );

    // Should show loading text initially
    expect(screen.getByText("Loading graph...")).toBeTruthy();
  });

  it("passes entity display_names and entity-type colors to graph adapter", async () => {
    const mockAdapter = {
      render: vi.fn(() => <div data-testid="mock-graph">Mock Graph</div>),
      convertEntitiesToGraphData: vi.fn(() => ({ nodes: [], links: [] })),
      fitView: vi.fn(),
    };

    // Mock the factory to return our mock adapter
    vi.mocked(GraphAdapterFactory.createAdapter).mockResolvedValue(mockAdapter);
    vi.mocked(GraphAdapterFactory.getDefaultAdapter).mockReturnValue(
      "reactflow-hierarchical",
    );

    renderWithMantine(
      <EntityMiniGraph
        entity={mockEntity}
        relatedEntities={mockRelatedEntities}
        adapterType="reactflow-hierarchical"
      />,
    );

    // Wait for the adapter to be created and data to be converted
    await waitFor(() => {
      expect(GraphAdapterFactory.createAdapter).toHaveBeenCalledWith(
        "reactflow-hierarchical",
        expect.any(Object),
      );
    });

    // Verify that convertEntitiesToGraphData was called with the correct entities
    expect(mockAdapter.convertEntitiesToGraphData).toHaveBeenCalledWith(
      mockEntity, // main entity with display_name
      mockRelatedEntities, // related entities with display_names
    );

    // Verify that render was called with theme colors that include getEntityColor
    expect(mockAdapter.render).toHaveBeenCalledWith(
      expect.any(Object), // graph data
      expect.objectContaining({
        themeColors: expect.objectContaining({
          getEntityColor: expect.any(Function),
        }),
      }),
    );
  });
});
