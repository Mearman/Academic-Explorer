import { createLazyFileRoute } from "@tanstack/react-router";
import { EntityList } from "@/components/EntityList";
import type { ColumnConfig } from "@/components/types";
import type { Work } from "@academic-explorer/client";
import { createFilterBuilder } from "@academic-explorer/client";
import { convertToRelativeUrl } from "@academic-explorer/ui";
import { Anchor } from "@mantine/core";

import { useEffect, useState } from "react";
import type { ViewMode } from "@/components/ViewModeToggle";

const worksColumns: ColumnConfig[] = [
  {
    key: "display_name",
    header: "Title",
    render: (_value: unknown, row: unknown) => {
      const work = row as Work;
      const workUrl = convertToRelativeUrl(work.id);
      if (workUrl) {
        return (
          <Anchor
            href={workUrl}
            style={{ textDecoration: "none", color: "inherit" }}
          >
            {work.display_name}
          </Anchor>
        );
      }
      return work.display_name;
    },
  },
  {
    key: "authorships",
    header: "Authors",
    render: (_value: unknown, row: unknown) => {
      const work = row as Work;
      const { authorships } = work;
      if (!authorships || authorships.length === 0) return "Unknown";

      return (
        <>
          {authorships.map((authorship, index) => {
            const { author } = authorship;
            if (!author?.id) return null;
            const authorUrl = convertToRelativeUrl(author.id);

            return (
              <span key={author.id}>
                {authorUrl ? (
                  <Anchor
                    href={authorUrl}
                    style={{ textDecoration: "none", color: "inherit" }}
                  >
                    {author.display_name}
                  </Anchor>
                ) : (
                  <span>{author.display_name}</span>
                )}
                {index < authorships.length - 1 && ", "}
              </span>
            );
          })}
        </>
      );
    },
  },
  {
    key: "primary_location",
    header: "Source",
    render: (_value: unknown, row: unknown) => {
      const work = row as Work;
      const { primary_location } = work;
      if (!primary_location?.source?.display_name) return "Unknown";

      const sourceUrl = convertToRelativeUrl(primary_location.source.id);
      if (sourceUrl) {
        return (
          <Anchor
            href={sourceUrl}
            style={{ textDecoration: "none", color: "inherit" }}
          >
            {primary_location.source.display_name}
          </Anchor>
        );
      }
      return primary_location.source.display_name;
    },
  },
  {
    key: "cited_by_count",
    header: "Citations",
    render: (_value: unknown, row: unknown) => {
      const work = row as Work;
      return work.cited_by_count?.toLocaleString() || "0";
    },
  },
  {
    key: "open_access",
    header: "Access",
    render: (_value: unknown, row: unknown) => {
      const work = row as Work;
      return work.open_access?.is_oa ? "Open" : "Closed";
    },
  },
];

function WorksListRoute() {
  const [urlFilters, setUrlFilters] = useState<
    Record<string, unknown> | undefined | null
  >(null); // null = not yet parsed, undefined = no filters, object = parsed filters
  const [viewMode, setViewMode] = useState<ViewMode>("table");

  useEffect(() => {
    const parseHashFilters = () => {
      // Parse URL parameters manually since TanStack Router useSearch might not work with hash routing
      const { hash } = window.location;
      const queryIndex = hash.indexOf("?");
      if (queryIndex !== -1) {
        const queryString = hash.substring(queryIndex + 1);
        const urlParams = new URLSearchParams(queryString);
        const filterParam = urlParams.get("filter");

        if (filterParam) {
          const filterBuilder = createFilterBuilder();
          const parsedFilters = filterBuilder.parseFilterString(filterParam);
          setUrlFilters(parsedFilters);
        } else {
          setUrlFilters(undefined);
        }
      } else {
        setUrlFilters(undefined);
      }
    };

    // Parse filters on mount and when hash changes
    parseHashFilters();
    window.addEventListener("hashchange", parseHashFilters);

    return () => {
      window.removeEventListener("hashchange", parseHashFilters);
    };
  }, []);

  // Wait for filters to be parsed before rendering EntityList
  if (urlFilters === null) {
    return null;
  }

  return (
    <EntityList
      entityType="works"
      columns={worksColumns}
      title="Works"
      urlFilters={urlFilters}
      viewMode={viewMode}
      onViewModeChange={setViewMode}
    />
  );
}

export const Route = createLazyFileRoute("/works/")({
  component: WorksListRoute,
});

export default WorksListRoute;
