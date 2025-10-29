import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MantineProvider } from "@mantine/core";
import { cachedOpenAlex } from "@academic-explorer/client";

// Mock cachedOpenAlex client
vi.mock("@academic-explorer/client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@academic-explorer/client")>();
  return {
    ...actual,
    cachedOpenAlex: {
      client: {
        sources: {
          getSource: vi.fn(),
        },
      },
    },
  };
});

// Mock router hooks
vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-router")>();
  return {
    ...actual,
    useParams: vi.fn(),
    useSearch: vi.fn(),
  };
});

// Import after mocks
import { useParams, useSearch } from "@tanstack/react-router";
import SourceRoute from "./$sourceId.lazy";

// Synthetic mock data for source
const mockSourceData = {
  id: "https://openalex.org/S123",
  display_name: "Sample Source",
  issn_l: "1234-5678",
  type: "journal",
  works_count: 5000,
  cited_by_count: 10000,
};

describe("SourceRoute Integration Tests", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, staleTime: Infinity },
        mutations: { retry: false },
      },
    });

    // Mock useParams
    vi.mocked(useParams).mockReturnValue({ sourceId: "S123" });

    // Mock useSearch
    vi.mocked(useSearch).mockReturnValue({});

    // Mock successful API response by default
    vi.mocked(cachedOpenAlex.client.sources.getSource).mockResolvedValue(
      mockSourceData as any,
    );
  });

  afterEach(() => {
    cleanup();
    queryClient.clear();
    vi.clearAllMocks();
  });

  it("renders loading state initially", async () => {
    // Make the API call slow to test loading state
    vi.mocked(cachedOpenAlex.client.sources.getSource).mockImplementation(
      () => new Promise(() => {}), // Never resolves
    );

    render(
      <QueryClientProvider client={queryClient}>
        <MantineProvider>
          <SourceRoute />
        </MantineProvider>
      </QueryClientProvider>,
    );

    expect(screen.getByText("Loading Source...")).toBeInTheDocument();
    expect(screen.getByText("Source ID: S123")).toBeInTheDocument();
  });

  it("renders error state when API fails", async () => {
    const mockError = new Error("API Error");
    vi.mocked(cachedOpenAlex.client.sources.getSource).mockRejectedValue(
      mockError,
    );

    render(
      <QueryClientProvider client={queryClient}>
        <MantineProvider>
          <SourceRoute />
        </MantineProvider>
      </QueryClientProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText("Error Loading Source")).toBeInTheDocument();
    });

    expect(screen.getByText("Source ID: S123")).toBeInTheDocument();
    expect(screen.getByText("Error: Error: API Error")).toBeInTheDocument();
  });

  it("renders institution data in rich view by default", async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MantineProvider>
          <SourceRoute />
        </MantineProvider>
      </QueryClientProvider>,
    );

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Sample Source" })).toBeInTheDocument();
    });

    // EntityDataDisplay shows section headers and formatted field names
    expect(screen.getByText(/Basic Information/)).toBeInTheDocument();
    expect(screen.getByText(/Display Name:/)).toBeInTheDocument();
    // Name appears in h1 and EntityDataDisplay - just verify sections exist
    expect(screen.getAllByText(/Sample Source/).length).toBeGreaterThan(0);
    expect(screen.getByText(/Type:/)).toBeInTheDocument();
    // ISSN-L field is displayed with formatted name
    expect(screen.getByText(/Issn L:/)).toBeInTheDocument();

    // Should have toggle button
    expect(screen.getByText(/Toggle Raw View/)).toBeInTheDocument();

    // Should NOT show JSON by default
    expect(screen.queryByText(/"id":/)).not.toBeInTheDocument();
  });

  it("toggles to raw view and renders JSON", async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MantineProvider>
          <SourceRoute />
        </MantineProvider>
      </QueryClientProvider>,
    );

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Sample Source" })).toBeInTheDocument();
    });

    // Click toggle button
    const toggleButton = screen.getByText(/Toggle Raw View/);
    fireEvent.click(toggleButton);

    // Should show JSON
    await waitFor(() => {
      expect(screen.getByText(/"display_name":/)).toBeInTheDocument();
    });

    // Verify JSON content is visible
    expect(screen.getByText(/"id":/)).toBeInTheDocument();
    expect(screen.getByText(/"issn_l":/)).toBeInTheDocument();
  });

  it("toggles back to rich view from raw view", async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MantineProvider>
          <SourceRoute />
        </MantineProvider>
      </QueryClientProvider>,
    );

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Sample Source" })).toBeInTheDocument();
    });

    // Toggle to raw
    fireEvent.click(screen.getByText(/Toggle Raw View/));
    await waitFor(() => {
      expect(screen.getByText(/"display_name":/)).toBeInTheDocument();
    });

    // Toggle back to rich
    fireEvent.click(screen.getByText(/Toggle Rich View/));
    await waitFor(() => {
      expect(screen.getByText(/Name:/)).toBeInTheDocument();
    });

    // Should NOT show JSON
    expect(screen.queryByText(/"id":/)).not.toBeInTheDocument();
  });

  it("does not refetch data on view toggle", async () => {
    const getSourceMock = vi.mocked(
      cachedOpenAlex.client.sources.getSource,
    );

    render(
      <QueryClientProvider client={queryClient}>
        <MantineProvider>
          <SourceRoute />
        </MantineProvider>
      </QueryClientProvider>,
    );

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Sample Source" })).toBeInTheDocument();
    });

    // Should have been called once on mount
    expect(getSourceMock).toHaveBeenCalledTimes(1);

    // Toggle to raw
    fireEvent.click(screen.getByText(/Toggle Raw View/));
    await waitFor(() => {
      expect(screen.getByText(/"display_name":/)).toBeInTheDocument();
    });

    // Should still be called only once
    expect(getSourceMock).toHaveBeenCalledTimes(1);

    // Toggle back to rich
    fireEvent.click(screen.getByText(/Toggle Rich View/));
    await waitFor(() => {
      expect(screen.getByText(/Name:/)).toBeInTheDocument();
    });

    // Should still be called only once
    expect(getSourceMock).toHaveBeenCalledTimes(1);
  });
});
