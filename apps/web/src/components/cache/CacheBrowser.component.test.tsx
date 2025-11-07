/**
 * @vitest-environment jsdom
 */

import { MantineProvider } from "@mantine/core";
import { render, screen, cleanup } from "@testing-library/react";
import { describe, expect, it, vi, afterEach } from "vitest";
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
  BaseTable: ({ data }: any) => (
    <div data-testid="base-table">{data?.length || 0} rows</div>
  ),
}));

const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <MantineProvider>{children}</MantineProvider>
);

describe("CacheBrowser", () => {
  afterEach(() => {
    cleanup();
  });
  it("renders without crashing", () => {
    render(
      <TestWrapper>
        <CacheBrowser />
      </TestWrapper>,
    );

    // Component should render immediately since useEffect is mocked
    expect(screen.getByText("Cache Browser")).toBeInTheDocument();
    expect(
      screen.getByText(/The Cache Browser component has been temporarily removed/),
    ).toBeInTheDocument();
  });

  it("renders CLI tools suggestion", () => {
    render(
      <TestWrapper>
        <CacheBrowser />
      </TestWrapper>,
    );

    // Check for CLI tools suggestion
    expect(screen.getByText(/For cache management, please use the CLI tools/)).toBeInTheDocument();
  });

  it("renders future version message", () => {
    render(
      <TestWrapper>
        <CacheBrowser />
      </TestWrapper>,
    );

    // Check for future version message
    expect(screen.getByText(/This functionality may be restored in a future version/)).toBeInTheDocument();
  });
});
