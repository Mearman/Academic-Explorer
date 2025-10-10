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

import { describe, it, expect, vi } from "vitest";
import { arrayMatchers } from "./matchers/index";
import { render } from "@testing-library/react";
import { MantineProvider } from "@mantine/core";

describe("Topic Share Matcher", () => {
  const topicShareMatcher = arrayMatchers.find((m) => m.name === "topic-share");

  it("should detect topic_share arrays correctly", () => {
    const validTopicShare = [
      {
        id: "https://openalex.org/T10789",
        display_name: "Interactive and Immersive Displays",
        value: 0.0000368,
        subfield: {
          id: "https://openalex.org/subfields/1709",
          display_name: "Human-Computer Interaction",
        },
        field: {
          id: "https://openalex.org/fields/17",
          display_name: "Computer Science",
        },
        domain: {
          id: "https://openalex.org/domains/3",
          display_name: "Physical Sciences",
        },
      },
    ];

    const invalidArray = [{ display_name: "Topic", count: 5 }];

    expect(topicShareMatcher?.detect(validTopicShare)).toBe(true);
    expect(topicShareMatcher?.detect(invalidArray)).toBe(false);
    expect(topicShareMatcher?.detect([])).toBe(false);
  });

  it("should render topic_share data as a table", () => {
    const topicShareData = [
      {
        id: "https://openalex.org/T10789",
        display_name: "Interactive and Immersive Displays",
        value: 0.0000368,
        subfield: {
          id: "https://openalex.org/subfields/1709",
          display_name: "Human-Computer Interaction",
        },
        field: {
          id: "https://openalex.org/fields/17",
          display_name: "Computer Science",
        },
        domain: {
          id: "https://openalex.org/domains/3",
          display_name: "Physical Sciences",
        },
      },
    ];

    const rendered = topicShareMatcher?.render(topicShareData, "topic_share");

    expect(rendered).toBeDefined();

    // Render the component to check if it renders without errors
    const { container } = render(
      <MantineProvider>
        <div>{rendered}</div>
      </MantineProvider>,
    );
    expect(container).toBeDefined();
  });
});
