import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
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
        institutions: {
          getInstitution: vi.fn(),
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
import InstitutionRoute from "./$institutionId.lazy";

// Synthetic mock data for institution
const mockInstitutionData = {
  id: "https://openalex.org/I123",
  display_name: "Sample Institution",
  country_code: "US",
  type: "university",
  works_count: 5000,
  cited_by_count: 10000,
  ror: "https://ror.org/123",
};

describe("InstitutionRoute Integration Tests", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, staleTime: Infinity },
        mutations: { retry: false },
      },
    });

    // Mock useParams
    vi.mocked(useParams).mockReturnValue({ institutionId: "I123" });

    // Mock successful API response by default
    vi.mocked(cachedOpenAlex.client.institutions.getInstitution).mockResolvedValue(
      mockInstitutionData as any,
    );
  });

  afterEach(() => {
    queryClient.clear();
    vi.clearAllMocks();
  });

  it("renders loading state initially", async () => {
    // Make the API call slow to test loading state
    vi.mocked(cachedOpenAlex.client.institutions.getInstitution).mockImplementation(
      () => new Promise(() => {}), // Never resolves
    );

    render(
      <QueryClientProvider client={queryClient}>
        <MantineProvider>
          <InstitutionRoute />
        </MantineProvider>
      </QueryClientProvider>,
    );

    expect(screen.getByText("Loading Institution...")).toBeInTheDocument();
    expect(screen.getByText("Institution ID: I123")).toBeInTheDocument();
  });

  it("renders error state when API fails", async () => {
    const mockError = new Error("API Error");
    vi.mocked(cachedOpenAlex.client.institutions.getInstitution).mockRejectedValue(
      mockError,
    );

    render(
      <QueryClientProvider client={queryClient}>
        <MantineProvider>
          <InstitutionRoute />
        </MantineProvider>
      </QueryClientProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText("Error Loading Institution")).toBeInTheDocument();
    });

    expect(screen.getByText("Institution ID: I123")).toBeInTheDocument();
    expect(screen.getByText("Error: Error: API Error")).toBeInTheDocument();
  });

  it("renders institution data in rich view by default", async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MantineProvider>
          <InstitutionRoute />
        </MantineProvider>
      </QueryClientProvider>,
    );

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Sample Institution" })).toBeInTheDocument();
    });

    expect(screen.getByText(/Name:/)).toBeInTheDocument();
    expect(screen.getByText(/Works:/)).toBeInTheDocument();
    expect(screen.getByText(/Citations:/)).toBeInTheDocument();
    expect(screen.getByText(/Type:/)).toBeInTheDocument();
    expect(screen.getByText(/Country:/)).toBeInTheDocument();
    expect(screen.getByText(/ROR:/)).toBeInTheDocument();

    // Should have toggle button
    expect(screen.getByText(/Toggle Raw View/)).toBeInTheDocument();

    // Should NOT show JSON by default
    expect(screen.queryByText(/"id":/)).not.toBeInTheDocument();
  });

  it("toggles to raw view and renders JSON", async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MantineProvider>
          <InstitutionRoute />
        </MantineProvider>
      </QueryClientProvider>,
    );

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Sample Institution" })).toBeInTheDocument();
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
    expect(screen.getByText(/"country_code":/)).toBeInTheDocument();
  });

  it("toggles back to rich view from raw view", async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MantineProvider>
          <InstitutionRoute />
        </MantineProvider>
      </QueryClientProvider>,
    );

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Sample Institution" })).toBeInTheDocument();
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
    const getInstitutionMock = vi.mocked(
      cachedOpenAlex.client.institutions.getInstitution,
    );

    render(
      <QueryClientProvider client={queryClient}>
        <MantineProvider>
          <InstitutionRoute />
        </MantineProvider>
      </QueryClientProvider>,
    );

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Sample Institution" })).toBeInTheDocument();
    });

    // Should have been called once on mount
    expect(getInstitutionMock).toHaveBeenCalledTimes(1);

    // Toggle to raw
    fireEvent.click(screen.getByText(/Toggle Raw View/));
    await waitFor(() => {
      expect(screen.getByText(/"display_name":/)).toBeInTheDocument();
    });

    // Should still be called only once
    expect(getInstitutionMock).toHaveBeenCalledTimes(1);

    // Toggle back to rich
    fireEvent.click(screen.getByText(/Toggle Rich View/));
    await waitFor(() => {
      expect(screen.getByText(/Name:/)).toBeInTheDocument();
    });

    // Should still be called only once
    expect(getInstitutionMock).toHaveBeenCalledTimes(1);
  });
});
