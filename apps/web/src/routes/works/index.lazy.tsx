import { createLazyFileRoute, useSearch } from "@tanstack/react-router";
import { EntityListWithQueryBookmarking } from "@/components/EntityListWithQueryBookmarking";
import type { ColumnConfig } from "@/components/types";
import { createFilterBuilder } from "@academic-explorer/client";
import type { Work } from "@academic-explorer/types/entities";
import { convertToRelativeUrl } from "@academic-explorer/ui";
import { Anchor } from "@mantine/core";
import type { OpenAlexSearchParams } from "@/lib/route-schemas";

import { useState } from "react";
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
  const search = useSearch({ from: "/works/" }) as OpenAlexSearchParams;
  const [viewMode, setViewMode] = useState<ViewMode>("table");

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
}

export const Route = createLazyFileRoute("/works/")({
  component: WorksListRoute,
});

export default WorksListRoute;
