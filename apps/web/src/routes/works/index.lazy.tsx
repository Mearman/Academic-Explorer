import { createFilterBuilder } from "@bibgraph/client";
import type { Work } from "@bibgraph/types";
import { Anchor } from "@mantine/core";
import { createLazyFileRoute, useSearch } from "@tanstack/react-router";
import { useState } from "react";

import { EntityListWithQueryBookmarking } from "@/components/EntityListWithQueryBookmarking";
import type { TableViewMode } from "@/components/TableViewModeToggle";
import type { ColumnConfig } from "@/components/types";
import type { OpenAlexSearchParams } from "@/lib/route-schemas";
import { convertOpenAlexToInternalLink } from "@/utils/openalex-link-conversion";

const worksColumns: ColumnConfig[] = [
  {
    key: "display_name",
    header: "Title",
    render: (_value: unknown, row: unknown) => {
      const work = row as Work;
      const workUrl = `#${convertOpenAlexToInternalLink(work.id).internalPath}`;
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
            const authorUrl = `#${convertOpenAlexToInternalLink(author.id).internalPath}`;

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

      const sourceUrl = `#${convertOpenAlexToInternalLink(primary_location.source.id).internalPath}`;
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

const WorksListRoute = () => {
  const search = useSearch({ from: "/works/" }) as OpenAlexSearchParams;
  const [viewMode, setViewMode] = useState<TableViewMode>("table");

  // Parse filter string into filter object if present
  const urlFilters = search.filter
    ? createFilterBuilder().parseFilterString(search.filter)
    : undefined;

  return (
    <EntityListWithQueryBookmarking
      entityType="works"
      columns={worksColumns}
      title="Works"
      urlFilters={urlFilters}
      searchParams={search}
      viewMode={viewMode}
      onViewModeChange={setViewMode}
      showBookmarkButton={true}
      bookmarkButtonPosition="header"
    />
  );
};

export const Route = createLazyFileRoute("/works/")({
  component: WorksListRoute,
});

export default WorksListRoute;
