// Mock matchMedia
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

// Mock the client utils
vi.mock("@academic-explorer/client/utils/id-resolver", () => ({
  validateExternalId: vi.fn((id: string) => {
    if (typeof id !== "string") return { isValid: false, type: null };

    // Mock validation logic
    if (id.startsWith("W")) return { isValid: true, type: "openalex" };
    if (id.startsWith("A")) return { isValid: true, type: "openalex" };
    if (id.startsWith("I")) return { isValid: true, type: "openalex" };
    if (id.startsWith("S")) return { isValid: true, type: "openalex" };
    if (id.startsWith("T")) return { isValid: true, type: "openalex" };
    if (id.startsWith("0")) return { isValid: true, type: "ror" };
    if (id.match(/^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$/))
      return { isValid: true, type: "orcid" };
    if (id.match(/^10\.\d{4,9}\/[-._;()/:A-Z0-9]+$/i))
      return { isValid: true, type: "doi" };

    return { isValid: false, type: null };
  }),
}));

import { MantineProvider } from "@mantine/core";
import { fireEvent, render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
    arrayMatchers,
    convertToRelativeUrl,
    determineCanonicalRoute,
    isOpenAlexUrl,
    objectMatchers,
    valueMatchers,
} from "./matchers";

describe("URL Conversion Functions", () => {
  describe("convertToRelativeUrl", () => {
    it("should convert OpenAlex API URLs to hash-based relative paths", () => {
      const apiUrl =
        "https://api.openalex.org/works?filter=author.id:A5025875274";
      const result = convertToRelativeUrl(apiUrl);
      expect(result).toBe("#/works?filter=author.id:A5025875274");
    });

    it("should convert OpenAlex entity URLs to hash-based relative paths", () => {
      const entityUrl = "https://openalex.org/I2799442855";
      const result = convertToRelativeUrl(entityUrl);
      expect(result).toBe("#/institutions/I2799442855");
    });

    it("should handle works URLs", () => {
      const workUrl = "https://openalex.org/W123456789";
      const result = convertToRelativeUrl(workUrl);
      expect(result).toBe("#/works/W123456789");
    });

    it("should handle authors URLs", () => {
      const authorUrl = "https://openalex.org/A987654321";
      const result = convertToRelativeUrl(authorUrl);
      expect(result).toBe("#/authors/A987654321");
    });

    it("should handle sources URLs", () => {
      const sourceUrl = "https://openalex.org/S555666777";
      const result = convertToRelativeUrl(sourceUrl);
      expect(result).toBe("#/sources/S555666777");
    });

    it("should handle topics URLs", () => {
      const topicUrl = "https://openalex.org/T111222333";
      const result = convertToRelativeUrl(topicUrl);
      expect(result).toBe("#/topics/T111222333");
    });

    it("should return null for ROR URLs", () => {
      const rorUrl = "https://ror.org/02t274039";
      const result = convertToRelativeUrl(rorUrl);
      expect(result).toBeNull();
    });

    it("should return null for non-OpenAlex URLs", () => {
      const externalUrl = "https://example.com";
      const result = convertToRelativeUrl(externalUrl);
      expect(result).toBeNull();
    });

    it("should return null for invalid URLs", () => {
      const invalidUrl = "not-a-url";
      const result = convertToRelativeUrl(invalidUrl);
      expect(result).toBeNull();
    });
  });

  describe("determineCanonicalRoute", () => {
    it("should handle entity routes with IDs", () => {
      expect(determineCanonicalRoute("works/W123")).toBe("/works/W123");
      expect(determineCanonicalRoute("authors/A456")).toBe("/authors/A456");
      expect(determineCanonicalRoute("institutions/I789")).toBe(
        "/institutions/I789",
      );
    });

    it("should handle collection routes with query params", () => {
      expect(
        determineCanonicalRoute("works?filter=author.id:A5025875274"),
      ).toBe("/works");
      expect(
        determineCanonicalRoute("authors?filter=institution.id:I123"),
      ).toBe("/authors");
    });

    it("should handle simple paths", () => {
      expect(determineCanonicalRoute("works")).toBe("/works");
      expect(determineCanonicalRoute("authors")).toBe("/authors");
    });
  });

  describe("isOpenAlexUrl", () => {
    it("should identify OpenAlex URLs", () => {
      expect(isOpenAlexUrl("https://api.openalex.org/works")).toBe(true);
      expect(isOpenAlexUrl("https://openalex.org/W123")).toBe(true);
      expect(isOpenAlexUrl("https://ror.org/02t274039")).toBe(true);
    });

    it("should reject non-OpenAlex URLs", () => {
      expect(isOpenAlexUrl("https://example.com")).toBe(false);
      expect(isOpenAlexUrl("not-a-url")).toBe(false);
    });
  });
});

