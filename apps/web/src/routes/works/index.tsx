import { EntityList, type ColumnConfig } from "@/components/EntityList";
import type { Work } from "@academic-explorer/client";
import { createFilterBuilder } from "@academic-explorer/client";
import { convertToRelativeUrl } from "@academic-explorer/ui/components/entity-views/matchers/index";
import { Anchor } from "@mantine/core";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/works/")({
  component: WorksListRoute,
});

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
            const authorUrl = convertToRelativeUrl(author.id);

            return (
              <span key={author.id}>
                {authorUrl ? (
                  <Anchor
                    href={authorUrl}
                    size="sm"
                    style={{ textDecoration: "none" }}
                  >
                    {author.display_name}
                  </Anchor>
                ) : (
                  author.display_name
                )}
                {index < authorships.length - 1 && ", "}
              </span>
            );
          })}
        </>
      );
    },
  },
  { key: "publication_year", header: "Year" },
  { key: "cited_by_count", header: "Citations" },
  {
    key: "primary_location.source.display_name",
    header: "Source",
    render: (_value: unknown, row: unknown) => {
      const work = row as Work;
      const source = work.primary_location?.source;
      if (!source) return "Unknown";

      const sourceUrl = convertToRelativeUrl(source.id);
      if (sourceUrl) {
        return (
          <Anchor href={sourceUrl} size="sm" style={{ textDecoration: "none" }}>
            {source.display_name}
          </Anchor>
        );
      }
      return source.display_name;
    },
  },
];

function WorksListRoute() {
  const [urlFilters, setUrlFilters] = useState<
    Record<string, unknown> | undefined
  >();

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

  return (
    <EntityList
      entityType="works"
      columns={worksColumns}
      title="Works"
      urlFilters={urlFilters}
    />
  );
}
