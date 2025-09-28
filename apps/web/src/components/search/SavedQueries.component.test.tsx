import { vi, describe, it, beforeEach, afterEach, expect } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MantineProvider } from "@mantine/core";
import { SavedQueries, type SavedQuery } from "./SavedQueries";

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

Object.defineProperty(window, "localStorage", {
  value: mockLocalStorage,
});

// Mock logger
vi.mock("@academic-explorer/utils", () => ({
  logger: {
    debug: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

const Wrapper = ({ children }: { children: React.ReactNode }) => (
  <MantineProvider>{children}</MantineProvider>
);

const mockSavedQuery: SavedQuery = {
  id: "test-query-1",
  name: "Test Query",
  query: "machine learning",
  startDate: new Date("2023-01-01"),
  endDate: new Date("2023-12-31"),
  createdAt: new Date("2023-06-01"),
  lastModified: new Date("2023-06-01"),
  isFavorite: false,
  description: "Test description",
  tags: ["AI", "ML"],
};

describe("SavedQueries", () => {
  const mockOnLoadQuery = vi.fn();
  const mockCurrentQuery = {
    query: "test search",
    startDate: new Date("2023-01-01"),
    endDate: null,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockLocalStorage.getItem.mockReturnValue(null);
  });

  afterEach(() => {
    cleanup();
  });

  it("renders empty state when no queries are saved", () => {
    render(
      <Wrapper>
        <SavedQueries onLoadQuery={mockOnLoadQuery} />
      </Wrapper>
    );

    expect(screen.getByText("Saved Queries")).toBeDefined();
    expect(screen.getByText("No saved queries yet. Save your current search to get started.")).toBeDefined();
    expect(screen.getByText("0")).toBeDefined(); // Badge count
  });

  it("renders saved queries from localStorage", () => {
    mockLocalStorage.getItem.mockReturnValue(JSON.stringify([mockSavedQuery]));

    render(
      <Wrapper>
        <SavedQueries onLoadQuery={mockOnLoadQuery} />
      </Wrapper>
    );

    expect(screen.getByText("Test Query")).toBeDefined();
    expect(screen.getByText("machine learning")).toBeDefined();
    expect(screen.getByText("Test description")).toBeDefined();
    expect(screen.getByText("AI")).toBeDefined();
    expect(screen.getByText("ML")).toBeDefined();
    expect(screen.getByText("1")).toBeDefined(); // Badge count
  });

  it("shows save button when current query is provided", () => {
    render(
      <Wrapper>
        <SavedQueries onLoadQuery={mockOnLoadQuery} currentQuery={mockCurrentQuery} />
      </Wrapper>
    );

    expect(screen.getByText("Save Current")).toBeDefined();
  });

  it("hides save button when no current query is provided", () => {
    render(
      <Wrapper>
        <SavedQueries onLoadQuery={mockOnLoadQuery} />
      </Wrapper>
    );

    expect(screen.queryByText("Save Current")).toBeNull();
  });

  it("opens save modal when save button is clicked", async () => {
    const user = userEvent.setup();

    render(
      <Wrapper>
        <SavedQueries onLoadQuery={mockOnLoadQuery} currentQuery={mockCurrentQuery} />
      </Wrapper>
    );

    await user.click(screen.getByText("Save Current"));

    await waitFor(() => {
      expect(screen.getByText("Save Current Query")).toBeDefined();
    });
    expect(screen.getByLabelText("Query Name")).toBeDefined();
    expect(screen.getByText("test search")).toBeDefined();
  });

  it("saves a new query when form is submitted", async () => {
    const user = userEvent.setup();

    render(
      <Wrapper>
        <SavedQueries onLoadQuery={mockOnLoadQuery} currentQuery={mockCurrentQuery} />
      </Wrapper>
    );

    // Open save modal
    await user.click(screen.getByText("Save Current"));

    // Fill in form
    await user.type(screen.getByLabelText("Query Name"), "My New Query");
    await user.type(screen.getByLabelText("Description"), "Test description");
    await user.type(screen.getByLabelText("Tags"), "tag1, tag2");

    // Submit form
    await user.click(screen.getByText("Save Query"));

    // Verify localStorage was called
    await waitFor(() => {
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        "academic-explorer:saved-queries",
        expect.stringContaining("My New Query")
      );
    });
  });

  it("loads a query when load button is clicked", async () => {
    const user = userEvent.setup();
    mockLocalStorage.getItem.mockReturnValue(JSON.stringify([mockSavedQuery]));

    render(
      <Wrapper>
        <SavedQueries onLoadQuery={mockOnLoadQuery} />
      </Wrapper>
    );

    // Find and click load button
    const loadButton = screen.getByLabelText("Load query");
    await user.click(loadButton);

    expect(mockOnLoadQuery).toHaveBeenCalledWith(mockSavedQuery);
  });

  it("deletes a query when delete menu item is clicked", async () => {
    const user = userEvent.setup();
    mockLocalStorage.getItem.mockReturnValue(JSON.stringify([mockSavedQuery]));

    render(
      <Wrapper>
        <SavedQueries onLoadQuery={mockOnLoadQuery} />
      </Wrapper>
    );

    // Open menu
    const menuButton = screen.getByRole("button", { name: /menu/i });
    await user.click(menuButton);

    // Click delete
    await user.click(screen.getByText("Delete"));

    // Verify localStorage was updated (query removed)
    await waitFor(() => {
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        "academic-explorer:saved-queries",
        "[]"
      );
    });
  });

  it("toggles favorite status when star is clicked", async () => {
    const user = userEvent.setup();
    mockLocalStorage.getItem.mockReturnValue(JSON.stringify([mockSavedQuery]));

    render(
      <Wrapper>
        <SavedQueries onLoadQuery={mockOnLoadQuery} />
      </Wrapper>
    );

    // Find star button (should be empty star initially)
    const starButton = screen.getByRole("button", { name: /star/i });
    await user.click(starButton);

    // Verify localStorage was updated with favorite status
    await waitFor(() => {
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        "academic-explorer:saved-queries",
        expect.stringContaining('"isFavorite":true')
      );
    });
  });

  it("opens rename modal when rename menu item is clicked", async () => {
    const user = userEvent.setup();
    mockLocalStorage.getItem.mockReturnValue(JSON.stringify([mockSavedQuery]));

    render(
      <Wrapper>
        <SavedQueries onLoadQuery={mockOnLoadQuery} />
      </Wrapper>
    );

    // Open menu
    const menuButton = screen.getByRole("button", { name: /menu/i });
    await user.click(menuButton);

    // Click rename
    await user.click(screen.getByText("Rename"));

    expect(screen.getByText("Edit Query")).toBeDefined();
    expect(screen.getByDisplayValue("Test Query")).toBeDefined();
  });

  it("renames a query when rename form is submitted", async () => {
    const user = userEvent.setup();
    mockLocalStorage.getItem.mockReturnValue(JSON.stringify([mockSavedQuery]));

    render(
      <Wrapper>
        <SavedQueries onLoadQuery={mockOnLoadQuery} />
      </Wrapper>
    );

    // Open menu and click rename
    const menuButton = screen.getByRole("button", { name: /menu/i });
    await user.click(menuButton);
    await user.click(screen.getByText("Rename"));

    // Update name
    const nameInput = screen.getByDisplayValue("Test Query");
    await user.clear(nameInput);
    await user.type(nameInput, "Updated Query Name");

    // Submit
    await user.click(screen.getByText("Save Changes"));

    // Verify localStorage was updated
    await waitFor(() => {
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        "academic-explorer:saved-queries",
        expect.stringContaining("Updated Query Name")
      );
    });
  });

  it("shows error when save fails", async () => {
    const user = userEvent.setup();
    mockLocalStorage.setItem.mockImplementation(() => {
      throw new Error("Storage error");
    });

    render(
      <Wrapper>
        <SavedQueries onLoadQuery={mockOnLoadQuery} currentQuery={mockCurrentQuery} />
      </Wrapper>
    );

    // Open save modal and submit with valid data
    await user.click(screen.getByText("Save Current"));
    await user.type(screen.getByLabelText("Query Name"), "Test Query");
    await user.click(screen.getByText("Save Query"));

    // Should show error
    await waitFor(() => {
      expect(screen.getByText("Failed to save query")).toBeDefined();
    });
  });

  it("validates required fields", async () => {
    const user = userEvent.setup();

    render(
      <Wrapper>
        <SavedQueries onLoadQuery={mockOnLoadQuery} currentQuery={mockCurrentQuery} />
      </Wrapper>
    );

    // Open save modal
    await user.click(screen.getByText("Save Current"));

    // Try to submit without name
    const saveButton = screen.getByText("Save Query");
    expect(saveButton).toBeDisabled();

    // Add name - button should become enabled
    await user.type(screen.getByLabelText("Query Name"), "Test");
    expect(saveButton).not.toBeDisabled();
  });

  it("sorts queries with favorites first", () => {
    const queries = [
      { ...mockSavedQuery, id: "1", name: "Regular Query", isFavorite: false },
      { ...mockSavedQuery, id: "2", name: "Favorite Query", isFavorite: true },
    ];

    mockLocalStorage.getItem.mockReturnValue(JSON.stringify(queries));

    render(
      <Wrapper>
        <SavedQueries onLoadQuery={mockOnLoadQuery} />
      </Wrapper>
    );

    const queryElements = screen.getAllByText(/Query$/);
    expect(queryElements[0]).toHaveTextContent("Favorite Query");
    expect(queryElements[1]).toHaveTextContent("Regular Query");
  });

  it("handles malformed localStorage data gracefully", () => {
    mockLocalStorage.getItem.mockReturnValue("invalid json");

    render(
      <Wrapper>
        <SavedQueries onLoadQuery={mockOnLoadQuery} />
      </Wrapper>
    );

    // Should render empty state instead of crashing
    expect(screen.getByText("No saved queries yet. Save your current search to get started.")).toBeInTheDocument();
  });

  it("formats dates correctly", () => {
    mockLocalStorage.getItem.mockReturnValue(JSON.stringify([mockSavedQuery]));

    render(
      <Wrapper>
        <SavedQueries onLoadQuery={mockOnLoadQuery} />
      </Wrapper>
    );

    // Should display formatted dates
    expect(screen.getByText(/Jan 1, 2023 - Dec 31, 2023/)).toBeDefined();
    expect(screen.getByText(/Created: Jun 1, 2023/)).toBeDefined();
  });
});