describe("URL Matcher", () => {
  const urlMatcher = valueMatchers.find((m) => m.name === "url");

  it("should detect URLs correctly", () => {
    expect(urlMatcher?.detect("https://api.openalex.org/works")).toBe(true);
    expect(urlMatcher?.detect("https://openalex.org/W123")).toBe(true);
    expect(urlMatcher?.detect("https://example.com")).toBe(true);
    expect(urlMatcher?.detect("not-a-url")).toBe(false);
    expect(urlMatcher?.detect(123)).toBe(false);
  });

  it("should render OpenAlex URLs as relative links", () => {
    const openAlexUrl =
      "https://api.openalex.org/works?filter=author.id:A5025875274";
    const rendered = urlMatcher?.render(openAlexUrl, "api_url");

    expect(rendered).toBeDefined();

    const { container } = render(
      <MantineProvider>
        <div>{rendered}</div>
      </MantineProvider>,
    );

    const link = container.querySelector("a");
    expect(link).toBeTruthy();
    expect(link?.getAttribute("href")).toBe("#/works?filter=author.id:A5025875274");
    expect(link?.textContent).toBe(openAlexUrl);
  });

  it("should render external URLs with target blank", () => {
    const externalUrl = "https://example.com";
    const rendered = urlMatcher?.render(externalUrl, "external_url");

    expect(rendered).toBeDefined();

    const { container } = render(
      <MantineProvider>
        <div>{rendered}</div>
      </MantineProvider>,
    );

    const link = container.querySelector("a");
    expect(link).toBeTruthy();
    expect(link?.getAttribute("href")).toBe(externalUrl);
    expect(link?.getAttribute("target")).toBe("_blank");
    expect(link?.getAttribute("rel")).toBe("noopener noreferrer");
  });
});

describe("ID Object Matcher", () => {
  const idMatcher = objectMatchers.find((m) => m.name === "id-object");

  it("should detect ID objects correctly", () => {
    const validIdObject = {
      openalex: "W123456789",
      orcid: "0000-0000-0000-0000",
      doi: "10.1234/example",
    };

    const invalidObject = { name: "John Doe", age: 30 };

    expect(idMatcher?.detect(validIdObject)).toBe(true);
    expect(idMatcher?.detect(invalidObject)).toBe(false);
    expect(idMatcher?.detect("not-an-object")).toBe(false);
  });

  it("should render OpenAlex IDs as clickable badges", () => {
    const idObject = {
      openalex: "W123456789",
      orcid: "0000-0000-0000-0000",
      doi: "10.1234/example",
      ror: "02t274039",
    };

    const rendered = idMatcher?.render(idObject, "ids");

    expect(rendered).toBeDefined();

    const { container } = render(
      <MantineProvider>
        <div>{rendered}</div>
      </MantineProvider>,
    );

    // Check OpenAlex ID link
    const openAlexLink = container.querySelector('a[href="/works/W123456789"]');
    expect(openAlexLink).toBeTruthy();
    expect(openAlexLink?.textContent).toContain("OPENALEX: W123456789");

    // Check ORCID badge (should not be linked)
    const orcidBadge = container.querySelector(".mantine-Badge-root");
    expect(orcidBadge).toBeTruthy();

    // Check copy buttons exist
    const copyButtons = container.querySelectorAll(
      'button[aria-label*="Copy"]',
    );
    expect(copyButtons.length).toBeGreaterThan(0);
  });

  it("should handle ROR IDs without linking", () => {
    const idObject = { ror: "02t274039" };

    const rendered = idMatcher?.render(idObject, "ids");

    expect(rendered).toBeDefined();

    const { container } = render(
      <MantineProvider>
        <div>{rendered}</div>
      </MantineProvider>,
    );

    // ROR should not have a link (handled specially)
    const rorLink = container.querySelector('a[href*="ror.org"]');
    expect(rorLink).toBeFalsy();

    // But should still show the badge
    const rorBadge = container.textContent;
    expect(rorBadge).toContain("ROR: 02t274039");
  });
});

