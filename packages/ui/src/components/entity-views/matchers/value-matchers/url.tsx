import { Anchor } from "@mantine/core";
import React from "react";
import type { ValueMatcher } from "../types";
import { convertToRelativeUrl } from "../utils";

export const urlMatcher: ValueMatcher = {
  name: "url",
  priority: 7,
  detect: (value: unknown): boolean => {
    if (typeof value !== "string") return false;
    try {
      new URL(value);
      return true;
    } catch {
      return false;
    }
  },
  render: (
    value: unknown,
    fieldName: string,
    onNavigate?: (path: string) => void,
  ): React.ReactNode => {
    const urlValue = value as string;
    const relativeUrl = convertToRelativeUrl(urlValue);

    if (
      relativeUrl &&
      onNavigate &&
      (relativeUrl.startsWith("/") || relativeUrl.startsWith("#/"))
    ) {
      // Use router navigation for internal routes
      // Strip the hash prefix for router navigation
      const routePath = relativeUrl.startsWith("#/")
        ? relativeUrl.slice(1)
        : relativeUrl;
      return (
        <Anchor
          href={relativeUrl}
          onClick={(e) => {
            e.preventDefault();
            onNavigate(routePath);
          }}
          size="sm"
        >
          {urlValue}
        </Anchor>
      );
    } else if (relativeUrl) {
      // Use browser navigation for other internal links
      return (
        <Anchor href={relativeUrl} size="sm">
          {urlValue}
        </Anchor>
      );
    } else {
      // Use external link for other URLs
      return (
        <Anchor
          href={urlValue}
          target="_blank"
          rel="noopener noreferrer"
          size="sm"
        >
          {urlValue}
        </Anchor>
      );
    }
  },
};
