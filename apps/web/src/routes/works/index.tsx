import { EntityList, type ColumnConfig } from "@/components/EntityList";
import type {
  Author,
  Funder,
  InstitutionEntity,
  Publisher,
  Source,
  Work,
} from "@academic-explorer/client";
import { createFilterBuilder } from "@academic-explorer/client";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

type Entity = Funder | Publisher | Source | Work | Author | InstitutionEntity;

export const Route = createFileRoute("/works/")({
  component: WorksListRoute,
});

const worksColumns: ColumnConfig[] = [
  { key: "display_name", header: "Title" },
  {
    key: "authorships",
    header: "Authors",
    render: (value: unknown) => {
      const authorships = value as Work["authorships"];
      if (!authorships || authorships.length === 0) return "Unknown";
      const authorNames = authorships.map(
        (authorship) => authorship.author.display_name,
      );
      return authorNames.join(", ");
    },
  },
  { key: "publication_year", header: "Year" },
  { key: "cited_by_count", header: "Citations" },
  {
    key: "primary_location.source.display_name",
    header: "Source",
    render: (_value: unknown, row: unknown) => {
      const work = row as Work;
      return work.primary_location?.source?.display_name || "Unknown";
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