describe("DOI Matcher", () => {
  const doiMatcher = valueMatchers.find((m) => m.name === "doi");

  it("should detect DOIs correctly", () => {
    expect(doiMatcher?.detect("10.1234/example")).toBe(true);
    expect(doiMatcher?.detect("10.1000/xyz123")).toBe(true);
    expect(doiMatcher?.detect("not-a-doi")).toBe(false);
    expect(doiMatcher?.detect(123)).toBe(false);
  });

  it("should render DOIs with external links", () => {
    const doi = "10.1234/example";
    const rendered = doiMatcher?.render(doi, "doi");

    expect(rendered).toBeDefined();

    const { container } = render(
      <MantineProvider>
        <div>{rendered}</div>
      </MantineProvider>,
    );

    const link = container.querySelector(
      'a[href="https://doi.org/10.1234/example"]',
    );
    expect(link).toBeTruthy();
    expect(link?.getAttribute("target")).toBe("_blank");
  });
});

describe("ORCID Matcher", () => {
  const orcidMatcher = valueMatchers.find((m) => m.name === "orcid");

  it("should detect ORCIDs correctly", () => {
    expect(orcidMatcher?.detect("0000-0000-0000-0000")).toBe(true);
    expect(orcidMatcher?.detect("0000-0002-1825-0097")).toBe(true);
    expect(orcidMatcher?.detect("not-an-orcid")).toBe(false);
  });

  it("should render ORCIDs with external links", () => {
    const orcid = "0000-0000-0000-0000";
    const rendered = orcidMatcher?.render(orcid, "orcid");

    expect(rendered).toBeDefined();

    const { container } = render(
      <MantineProvider>
        <div>{rendered}</div>
      </MantineProvider>,
    );

    const link = container.querySelector(
      'a[href="https://orcid.org/0000-0000-0000-0000"]',
    );
    expect(link).toBeTruthy();
    expect(link?.getAttribute("target")).toBe("_blank");
  });
});

describe("ROR Matcher", () => {
  const rorMatcher = valueMatchers.find((m) => m.name === "ror");

  it("should detect ROR IDs correctly", () => {
    expect(rorMatcher?.detect("02t274039")).toBe(true);
    expect(rorMatcher?.detect("0abcdef12")).toBe(true);
    expect(rorMatcher?.detect("not-a-ror")).toBe(false);
  });

  it("should render ROR IDs with external links", () => {
    const ror = "02t274039";
    const rendered = rorMatcher?.render(ror, "ror");

    expect(rendered).toBeDefined();

    const { container } = render(
      <MantineProvider>
        <div>{rendered}</div>
      </MantineProvider>,
    );

    const link = container.querySelector('a[href="https://ror.org/02t274039"]');
    expect(link).toBeTruthy();
    expect(link?.getAttribute("target")).toBe("_blank");
  });
});

describe("Array Matchers", () => {
  describe("affiliationMatcher", () => {
    it("should render affiliations with clickable institutions", () => {
      const affiliationMatcher = arrayMatchers.find(
        (m) => m.name === "affiliations",
      )!;
      expect(affiliationMatcher).toBeDefined();

      const testData = [
        {
          institution: {
            id: "https://openalex.org/I123",
            display_name: "Test University",
          },
          years: [2020, 2021, 2022],
        },
      ];

      const mockOnNavigate = vi.fn();
      const result = affiliationMatcher.render(
        testData,
        "affiliations",
        mockOnNavigate,
      );

      const { container } = render(<MantineProvider>{result}</MantineProvider>);

      // Should have clickable text
      const clickableText = container.querySelector(
        '[style*="cursor: pointer"]',
      );
      expect(clickableText).toBeTruthy();
      expect(clickableText?.textContent).toBe("Test University");

      // Clicking should call onNavigate
      fireEvent.click(clickableText!);
      expect(mockOnNavigate).toHaveBeenCalledWith("/institutions/I123");
    });

    it("should render affiliations without navigation when onNavigate not provided", () => {
      const affiliationMatcher = arrayMatchers.find(
        (m) => m.name === "affiliations",
      )!;
      expect(affiliationMatcher).toBeDefined();

      const testData = [
        {
          institution: {
            id: "https://openalex.org/I123",
            display_name: "Test University",
          },
          years: [2020, 2021, 2022],
        },
      ];

      const result = affiliationMatcher.render(testData, "affiliations");

      const { container } = render(<MantineProvider>{result}</MantineProvider>);

      // Should not have clickable styling
      const clickableText = container.querySelector(
        '[style*="cursor: pointer"]',
      );
      expect(clickableText).toBeFalsy();

      // Should still show the institution name
      expect(container.textContent).toContain("Test University");
    });
  });
});
