/**
 * @vitest-environment jsdom
 */

import { MantineProvider } from "@mantine/core";
import { act, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CacheBrowser } from "./CacheBrowser";

// Mock the cache browser service
vi.mock("@academic-explorer/utils", () => ({
  cacheBrowserService: {
    browse: vi.fn().mockResolvedValue({
      entities: [],
      stats: {
        totalEntities: 0,
        entitiesByType: {},
        entitiesByStorage: {},
        totalCacheSize: 0,
        oldestEntry: 0,
        newestEntry: 0,
      },
      hasMore: false,
      totalMatching: 0,
    }),
  },
  logger: {
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock useEffect to prevent async loading
vi.mock("react", async () => {
  const actualReact = await vi.importActual("react");
  return {
    ...actualReact,
    useEffect: vi.fn(),
  };
});

// Mock react-router
vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => vi.fn(),
}));

// Mock BaseTable component
vi.mock("@/components/tables/BaseTable", () => ({
  BaseTable: ({ data, columns }: any) => (
    <div data-testid="base-table">{data?.length || 0} rows</div>
  ),
}));

const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <MantineProvider>{children}</MantineProvider>
);

describe("CacheBrowser", () => {
  it("renders without crashing", () => {
    render(
      <TestWrapper>
        <CacheBrowser />
      </TestWrapper>,
    );

    // Component should render immediately since useEffect is mocked
    expect(screen.getByText("Cache Browser")).toBeInTheDocument();
    expect(
      screen.getByText("Browse and manage cached OpenAlex entities"),
    ).toBeInTheDocument();
  });

  it("renders filter controls", () => {
    render(
      <TestWrapper>
        <CacheBrowser />
      </TestWrapper>,
    );

    // Check for filter elements - component should render synchronously since useEffect is mocked
    const searchInputs = screen.getAllByPlaceholderText("Search entities...");
    expect(searchInputs.length).toBeGreaterThan(0);

    const entityTypeInputs = screen.getAllByPlaceholderText("Entity types");
    expect(entityTypeInputs.length).toBeGreaterThan(0);

    const storageLocationInputs =
      screen.getAllByPlaceholderText("Storage locations");
    expect(storageLocationInputs.length).toBeGreaterThan(0);

    // Check for filter section heading
    const filterElements = screen.getAllByText("Filters");
    expect(filterElements.length).toBeGreaterThan(0);
  });

  it("renders statistics section", () => {
    render(
      <TestWrapper>
        <CacheBrowser />
      </TestWrapper>,
    );

    // Statistics should render synchronously since useEffect is mocked
    const totalEntitiesElements = screen.getAllByText("Total Entities");
    expect(totalEntitiesElements.length).toBeGreaterThan(0);

    const totalSizeElements = screen.getAllByText("Total Size");
    expect(totalSizeElements.length).toBeGreaterThan(0);
  });
});
