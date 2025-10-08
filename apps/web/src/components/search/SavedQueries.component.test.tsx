/**
 * Component tests for SavedQueries component
 * @vitest-environment jsdom
 */

import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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
      </Wrapper>,
    );

    expect(screen.getByText("Saved Queries")).toBeDefined();
    expect(
      screen.getByText(
        "No saved queries yet. Save your current search to get started.",
      ),
    ).toBeDefined();
    expect(screen.getByText("0")).toBeDefined(); // Badge count
  });

  it("renders saved queries from localStorage", () => {
    mockLocalStorage.getItem.mockReturnValue(JSON.stringify([mockSavedQuery]));

    render(
      <Wrapper>
        <SavedQueries onLoadQuery={mockOnLoadQuery} />
      </Wrapper>,
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
        <SavedQueries
          onLoadQuery={mockOnLoadQuery}
          currentQuery={mockCurrentQuery}
        />
      </Wrapper>,
    );

    expect(screen.getByText("Save Current")).toBeDefined();
  });

  it("hides save button when no current query is provided", () => {
    render(
      <Wrapper>
        <SavedQueries onLoadQuery={mockOnLoadQuery} />
      </Wrapper>,
    );

    expect(screen.queryByText("Save Current")).toBeNull();
  });

  it("opens save modal when save button is clicked", async () => {
    const user = userEvent.setup();

    render(
      <Wrapper>
        <SavedQueries
          onLoadQuery={mockOnLoadQuery}
          currentQuery={mockCurrentQuery}
        />
      </Wrapper>,
    );

    await user.click(screen.getByText("Save Current"));

    await waitFor(() => {
      expect(screen.getByText("Save Current Query")).toBeDefined();
      expect(
        screen.getByPlaceholderText("Enter a name for this query"),
      ).toBeDefined();
    });
    // Check for current query preview text
    expect(screen.getByText(/Query: test search/)).toBeDefined();
  });

  it.skip("saves a new query when form is submitted", async () => {
    const user = userEvent.setup();

    render(
      <Wrapper>
        <SavedQueries
          onLoadQuery={mockOnLoadQuery}
          currentQuery={mockCurrentQuery}
        />
      </Wrapper>,
    );

    // Open save modal
    await user.click(screen.getByText("Save Current"));

    // Wait for modal to be fully open
    await waitFor(() => {
      expect(
        screen.getByPlaceholderText("Enter a name for this query"),
      ).toBeDefined();
    });

    // Fill in form
    await user.type(
      screen.getByPlaceholderText("Enter a name for this query"),
      "My New Query",
    );
    await user.type(
      screen.getByPlaceholderText("Optional description"),
      "Test description",
    );
    await user.type(
      screen.getByPlaceholderText("Comma-separated tags (optional)"),
      "tag1, tag2",
    );

    // Submit form
    await user.click(screen.getByText("Save Query"));

    // Verify localStorage was called
    await waitFor(() => {
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        "academic-explorer:saved-queries",
        expect.stringContaining("My New Query"),
      );
    });
  });

  it("loads a query when load button is clicked", async () => {
    const user = userEvent.setup();
    mockLocalStorage.getItem.mockReturnValue(JSON.stringify([mockSavedQuery]));

    render(
      <Wrapper>
        <SavedQueries onLoadQuery={mockOnLoadQuery} />
      </Wrapper>,
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
      </Wrapper>,
    );

    // Open menu
    const menuButton = screen.getByLabelText("Query menu");
    await user.click(menuButton);

    // Wait for menu to open and click delete
    await waitFor(() => {
      expect(screen.getByText("Delete")).toBeDefined();
    });
    await user.click(screen.getByText("Delete"));

    // Verify localStorage was updated (query removed)
    await waitFor(() => {
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        "academic-explorer:saved-queries",
        "[]",
      );
    });
  });

  it("toggles favorite status when star is clicked", async () => {
    const user = userEvent.setup();
    mockLocalStorage.getItem.mockReturnValue(JSON.stringify([mockSavedQuery]));

    render(
      <Wrapper>
        <SavedQueries onLoadQuery={mockOnLoadQuery} />
      </Wrapper>,
    );

    // Find star button (should be empty star initially since isFavorite is false)
    const starButton = screen.getByLabelText("Add to favorites");
    await user.click(starButton);

    // Verify localStorage was updated with favorite status
    await waitFor(() => {
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        "academic-explorer:saved-queries",
        expect.stringContaining('"isFavorite":true'),
      );
    });
  });

  it("opens rename modal when rename menu item is clicked", async () => {
    const user = userEvent.setup();
    mockLocalStorage.getItem.mockReturnValue(JSON.stringify([mockSavedQuery]));

    render(
      <Wrapper>
        <SavedQueries onLoadQuery={mockOnLoadQuery} />
      </Wrapper>,
    );

    // Open menu
    const menuButton = screen.getByLabelText("Query menu");
    await user.click(menuButton);

    // Wait for menu to open and click rename
    await waitFor(() => {
      expect(screen.getByText("Rename")).toBeDefined();
    });
    await user.click(screen.getByText("Rename"));

    await waitFor(() => {
      expect(screen.getByText("Edit Query")).toBeDefined();
    });
    expect(screen.getByDisplayValue("Test Query")).toBeDefined();
  });

  it("renames a query when rename form is submitted", async () => {
    const user = userEvent.setup();
    mockLocalStorage.getItem.mockReturnValue(JSON.stringify([mockSavedQuery]));

    render(
      <Wrapper>
        <SavedQueries onLoadQuery={mockOnLoadQuery} />
      </Wrapper>,
    );

    // Open menu and click rename
    const menuButton = screen.getByLabelText("Query menu");
    await user.click(menuButton);

    await waitFor(() => {
      expect(screen.getByText("Rename")).toBeDefined();
    });
    await user.click(screen.getByText("Rename"));

    // Wait for modal to open and update name
    await waitFor(() => {
      expect(screen.getByDisplayValue("Test Query")).toBeDefined();
    });
    const nameInput = screen.getByDisplayValue("Test Query");
    await user.clear(nameInput);
    await user.type(nameInput, "Updated Query Name");

    // Submit
    await user.click(screen.getByText("Save Changes"));

    // Verify localStorage was updated
    await waitFor(() => {
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        "academic-explorer:saved-queries",
        expect.stringContaining("Updated Query Name"),
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
        <SavedQueries
          onLoadQuery={mockOnLoadQuery}
          currentQuery={mockCurrentQuery}
        />
      </Wrapper>,
    );

    // Open save modal and submit with valid data
    await user.click(screen.getByText("Save Current"));

    await waitFor(() => {
      expect(
        screen.getByPlaceholderText("Enter a name for this query"),
      ).toBeDefined();
    });
    await user.type(
      screen.getByPlaceholderText("Enter a name for this query"),
      "Test Query",
    );
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
        <SavedQueries
          onLoadQuery={mockOnLoadQuery}
          currentQuery={mockCurrentQuery}
        />
      </Wrapper>,
    );

    // Open save modal
    await user.click(screen.getByText("Save Current"));

    // Wait for modal to open and try to submit without name
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Save Query" })).toBeDefined();
    });
    const saveButton = screen.getByRole("button", { name: "Save Query" });
    expect((saveButton as HTMLButtonElement).disabled).toBe(true);

    // Add name - button should become enabled
    await user.type(
      screen.getByPlaceholderText("Enter a name for this query"),
      "Test",
    );
    await waitFor(() => {
      expect(
        (
          screen.getByRole("button", {
            name: "Save Query",
          }) as HTMLButtonElement
        ).disabled,
      ).toBe(false);
    });
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
      </Wrapper>,
    );

    const queryElements = screen.getAllByText(/Query$/);
    expect(queryElements[0].textContent).toContain("Favorite Query");
    expect(queryElements[1].textContent).toContain("Regular Query");
  });

  it("handles malformed localStorage data gracefully", () => {
    mockLocalStorage.getItem.mockReturnValue("invalid json");

    render(
      <Wrapper>
        <SavedQueries onLoadQuery={mockOnLoadQuery} />
      </Wrapper>,
    );

    // Should render empty state instead of crashing
    expect(
      screen.getByText(
        "No saved queries yet. Save your current search to get started.",
      ),
    ).toBeTruthy();
  });

  it("formats dates correctly", () => {
    mockLocalStorage.getItem.mockReturnValue(JSON.stringify([mockSavedQuery]));

    render(
      <Wrapper>
        <SavedQueries onLoadQuery={mockOnLoadQuery} />
      </Wrapper>,
    );

    // Should display formatted dates
    expect(screen.getByText(/Jan 1, 2023 - Dec 31, 2023/)).toBeDefined();
    expect(screen.getByText(/Created: Jun 1, 2023/)).toBeDefined();
  });
});
