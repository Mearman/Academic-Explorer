import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { EntityDetectionService } from "@academic-explorer/graph";
import { logger } from "@academic-explorer/utils";

export const Route = createFileRoute("/openalex-url/$")({
  component: OpenAlexUrlComponent,
});

function OpenAlexUrlComponent() {
  const { _splat: splat } = Route.useParams();
  const navigate = useNavigate();

  useEffect(() => {
    if (!splat) {
      return;
    }
    const decodedSplat = decodeURIComponent(splat as string);
    try {
      // Validate and parse the splat as a full URL
      const url = new URL(
        decodedSplat.startsWith("http") ? decodedSplat : `https://api.openalex.org/${decodedSplat}`,
      );

      if (url.origin !== "https://api.openalex.org") {
        logger.warn(
          "openalex-url",
          `Invalid OpenAlex URL origin: ${url.origin}`,
        );
        return;
      }

      // Extract path and query parameters
      const path = url.pathname;
      const searchParams = new URLSearchParams(url.search);

      logger.info(
        "openalex-url",
        `Parsed OpenAlex URL: path=${path}, params=${JSON.stringify(Object.fromEntries(searchParams.entries()))}`,
      );

      // Check for single entity pattern: /entityType/id or just /id
      const pathParts = path.split("/").filter((p) => p);
      if (pathParts.length === 2) {
        const id = pathParts[1];

        const detection = EntityDetectionService.detectEntity(id);
        if (detection?.entityType) {
          const targetPath = `/${detection.entityType}/${id}`;
          navigate({
            to: targetPath,
            search: Object.fromEntries(searchParams),
            replace: true,
          });
          return;
        }
      } else if (pathParts.length === 1) {
        // Handle single OpenAlex entity ID: /W2741809807
        const id = pathParts[0];
        const detection = EntityDetectionService.detectEntity(id);
        if (detection?.entityType) {
          const targetPath = `/${detection.entityType}/${id}`;
          navigate({
            to: targetPath,
            search: Object.fromEntries(searchParams),
            replace: true,
          });
          return;
        }
      }

      // Handle autocomplete
      if (path.startsWith("/autocomplete/")) {
        const subPath = path.substring("/autocomplete/".length);
        const targetPath = `/autocomplete/${subPath}`;
        navigate({
          to: targetPath,
          search: Object.fromEntries(searchParams),
          replace: true,
        });
        return;
      }

      // Handle entity list queries, e.g., /works?filter=...
      const entityMap: Record<string, string> = {
        works: "works",
        authors: "authors",
        institutions: "institutions",
        concepts: "concepts",
        sources: "sources",
        publishers: "publishers",
        funders: "funders",
        topics: "topics",
      };

      const entityType = entityMap[pathParts[0]];
      if (entityType && pathParts.length === 1) {
        const targetPath = `/${entityType}`;
        navigate({
          to: targetPath,
          search: Object.fromEntries(searchParams),
          replace: true,
        });
        return;
      }

      // Fallback to search for unmapped paths
      const fallbackPath = `/search?q=${encodeURIComponent(decodedSplat)}`;
      navigate({
        to: fallbackPath,
        replace: true,
      });
    } catch (error) {
      logger.error(
        "openalex-url",
        `Failed to parse OpenAlex URL for splat ${decodedSplat}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }, [splat, navigate]);

  if (!splat) {
    return (
      <div>
        <h1>OpenAlex URL Handler</h1>
        <p>Invalid URL</p>
      </div>
    );
  }

  const decodedSplat = decodeURIComponent(splat);

  return (
    <div>
      <h1>OpenAlex URL Handler</h1>
      <p>Processing {decodedSplat}...</p>
    </div>
  );
}
