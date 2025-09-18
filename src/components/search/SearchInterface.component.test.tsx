import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { MantineProvider } from "@mantine/core";
import { SearchInterface } from "./SearchInterface";

// Mock the data-helpers module
vi.mock("../../lib/utils/data-helpers", () => ({
	debouncedSearch: vi.fn((callback: () => void) => { callback(); }),
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

		expect(screen.getByText("Search Academic Literature")).toBeInTheDocument();
		expect(screen.getByPlaceholderText("Search academic works, authors, institutions...")).toBeInTheDocument();
		expect(screen.getByRole("button", { name: /search/i })).toBeInTheDocument();
		expect(screen.getByRole("button", { name: /show filters/i })).toBeInTheDocument();
	});

	it("should render with custom placeholder", () => {
		const customPlaceholder = "Custom search placeholder";
		renderWithMantine(
			<SearchInterface onSearch={mockOnSearch} placeholder={customPlaceholder} />
		);

		expect(screen.getByPlaceholderText(customPlaceholder)).toBeInTheDocument();
	});

	it("should hide date filter when showDateFilter is false", () => {
		renderWithMantine(
			<SearchInterface onSearch={mockOnSearch} showDateFilter={false} />
		);

		expect(screen.queryByRole("button", { name: /show filters/i })).not.toBeInTheDocument();
	});

	it("should handle search input changes", () => {
		renderWithMantine(<SearchInterface onSearch={mockOnSearch} />);

		const searchInput = screen.getByPlaceholderText("Search academic works, authors, institutions...");
		fireEvent.change(searchInput, { target: { value: "test query" } });

		expect(searchInput).toHaveValue("test query");
	});

	it("should call onSearch when search button is clicked", () => {
		renderWithMantine(<SearchInterface onSearch={mockOnSearch} />);

		const searchInput = screen.getByPlaceholderText("Search academic works, authors, institutions...");
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
		renderWithMantine(<SearchInterface onSearch={mockOnSearch} isLoading={true} />);

		const searchInput = screen.getByPlaceholderText("Search academic works, authors, institutions...");
		const searchButton = screen.getByRole("button", { name: /search/i });

		expect(searchInput).toBeDisabled();
		expect(searchButton).toHaveAttribute("data-loading", "true");
	});

	it("should toggle advanced filters", () => {
		renderWithMantine(<SearchInterface onSearch={mockOnSearch} />);

		const filterButton = screen.getByRole("button", { name: /show filters/i });
		fireEvent.click(filterButton);

		expect(screen.getByRole("button", { name: /hide filters/i })).toBeInTheDocument();
	});

	it("should show clear button when there is content", () => {
		renderWithMantine(<SearchInterface onSearch={mockOnSearch} />);

		const searchInput = screen.getByPlaceholderText("Search academic works, authors, institutions...");
		fireEvent.change(searchInput, { target: { value: "test query" } });

		expect(screen.getByRole("button", { name: /clear/i })).toBeInTheDocument();
	});

	it("should clear filters when clear button is clicked", () => {
		renderWithMantine(<SearchInterface onSearch={mockOnSearch} />);

		const searchInput = screen.getByPlaceholderText("Search academic works, authors, institutions...");
		fireEvent.change(searchInput, { target: { value: "test query" } });

		const clearButton = screen.getByRole("button", { name: /clear/i });
		fireEvent.click(clearButton);

		expect(searchInput).toHaveValue("");
		expect(mockOnSearch).toHaveBeenCalledWith({
			query: "",
			startDate: null,
			endDate: null,
		});
	});

	it("should handle debounced search for valid queries", async () => {
		// Import the mocked functions to access them
		const { debouncedSearch, isValidSearchQuery } = await import("../../lib/utils/data-helpers");

		renderWithMantine(<SearchInterface onSearch={mockOnSearch} />);

		const searchInput = screen.getByPlaceholderText("Search academic works, authors, institutions...");
		fireEvent.change(searchInput, { target: { value: "valid query" } });

		// Wait for debounced search to be called
		await waitFor(() => {
			expect(isValidSearchQuery).toHaveBeenCalledWith("valid query");
			expect(debouncedSearch).toHaveBeenCalled();
		});
	});

	it("should not trigger debounced search for invalid queries", async () => {
		// Import the mocked functions to access them
		const { debouncedSearch, isValidSearchQuery } = await import("../../lib/utils/data-helpers");

		// Mock isValidSearchQuery to return false for short queries
		vi.mocked(isValidSearchQuery).mockReturnValue(false);

		renderWithMantine(<SearchInterface onSearch={mockOnSearch} />);

		const searchInput = screen.getByPlaceholderText("Search academic works, authors, institutions...");
		fireEvent.change(searchInput, { target: { value: "a" } });

		expect(isValidSearchQuery).toHaveBeenCalledWith("a");
		expect(debouncedSearch).not.toHaveBeenCalled();
	});

	it("should normalize search query on search", async () => {
		// Import the mocked functions to access them
		const { normalizeSearchQuery, isValidSearchQuery } = await import("../../lib/utils/data-helpers");

		vi.mocked(isValidSearchQuery).mockReturnValue(true);
		vi.mocked(normalizeSearchQuery).mockReturnValue("normalized query");

		renderWithMantine(<SearchInterface onSearch={mockOnSearch} />);

		const searchInput = screen.getByPlaceholderText("Search academic works, authors, institutions...");
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
		const { isValidSearchQuery } = await import("../../lib/utils/data-helpers");

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