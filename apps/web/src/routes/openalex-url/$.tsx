import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { EntityDetectionService } from "@academic-explorer/graph";
import { logger } from "@/lib/logger";

export const Route = createFileRoute("/openalex-url/$")({
  component: OpenAlexUrlComponent,
});

function OpenAlexUrlComponent() {
  const { _splat: splat } = Route.useParams();
  const navigate = useNavigate();

  useEffect(() => {
    logger.debug("openalex-url", `useEffect triggered, splat: ${splat}`);
    if (!splat) {
      logger.debug("openalex-url", "No splat, returning early");
      return;
    }
    const decodedSplat = decodeURIComponent(splat as string);
    logger.debug("openalex-url", `Decoded splat: ${decodedSplat}`);
    try {
      // Validate and parse the splat as a full URL
      const url = new URL(
        decodedSplat.startsWith("http") ? decodedSplat : `https://api.openalex.org/${decodedSplat}`,
      );
      logger.debug("openalex-url", `Parsed URL: ${url.toString()}`);

      if (url.origin !== "https://api.openalex.org") {
        logger.debug("openalex-url", `Invalid origin: ${url.origin}`);
        logger.warn(
          "openalex-url",
          `Invalid OpenAlex URL origin: ${url.origin}`,
        );
        return;
      }

      // Extract path and query parameters
      const path = url.pathname;
      const searchParams = new URLSearchParams(url.search);
      logger.debug("openalex-url", `Path: ${path}, Search params: ${JSON.stringify(Object.fromEntries(searchParams.entries()))}`);

      logger.debug(
        "openalex-url",
        `Parsed OpenAlex URL: path=${path}, params=${JSON.stringify(Object.fromEntries(searchParams.entries()))}`,
      );

      // Check for single entity pattern: /entityType/id or just /id
      const pathParts = path.split("/").filter((p) => p);
      logger.debug("openalex-url", `Path parts: ${JSON.stringify(pathParts)}, Length: ${pathParts.length}`);
      if (pathParts.length === 2) {
        const id = pathParts[1];
        logger.debug("openalex-url", `Length 2, ID: ${id}`);

        const detection = EntityDetectionService.detectEntity(id);
        logger.debug("openalex-url", `Detection for length 2: ${JSON.stringify(detection)}`);
        if (detection?.entityType) {
          const targetPath = `/${detection.entityType}/${id}`;
          logger.debug("openalex-url", `Navigating to (length 2): ${targetPath} with search: ${JSON.stringify(Object.fromEntries(searchParams))}`);
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
        logger.debug("openalex-url", `Length 1, treating as ID: ${id}`);

        const detection = EntityDetectionService.detectEntity(id);
        logger.debug("openalex-url", `Detection for length 1 ID: ${JSON.stringify(detection)}`);
        if (detection?.entityType) {
          const targetPath = `/${detection.entityType}/${id}`;
          logger.debug("openalex-url", `Navigating to (length 1 ID): ${targetPath} with search: ${JSON.stringify(Object.fromEntries(searchParams))}`);
          navigate({
            to: targetPath,
            search: Object.fromEntries(searchParams),
            replace: true,
          });
          return;
        }
        logger.debug("openalex-url", "No detection for length 1 ID, continuing");
      }

      // Handle autocomplete
      logger.debug("openalex-url", `Checking autocomplete, path starts with /autocomplete/: ${path.startsWith("/autocomplete/")}`);
      if (path.startsWith("/autocomplete/")) {
        const subPath = path.substring("/autocomplete/".length);
        const targetPath = `/autocomplete/${subPath}`;
        logger.debug("openalex-url", `Autocomplete match, navigating to: ${targetPath} with search: ${JSON.stringify(Object.fromEntries(searchParams))}`);
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
      logger.debug("openalex-url", `Entity map check, pathParts[0]: ${pathParts[0]}, entityType: ${entityType}, length: ${pathParts.length}`);
      if (entityType && pathParts.length === 1) {
        const targetPath = `/${entityType}`;
        logger.debug("openalex-url", `Entity list match, navigating to: ${targetPath} with search: ${JSON.stringify(Object.fromEntries(searchParams))}`);
        navigate({
          to: targetPath,
          search: Object.fromEntries(searchParams),
          replace: true,
        });
        return;
      }
      logger.debug("openalex-url", "No entity list match, falling to search");

      // Fallback to search for unmapped paths
      const fallbackPath = `/search?q=${encodeURIComponent(decodedSplat)}`;
      logger.debug("openalex-url", `Fallback navigating to: ${fallbackPath}`);
      navigate({
        to: fallbackPath,
        replace: true,
      });
    } catch (error) {
      logger.debug("openalex-url", `Error in parsing: ${error}`);
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
