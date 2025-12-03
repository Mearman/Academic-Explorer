import "@testing-library/jest-dom/vitest"

import { cleanup,render, screen } from "@testing-library/react"
import { afterEach, describe, expect,it } from "vitest"

import { SectionKit } from "./SectionKit"

describe("SectionKit", () => {
  afterEach(() => {
    cleanup();
  });
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
