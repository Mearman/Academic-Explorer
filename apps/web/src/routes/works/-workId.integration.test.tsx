import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MantineProvider } from "@mantine/core";
import { cachedOpenAlex } from "@academic-explorer/client";

// Mock cachedOpenAlex client
vi.mock("@academic-explorer/client", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    cachedOpenAlex: {
      client: {
        works: {
          getWork: vi.fn(),
        },
      },
    },
  };
});

// Mock router hooks
vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    useParams: vi.fn(),
  };
});

// Import after mocks
import { useParams } from "@tanstack/react-router";
import { Route as WorkRouteExport } from "./$workId.lazy";

// Extract the component from the lazy route
const WorkRoute = WorkRouteExport.options.component!;

// Synthetic mock data for work
const mockWorkData = {
  id: "https://openalex.org/W123",
  display_name: "Sample Work Title",
  title: "Sample Work Title",
  publication_year: 2023,
  cited_by_count: 100,
  type: "journal-article",
};

describe("WorkRoute Integration Tests", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, staleTime: Infinity },
        mutations: { retry: false },
      },
    });

    // Mock useParams
    vi.mocked(useParams).mockReturnValue({ workId: "W123" });

    // Mock successful API response by default
    vi.mocked(cachedOpenAlex.client.works.getWork).mockResolvedValue(
      mockWorkData as any,
    );
  });

  afterEach(() => {
    cleanup();
    queryClient.clear();
    vi.clearAllMocks();
  });

  it("renders loading state initially", async () => {
    // Make the API call slow to test loading state
    vi.mocked(cachedOpenAlex.client.works.getWork).mockImplementation(
      () => new Promise(() => {}), // Never resolves
    );

    render(
      <QueryClientProvider client={queryClient}>
        <MantineProvider>
          <WorkRoute />
        </MantineProvider>
      </QueryClientProvider>,
    );

    expect(screen.getByText("Loading Work...")).toBeInTheDocument();
    expect(screen.getByText("Work ID: W123")).toBeInTheDocument();
  });

  it("renders error state when API fails", async () => {
    const mockError = new Error("API Error");
    vi.mocked(cachedOpenAlex.client.works.getWork).mockRejectedValue(
      mockError,
    );

    render(
      <QueryClientProvider client={queryClient}>
        <MantineProvider>
          <WorkRoute />
        </MantineProvider>
      </QueryClientProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText("Error Loading Work")).toBeInTheDocument();
    });

    expect(screen.getByText("Work ID: W123")).toBeInTheDocument();
    expect(screen.getByText("Error: Error: API Error")).toBeInTheDocument();
  });

  it("renders work data in rich view by default", async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MantineProvider>
          <WorkRoute />
        </MantineProvider>
      </QueryClientProvider>,
    );

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Sample Work Title" })).toBeInTheDocument();
    });

    expect(screen.getByText(/Title:/)).toBeInTheDocument();
    expect(screen.getByText(/Year:/)).toBeInTheDocument();
    expect(screen.getByText(/Citations:/)).toBeInTheDocument();
    expect(screen.getByText(/Type:/)).toBeInTheDocument();

    // Should have toggle button
    expect(screen.getByText(/Toggle Raw View/)).toBeInTheDocument();

    // Should NOT show JSON by default
    expect(screen.queryByText(/"id":/)).not.toBeInTheDocument();
  });

  it("toggles to raw view and renders JSON", async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MantineProvider>
          <WorkRoute />
        </MantineProvider>
      </QueryClientProvider>,
    );

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Sample Work Title" })).toBeInTheDocument();
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
    expect(screen.getByText(/"publication_year":/)).toBeInTheDocument();
  });

  it("toggles back to rich view from raw view", async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MantineProvider>
          <WorkRoute />
        </MantineProvider>
      </QueryClientProvider>,
    );

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Sample Work Title" })).toBeInTheDocument();
    });

    // Toggle to raw
    fireEvent.click(screen.getByText(/Toggle Raw View/));
    await waitFor(() => {
      expect(screen.getByText(/"display_name":/)).toBeInTheDocument();
    });

    // Toggle back to rich
    fireEvent.click(screen.getByText(/Toggle Rich View/));
    await waitFor(() => {
      expect(screen.getByText(/Title:/)).toBeInTheDocument();
    });

    // Should NOT show JSON
    expect(screen.queryByText(/"id":/)).not.toBeInTheDocument();
  });

  it("does not refetch data on view toggle", async () => {
    const getWorkMock = vi.mocked(
      cachedOpenAlex.client.works.getWork,
    );

    render(
      <QueryClientProvider client={queryClient}>
        <MantineProvider>
          <WorkRoute />
        </MantineProvider>
      </QueryClientProvider>,
    );

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Sample Work Title" })).toBeInTheDocument();
    });

    // Should have been called once on mount
    expect(getWorkMock).toHaveBeenCalledTimes(1);

    // Toggle to raw
    fireEvent.click(screen.getByText(/Toggle Raw View/));
    await waitFor(() => {
      expect(screen.getByText(/"display_name":/)).toBeInTheDocument();
    });

    // Should still be called only once
    expect(getWorkMock).toHaveBeenCalledTimes(1);

    // Toggle back to rich
    fireEvent.click(screen.getByText(/Toggle Rich View/));
    await waitFor(() => {
      expect(screen.getByText(/Title:/)).toBeInTheDocument();
    });

    // Should still be called only once
    expect(getWorkMock).toHaveBeenCalledTimes(1);
  });
});
