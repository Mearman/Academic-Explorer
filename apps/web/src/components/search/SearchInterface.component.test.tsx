/**
 * Component tests for SearchInterface component
 * @vitest-environment jsdom
 */

import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
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
import { SearchInterface } from "./SearchInterface";

// Mock the data-helpers module
vi.mock("@academic-explorer/utils", () => ({
  debouncedSearch: vi.fn((callback: () => void) => {
    callback();
  }),
  normalizeSearchQuery: vi.fn((query: string) => query.trim().toLowerCase()),
  isValidSearchQuery: vi.fn((query: string) => query.trim().length >= 2),
}));

const renderWithMantine = (component: React.ReactElement) => {
  return render(<MantineProvider>{component}</MantineProvider>);
};

describe("SearchInterface", () => {
  const mockOnSearch = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup(); // Clean up DOM between tests
  });

  it("should render search interface with default props", () => {
    renderWithMantine(<SearchInterface onSearch={mockOnSearch} />);

    expect(screen.getByText(/Search Academic Literature/i)).toBeTruthy();
    expect(screen.getByPlaceholderText(/Search academic works/i)).toBeTruthy();
    expect(screen.getByRole("button", { name: /search/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /show filters/i })).toBeTruthy();
  });

  it("should render with custom placeholder", () => {
    const customPlaceholder = "Custom search placeholder";
    renderWithMantine(
      <SearchInterface
        onSearch={mockOnSearch}
        placeholder={customPlaceholder}
      />,
    );

    expect(
      screen.getByPlaceholderText(/Custom search placeholder/i),
    ).toBeTruthy();
  });

  it("should hide date filter when showDateFilter is false", () => {
    renderWithMantine(
      <SearchInterface onSearch={mockOnSearch} showDateFilter={false} />,
    );

    expect(screen.queryByRole("button", { name: /show filters/i })).toBeNull();
  });

  it("should handle search input changes", () => {
    renderWithMantine(<SearchInterface onSearch={mockOnSearch} />);

    const searchInput = screen.getByPlaceholderText(
      /Search academic works, authors, institutions/i,
    );
    fireEvent.change(searchInput, { target: { value: "test query" } });

    expect((searchInput as HTMLInputElement).value).toBe("test query");
  });

  it("should call onSearch when search button is clicked", () => {
    renderWithMantine(<SearchInterface onSearch={mockOnSearch} />);

    const searchInput = screen.getByPlaceholderText(
      /Search academic works, authors, institutions/i,
    );
    const searchButton = screen.getByRole("button", { name: /search/i });

    fireEvent.change(searchInput, { target: { value: "test query" } });
    fireEvent.click(searchButton);

    expect(mockOnSearch).toHaveBeenCalledWith({
      query: "test query",
      startDate: null,
      endDate: null,
    });
  });

  it("should show loading state", () => {
    renderWithMantine(
      <SearchInterface onSearch={mockOnSearch} isLoading={true} />,
    );

    const searchInput = screen.getByPlaceholderText(
      /Search academic works, authors, institutions/i,
    );
    const searchButton = screen.getByRole("button", { name: /search/i });

    expect((searchInput as HTMLInputElement).disabled).toBe(true);
    expect(searchButton.getAttribute("data-loading")).toBe("true");
  });

  it("should toggle advanced filters", () => {
    renderWithMantine(<SearchInterface onSearch={mockOnSearch} />);

    const filterButton = screen.getByRole("button", { name: /show filters/i });
    fireEvent.click(filterButton);

    expect(screen.getByRole("button", { name: /hide filters/i })).toBeTruthy();
  });

  it("should show clear button when there is content", () => {
    renderWithMantine(<SearchInterface onSearch={mockOnSearch} />);

    const searchInput = screen.getByPlaceholderText(
      /Search academic works, authors, institutions/i,
    );
    fireEvent.change(searchInput, { target: { value: "test query" } });

    expect(screen.getByRole("button", { name: /clear/i })).toBeTruthy();
  });

  it("should clear filters when clear button is clicked", () => {
    renderWithMantine(<SearchInterface onSearch={mockOnSearch} />);

    const searchInput = screen.getByPlaceholderText(
      /Search academic works, authors, institutions/i,
    );
    fireEvent.change(searchInput, { target: { value: "test query" } });

    const clearButton = screen.getByRole("button", { name: /clear/i });
    fireEvent.click(clearButton);

    expect((searchInput as HTMLInputElement).value).toBe("");
    expect(mockOnSearch).toHaveBeenCalledWith({
      query: "",
      startDate: null,
      endDate: null,
    });
  });

  it("should handle debounced search for valid queries", async () => {
    // Import the mocked functions to access them
    const { debouncedSearch, isValidSearchQuery } = await import(
      "@academic-explorer/utils"
    );

    renderWithMantine(<SearchInterface onSearch={mockOnSearch} />);

    const searchInput = screen.getByPlaceholderText(
      /Search academic works, authors, institutions/i,
    );
    fireEvent.change(searchInput, { target: { value: "valid query" } });

    // Wait for debounced search to be called
    await waitFor(() => {
      expect(isValidSearchQuery).toHaveBeenCalledWith("valid query");
      expect(debouncedSearch).toHaveBeenCalled();
    });
  });

  it("should not trigger debounced search for invalid queries", async () => {
    // Import the mocked functions to access them
    const { debouncedSearch, isValidSearchQuery } = await import(
      "@academic-explorer/utils"
    );

    // Mock isValidSearchQuery to return false for short queries
    vi.mocked(isValidSearchQuery).mockReturnValue(false);

    renderWithMantine(<SearchInterface onSearch={mockOnSearch} />);

    const searchInput = screen.getByPlaceholderText(
      /Search academic works, authors, institutions/i,
    );
    fireEvent.change(searchInput, { target: { value: "a" } });

    expect(isValidSearchQuery).toHaveBeenCalledWith("a");
    expect(debouncedSearch).not.toHaveBeenCalled();
  });

  it("should normalize search query on search", async () => {
    // Import the mocked functions to access them
    const { normalizeSearchQuery, isValidSearchQuery } = await import(
      "@academic-explorer/utils"
    );

    vi.mocked(isValidSearchQuery).mockReturnValue(true);
    vi.mocked(normalizeSearchQuery).mockReturnValue("normalized query");

    renderWithMantine(<SearchInterface onSearch={mockOnSearch} />);

    const searchInput = screen.getByPlaceholderText(
      /Search academic works, authors, institutions/i,
    );
    const searchButton = screen.getByRole("button", { name: /search/i });

    fireEvent.change(searchInput, { target: { value: "  Test Query  " } });
    fireEvent.click(searchButton);

    expect(normalizeSearchQuery).toHaveBeenCalledWith("  Test Query  ");
    expect(mockOnSearch).toHaveBeenCalledWith({
      query: "normalized query",
      startDate: null,
      endDate: null,
    });
  });

  it("should handle empty query on search", async () => {
    // Import the mocked functions to access them
    const { isValidSearchQuery } = await import("@academic-explorer/utils");

    vi.mocked(isValidSearchQuery).mockReturnValue(false);

    renderWithMantine(<SearchInterface onSearch={mockOnSearch} />);

    const searchButton = screen.getByRole("button", { name: /search/i });
    fireEvent.click(searchButton);

    expect(mockOnSearch).toHaveBeenCalledWith({
      query: "",
      startDate: null,
      endDate: null,
    });
  });
});
