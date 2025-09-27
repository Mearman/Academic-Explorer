import { render, screen, fireEvent } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { MantineProvider } from "@mantine/core";
import { VisualQueryBuilder, type VisualQuery } from "./VisualQueryBuilder";

// Mock logger
vi.mock("@academic-explorer/utils", () => ({
  logger: {
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Test wrapper with MantineProvider
const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <MantineProvider>{children}</MantineProvider>
);

describe("VisualQueryBuilder", () => {
  const mockOnQueryChange = vi.fn();
  const mockOnApply = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders with initial query structure", () => {
    render(
      <VisualQueryBuilder
        entityType="works"
        onQueryChange={mockOnQueryChange}
        onApply={mockOnApply}
      />,
      { wrapper: TestWrapper }
    );

    expect(screen.getByText("Visual Query Builder")).toBeInTheDocument();
    expect(screen.getByText("Query Group 1")).toBeInTheDocument();
    expect(screen.getByText("Filter Palette")).toBeInTheDocument();
  });

  it("displays instructions for users", () => {
    render(
      <VisualQueryBuilder
        entityType="works"
        onQueryChange={mockOnQueryChange}
      />,
      { wrapper: TestWrapper }
    );

    expect(screen.getByText(/Drag filter chips from the palette/)).toBeInTheDocument();
  });

  it("renders available filter chips by category", () => {
    render(
      <VisualQueryBuilder
        entityType="works"
        onQueryChange={mockOnQueryChange}
      />,
      { wrapper: TestWrapper }
    );

    // Check for category headers
    expect(screen.getByText("text")).toBeInTheDocument();
    expect(screen.getByText("temporal")).toBeInTheDocument();
    expect(screen.getByText("numeric")).toBeInTheDocument();
    expect(screen.getByText("general")).toBeInTheDocument();

    // Check for specific chips
    expect(screen.getByText("Title/Name")).toBeInTheDocument();
    expect(screen.getByText("Publication Year")).toBeInTheDocument();
    expect(screen.getByText("Citation Count")).toBeInTheDocument();
    expect(screen.getByText("equals")).toBeInTheDocument();
    expect(screen.getByText("contains")).toBeInTheDocument();
  });

  it("renders entity-specific chips for works", () => {
    render(
      <VisualQueryBuilder
        entityType="works"
        onQueryChange={mockOnQueryChange}
      />,
      { wrapper: TestWrapper }
    );

    expect(screen.getByText("Work Type")).toBeInTheDocument();
    expect(screen.getByText("Concepts")).toBeInTheDocument();
  });

  it("renders entity-specific chips for authors", () => {
    render(
      <VisualQueryBuilder
        entityType="authors"
        onQueryChange={mockOnQueryChange}
      />,
      { wrapper: TestWrapper }
    );

    expect(screen.getByText("Works Count")).toBeInTheDocument();
    expect(screen.getByText("H-Index")).toBeInTheDocument();
  });

  it("shows apply button when onApply is provided", () => {
    render(
      <VisualQueryBuilder
        entityType="works"
        onQueryChange={mockOnQueryChange}
        onApply={mockOnApply}
      />,
      { wrapper: TestWrapper }
    );

    const applyButton = screen.getByRole("button", { name: /apply query/i });
    expect(applyButton).toBeInTheDocument();
    expect(applyButton).toBeDisabled(); // Should be disabled when no chips
  });

  it("hides apply button when onApply is not provided", () => {
    render(
      <VisualQueryBuilder
        entityType="works"
        onQueryChange={mockOnQueryChange}
      />,
      { wrapper: TestWrapper }
    );

    expect(screen.queryByRole("button", { name: /apply query/i })).not.toBeInTheDocument();
  });

  it("adds new query group when add group button is clicked", () => {
    render(
      <VisualQueryBuilder
        entityType="works"
        onQueryChange={mockOnQueryChange}
      />,
      { wrapper: TestWrapper }
    );

    const addGroupButton = screen.getByRole("button", { name: /add group/i });
    fireEvent.click(addGroupButton);

    expect(mockOnQueryChange).toHaveBeenCalledWith(
      expect.objectContaining({
        groups: expect.arrayContaining([
          expect.objectContaining({ id: expect.stringMatching(/^group-/) }),
          expect.objectContaining({ id: expect.stringMatching(/^group-/) }),
        ]),
      })
    );
  });

  it("renders with initial query when provided", () => {
    const initialQuery: VisualQuery = {
      id: "test-query",
      entityType: "works",
      groups: [
        {
          id: "test-group",
          operator: "AND",
          chips: [
            {
              id: "test-chip",
              type: "field",
              field: "display_name",
              label: "Test Chip",
              category: "text",
              dataType: "string",
              enabled: true,
            },
          ],
          enabled: true,
        },
      ],
    };

    render(
      <VisualQueryBuilder
        entityType="works"
        initialQuery={initialQuery}
        onQueryChange={mockOnQueryChange}
      />,
      { wrapper: TestWrapper }
    );

    expect(screen.getByText("Test Chip")).toBeInTheDocument();
    expect(screen.getByText("1 filter")).toBeInTheDocument();
  });

  it("disables interactions when disabled prop is true", () => {
    render(
      <VisualQueryBuilder
        entityType="works"
        onQueryChange={mockOnQueryChange}
        onApply={mockOnApply}
        disabled={true}
      />,
      { wrapper: TestWrapper }
    );

    const addGroupButton = screen.getByRole("button", { name: /add group/i });
    const applyButton = screen.getByRole("button", { name: /apply query/i });

    expect(addGroupButton).toBeDisabled();
    expect(applyButton).toBeDisabled();
  });

  it("shows correct chip count in group description", () => {
    const initialQuery: VisualQuery = {
      id: "test-query",
      entityType: "works",
      groups: [
        {
          id: "test-group",
          operator: "AND",
          chips: [
            {
              id: "chip1",
              type: "field",
              field: "display_name",
              label: "Chip 1",
              category: "text",
              dataType: "string",
              enabled: true,
            },
            {
              id: "chip2",
              type: "field",
              field: "publication_year",
              label: "Chip 2",
              category: "temporal",
              dataType: "number",
              enabled: true,
            },
          ],
          enabled: true,
        },
      ],
    };

    render(
      <VisualQueryBuilder
        entityType="works"
        initialQuery={initialQuery}
        onQueryChange={mockOnQueryChange}
      />,
      { wrapper: TestWrapper }
    );

    expect(screen.getByText("2 filters")).toBeInTheDocument();
  });

  it("shows empty drop zone message when group has no chips", () => {
    render(
      <VisualQueryBuilder
        entityType="works"
        onQueryChange={mockOnQueryChange}
      />,
      { wrapper: TestWrapper }
    );

    expect(screen.getByText("Drop filter chips here")).toBeInTheDocument();
  });

  it("enables clear button when chips are present", () => {
    const initialQuery: VisualQuery = {
      id: "test-query",
      entityType: "works",
      groups: [
        {
          id: "test-group",
          operator: "AND",
          chips: [
            {
              id: "test-chip",
              type: "field",
              field: "display_name",
              label: "Test Chip",
              category: "text",
              dataType: "string",
              enabled: true,
            },
          ],
          enabled: true,
        },
      ],
    };

    render(
      <VisualQueryBuilder
        entityType="works"
        initialQuery={initialQuery}
        onQueryChange={mockOnQueryChange}
      />,
      { wrapper: TestWrapper }
    );

    const clearButton = screen.getByRole("button", { name: /clear all/i });
    expect(clearButton).not.toBeDisabled();
  });
});