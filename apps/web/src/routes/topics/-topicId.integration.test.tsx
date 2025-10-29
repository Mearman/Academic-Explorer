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
        topics: {
          getTopic: vi.fn(),
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
import TopicRoute from "./$topicId.lazy";

// Synthetic mock data for topic
const mockTopicData = {
  id: "https://openalex.org/T123",
  display_name: "Sample Topic",
  works_count: 5000,
  cited_by_count: 10000,
  description: "A sample topic description",
};

describe("TopicRoute Integration Tests", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, staleTime: Infinity },
        mutations: { retry: false },
      },
    });

    // Mock useParams
    vi.mocked(useParams).mockReturnValue({ topicId: "T123" });

    // Mock useSearch
    vi.mocked(useSearch).mockReturnValue({});

    // Mock successful API response by default
    vi.mocked(cachedOpenAlex.client.topics.getTopic).mockResolvedValue(
      mockTopicData as any,
    );
  });

  afterEach(() => {
    cleanup();
    queryClient.clear();
    vi.clearAllMocks();
  });

  it("renders loading state initially", async () => {
    // Make the API call slow to test loading state
    vi.mocked(cachedOpenAlex.client.topics.getTopic).mockImplementation(
      () => new Promise(() => {}), // Never resolves
    );

    render(
      <QueryClientProvider client={queryClient}>
        <MantineProvider>
          <TopicRoute />
        </MantineProvider>
      </QueryClientProvider>,
    );

    expect(screen.getByText("Loading Topic...")).toBeInTheDocument();
    expect(screen.getByText("Topic ID: T123")).toBeInTheDocument();
  });

  it("renders error state when API fails", async () => {
    const mockError = new Error("API Error");
    vi.mocked(cachedOpenAlex.client.topics.getTopic).mockRejectedValue(
      mockError,
    );

    render(
      <QueryClientProvider client={queryClient}>
        <MantineProvider>
          <TopicRoute />
        </MantineProvider>
      </QueryClientProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText("Error Loading Topic")).toBeInTheDocument();
    });

    expect(screen.getByText("Topic ID: T123")).toBeInTheDocument();
    expect(screen.getByText("Error: Error: API Error")).toBeInTheDocument();
  });

  it("renders topic data in rich view by default", async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MantineProvider>
          <TopicRoute />
        </MantineProvider>
      </QueryClientProvider>,
    );

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Sample Topic" })).toBeInTheDocument();
    });

    expect(screen.getByText(/Name:/)).toBeInTheDocument();
    expect(screen.getByText(/Works:/)).toBeInTheDocument();
    expect(screen.getByText(/Citations:/)).toBeInTheDocument();
    expect(screen.getByText(/Description:/)).toBeInTheDocument();

    // Should have toggle button
    expect(screen.getByText(/Toggle Raw View/)).toBeInTheDocument();

    // Should NOT show JSON by default
    expect(screen.queryByText(/"id":/)).not.toBeInTheDocument();
  });

  it("toggles to raw view and renders JSON", async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MantineProvider>
          <TopicRoute />
        </MantineProvider>
      </QueryClientProvider>,
    );

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Sample Topic" })).toBeInTheDocument();
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
    expect(screen.getByText(/"description":/)).toBeInTheDocument();
  });

  it("toggles back to rich view from raw view", async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MantineProvider>
          <TopicRoute />
        </MantineProvider>
      </QueryClientProvider>,
    );

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Sample Topic" })).toBeInTheDocument();
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
    const getTopicMock = vi.mocked(
      cachedOpenAlex.client.topics.getTopic,
    );

    render(
      <QueryClientProvider client={queryClient}>
        <MantineProvider>
          <TopicRoute />
        </MantineProvider>
      </QueryClientProvider>,
    );

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Sample Topic" })).toBeInTheDocument();
    });

    // Should have been called once on mount
    expect(getTopicMock).toHaveBeenCalledTimes(1);

    // Toggle to raw
    fireEvent.click(screen.getByText(/Toggle Raw View/));
    await waitFor(() => {
      expect(screen.getByText(/"display_name":/)).toBeInTheDocument();
    });

    // Should still be called only once
    expect(getTopicMock).toHaveBeenCalledTimes(1);

    // Toggle back to rich
    fireEvent.click(screen.getByText(/Toggle Rich View/));
    await waitFor(() => {
      expect(screen.getByText(/Name:/)).toBeInTheDocument();
    });

    // Should still be called only once
    expect(getTopicMock).toHaveBeenCalledTimes(1);
  });
});
