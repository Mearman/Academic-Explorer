/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useDocumentTitle, useEntityDocumentTitle } from "./use-document-title";

describe("useDocumentTitle", () => {
  const originalTitle = "Original Title";

  beforeEach(() => {
    document.title = originalTitle;
  });

  afterEach(() => {
    document.title = originalTitle;
  });

  it("should set document title with default base title", () => {
    renderHook(() => useDocumentTitle("Test Entity"));

    expect(document.title).toBe("Test Entity - Academic Explorer");
  });

  it("should set document title with custom base title", () => {
    renderHook(() => useDocumentTitle("Test Entity", { baseTitle: "Custom App" }));

    expect(document.title).toBe("Test Entity - Custom App");
  });

  it("should reset to base title when title is null", () => {
    renderHook(() => useDocumentTitle(null));

    expect(document.title).toBe("Academic Explorer");
  });

  it("should reset to base title when title is empty string", () => {
    renderHook(() => useDocumentTitle(""));

    expect(document.title).toBe("Academic Explorer");
  });

  it("should reset to base title when title is undefined", () => {
    renderHook(() => useDocumentTitle(undefined));

    expect(document.title).toBe("Academic Explorer");
  });

  it("should trim whitespace from title", () => {
    renderHook(() => useDocumentTitle("  Test Entity  "));

    expect(document.title).toBe("Test Entity - Academic Explorer");
  });

  it("should restore original title on unmount when restoreOnUnmount is true", () => {
    const { unmount } = renderHook(() =>
      useDocumentTitle("Test Entity", { restoreOnUnmount: true })
    );

    expect(document.title).toBe("Test Entity - Academic Explorer");

    unmount();

    expect(document.title).toBe(originalTitle);
  });

  it("should not restore original title on unmount when restoreOnUnmount is false", () => {
    const { unmount } = renderHook(() =>
      useDocumentTitle("Test Entity", { restoreOnUnmount: false })
    );

    expect(document.title).toBe("Test Entity - Academic Explorer");

    unmount();

    expect(document.title).toBe("Test Entity - Academic Explorer");
  });

  it("should update title when title parameter changes", () => {
    const { rerender } = renderHook(
      ({ title }) => useDocumentTitle(title),
      { initialProps: { title: "First Title" } }
    );

    expect(document.title).toBe("First Title - Academic Explorer");

    rerender({ title: "Second Title" });

    expect(document.title).toBe("Second Title - Academic Explorer");
  });
});

describe("useEntityDocumentTitle", () => {
  const originalTitle = "Original Title";

  beforeEach(() => {
    document.title = originalTitle;
  });

  afterEach(() => {
    document.title = originalTitle;
  });

  it("should set title from entity display_name", () => {
    const entity = { display_name: "Dr. Jane Smith" };

    renderHook(() => useEntityDocumentTitle(entity));

    expect(document.title).toBe("Dr. Jane Smith - Academic Explorer");
  });

  it("should handle null entity", () => {
    renderHook(() => useEntityDocumentTitle(null));

    expect(document.title).toBe("Academic Explorer");
  });

  it("should handle undefined entity", () => {
    renderHook(() => useEntityDocumentTitle(undefined));

    expect(document.title).toBe("Academic Explorer");
  });

  it("should handle entity without display_name", () => {
    const entity = { id: "123" };

    renderHook(() => useEntityDocumentTitle(entity));

    expect(document.title).toBe("Academic Explorer");
  });

  it("should pass through options to useDocumentTitle", () => {
    const entity = { display_name: "Test Paper" };

    renderHook(() => useEntityDocumentTitle(entity, { baseTitle: "Custom Base" }));

    expect(document.title).toBe("Test Paper - Custom Base");
  });
});