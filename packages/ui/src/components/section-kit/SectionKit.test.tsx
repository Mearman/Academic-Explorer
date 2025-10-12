import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { SectionKit } from "./SectionKit";

describe("SectionKit", () => {
  it("renders children", () => {
    render(<SectionKit>Test content</SectionKit>);
    expect(screen.getByText("Test content")).toBeInTheDocument();
  });

  it("renders title when provided", () => {
    render(<SectionKit title="Test Title">Content</SectionKit>);
    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent(
      "Test Title",
    );
  });

  it("does not render title when not provided", () => {
    render(<SectionKit>Content</SectionKit>);
    expect(screen.queryByRole("heading")).not.toBeInTheDocument();
  });
});
