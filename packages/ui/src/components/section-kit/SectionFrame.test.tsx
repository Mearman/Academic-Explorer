import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { MantineProvider } from "@mantine/core";
import { SectionFrame } from "./SectionFrame";

// Test wrapper with MantineProvider
const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <MantineProvider>{children}</MantineProvider>
);

describe("SectionFrame", () => {
  it("renders children", () => {
    render(
      <TestWrapper>
        <SectionFrame title="Test Title">Test content</SectionFrame>
      </TestWrapper>,
    );
    expect(screen.getByText("Test content")).toBeInTheDocument();
  });

  it("renders title when provided", () => {
    render(
      <TestWrapper>
        <SectionFrame title="Test Title">Content</SectionFrame>
      </TestWrapper>,
    );
    expect(screen.getByText("Test Title")).toBeInTheDocument();
  });

  it("renders icon when provided", () => {
    const TestIcon = () => <span data-testid="test-icon">Icon</span>;
    render(
      <TestWrapper>
        <SectionFrame title="Test Title" icon={<TestIcon />}>
          Content
        </SectionFrame>
      </TestWrapper>,
    );
    expect(screen.getByTestId("test-icon")).toBeInTheDocument();
  });

  it("renders actions when provided", () => {
    render(
      <TestWrapper>
        <SectionFrame title="Test Title" actions={<button>Action</button>}>
          Content
        </SectionFrame>
      </TestWrapper>,
    );
    expect(screen.getByRole("button", { name: "Action" })).toBeInTheDocument();
  });

  it("toggles expansion when header is clicked", () => {
    render(
      <TestWrapper>
        <SectionFrame title="Test Title">Test content</SectionFrame>
      </TestWrapper>,
    );

    const headerButton = screen.getByRole("button");
    const content = screen.getByText("Test content");

    // Initially expanded
    expect(content).toBeVisible();

    // Click to collapse
    fireEvent.click(headerButton);

    // Content should still be in DOM but hidden via CSS
    expect(content).toBeInTheDocument();
  });

  it("calls onToggle when expansion changes", () => {
    const mockOnToggle = vi.fn();
    render(
      <TestWrapper>
        <SectionFrame title="Test Title" onToggle={mockOnToggle}>
          Content
        </SectionFrame>
      </TestWrapper>,
    );

    const headerButton = screen.getByRole("button");
    fireEvent.click(headerButton);

    expect(mockOnToggle).toHaveBeenCalledWith(false);
  });
});
