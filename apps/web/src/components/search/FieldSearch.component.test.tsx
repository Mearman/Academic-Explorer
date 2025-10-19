/**
 * @vitest-environment jsdom
 */

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
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { FieldSearch, type FieldSearchValues } from "./FieldSearch";

// Test wrapper with Mantine provider
const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <MantineProvider>{children}</MantineProvider>
);

// Ensure proper cleanup between tests
afterEach(() => {
  cleanup();
});

describe("FieldSearch Component", () => {
  it("renders all search input fields with correct labels", () => {
    render(
      <TestWrapper>
        <FieldSearch />
      </TestWrapper>,
    );

    expect(screen.getByLabelText("Search by work title")).toBeTruthy();
    expect(screen.getByLabelText("Search by abstract content")).toBeTruthy();
    expect(screen.getByLabelText("Search by author name")).toBeTruthy();
    expect(screen.getByLabelText("Search by institution name")).toBeTruthy();
  });

  it("shows default placeholder text", () => {
    render(
      <TestWrapper>
        <FieldSearch />
      </TestWrapper>,
    );

    expect(screen.getByLabelText("Search by work title")).toHaveProperty(
      "placeholder",
      "Search by title...",
    );
    expect(screen.getByLabelText("Search by abstract content")).toHaveProperty(
      "placeholder",
      "Search by abstract content...",
    );
    expect(screen.getByLabelText("Search by author name")).toHaveProperty(
      "placeholder",
      "Search by author name...",
    );
    expect(screen.getByLabelText("Search by institution name")).toHaveProperty(
      "placeholder",
      "Search by institution name...",
    );
  });

  it("accepts custom placeholder text", () => {
    const customPlaceholders = {
      title: "Custom title placeholder",
      author: "Custom author placeholder",
    };

    render(
      <TestWrapper>
        <FieldSearch placeholders={customPlaceholders} />
      </TestWrapper>,
    );

    expect(screen.getByLabelText("Search by work title")).toHaveProperty(
      "placeholder",
      "Custom title placeholder",
    );
    expect(screen.getByLabelText("Search by author name")).toHaveProperty(
      "placeholder",
      "Custom author placeholder",
    );
    // Should still show default for fields not customized
    expect(screen.getByLabelText("Search by abstract content")).toHaveProperty(
      "placeholder",
      "Search by abstract content...",
    );
    expect(screen.getByLabelText("Search by institution name")).toHaveProperty(
      "placeholder",
      "Search by institution name...",
    );
  });

  it("calls onChange callback when field values change", () => {
    const mockOnChange = vi.fn();

    render(
      <TestWrapper>
        <FieldSearch onChange={mockOnChange} />
      </TestWrapper>,
    );

    const titleInput = screen.getByLabelText("Search by work title");
    fireEvent.change(titleInput, { target: { value: "test title" } });

    expect(mockOnChange).toHaveBeenCalledWith({
      title: "test title",
      abstract: "",
      author: "",
      institution: "",
    });
  });

  it("calls onSearch callback when search button is clicked", () => {
    const mockOnSearch = vi.fn();

    render(
      <TestWrapper>
        <FieldSearch onSearch={mockOnSearch} />
      </TestWrapper>,
    );

    // Add some text to enable the search button
    const titleInput = screen.getByLabelText("Search by work title");
    fireEvent.change(titleInput, { target: { value: "test title" } });

    const searchButton = screen.getByRole("button", { name: /search/i });
    fireEvent.click(searchButton);

    expect(mockOnSearch).toHaveBeenCalledWith({
      title: "test title",
      abstract: "",
      author: "",
      institution: "",
    });
  });

  it("disables search button when no fields have values", () => {
    render(
      <TestWrapper>
        <FieldSearch />
      </TestWrapper>,
    );

    const searchButton = screen.getByRole("button", { name: /search/i });
    expect(searchButton).toHaveProperty("disabled", true);
  });

  it("enables search button when at least one field has a value", () => {
    render(
      <TestWrapper>
        <FieldSearch />
      </TestWrapper>,
    );

    const titleInput = screen.getByLabelText("Search by work title");
    fireEvent.change(titleInput, { target: { value: "test" } });

    const searchButton = screen.getByRole("button", { name: /search/i });
    expect(searchButton).toHaveProperty("disabled", false);
  });

  it("shows clear button when fields have values", () => {
    render(
      <TestWrapper>
        <FieldSearch />
      </TestWrapper>,
    );

    // Initially no clear button
    expect(screen.queryByRole("button", { name: /clear all/i })).toBeNull();

    // Add some text
    const titleInput = screen.getByLabelText("Search by work title");
    fireEvent.change(titleInput, { target: { value: "test" } });

    // Clear button should appear
    expect(screen.getByRole("button", { name: /clear all/i })).toBeTruthy();
  });

  it("clears all fields when clear button is clicked", () => {
    const mockOnChange = vi.fn();

    render(
      <TestWrapper>
        <FieldSearch onChange={mockOnChange} />
      </TestWrapper>,
    );

    // Add text to multiple fields
    const titleInput = screen.getByLabelText("Search by work title");
    const authorInput = screen.getByLabelText("Search by author name");

    fireEvent.change(titleInput, { target: { value: "test title" } });
    fireEvent.change(authorInput, { target: { value: "test author" } });

    // Click clear button
    const clearButton = screen.getByRole("button", { name: /clear all/i });
    fireEvent.click(clearButton);

    // Verify all fields are cleared
    expect(mockOnChange).toHaveBeenLastCalledWith({
      title: "",
      abstract: "",
      author: "",
      institution: "",
    });
  });

  it("accepts initial values", () => {
    const initialValues: Partial<FieldSearchValues> = {
      title: "Initial title",
      author: "Initial author",
    };

    render(
      <TestWrapper>
        <FieldSearch initialValues={initialValues} />
      </TestWrapper>,
    );

    expect(screen.getByDisplayValue("Initial title")).toBeTruthy();
    expect(screen.getByDisplayValue("Initial author")).toBeTruthy();
  });

  it("disables all inputs when loading", () => {
    render(
      <TestWrapper>
        <FieldSearch isLoading={true} />
      </TestWrapper>,
    );

    expect(screen.getByLabelText("Search by work title")).toHaveProperty(
      "disabled",
      true,
    );
    expect(screen.getByLabelText("Search by abstract content")).toHaveProperty(
      "disabled",
      true,
    );
    expect(screen.getByLabelText("Search by author name")).toHaveProperty(
      "disabled",
      true,
    );
    expect(screen.getByLabelText("Search by institution name")).toHaveProperty(
      "disabled",
      true,
    );
  });

  it("hides search button when showSearchButton is false", () => {
    render(
      <TestWrapper>
        <FieldSearch showSearchButton={false} />
      </TestWrapper>,
    );

    expect(screen.queryByRole("button", { name: /search/i })).toBeNull();
  });
});
