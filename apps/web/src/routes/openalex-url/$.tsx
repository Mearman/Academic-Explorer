import { EntityDetectionService } from "@academic-explorer/graph";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
// Temporarily remove logger import to avoid potential issues
import { logger } from "@/lib/logger";

export const Route = createFileRoute("/openalex-url/$")({
  component: OpenAlexUrlComponent,
});

function parseSearchParams(params: URLSearchParams): Record<string, unknown> {
  const obj: Record<string, unknown> = {};
  const numericKeys = new Set(["per_page", "page", "sample"]);
  params.forEach((value, key) => {
    if (numericKeys.has(key)) {
      const num = Number(value);
      obj[key] = isNaN(num) ? value : num;
    } else {
      obj[key] = value;
    }
  });
  return obj;
}

function OpenAlexUrlComponent() {
  logger.debug("routing", "OpenAlexUrlComponent: Component function called");
  const { _splat: splat } = Route.useParams();
  logger.debug("routing", "OpenAlexUrlComponent: splat parameter:", splat);
  const navigate = useNavigate();

  logger.debug("routing", "OpenAlexUrlComponent rendered with splat:", splat);

  useEffect(() => {
    logger.debug("routing", `useEffect triggered, splat: ${splat}`);
    if (!splat) {
      logger.debug("routing", "No splat, returning early");
      return;
    }
    const decodedSplat = decodeURIComponent(splat as string);
    logger.debug("routing", `Decoded splat: ${decodedSplat}`);
    try {
      // Validate and parse the splat as a full URL
      const url = new URL(
        decodedSplat.startsWith("http") ? decodedSplat : `https://api.openalex.org/${decodedSplat}`,
      );
      logger.debug("routing", `Parsed URL: ${url.toString()}`);

      if (url.origin !== "https://api.openalex.org") {
        logger.debug("routing", `Invalid origin: ${url.origin}`);
        logger.warn(
          "routing",
          `Invalid OpenAlex URL origin: ${url.origin}`,
        );
        return;
      }

      // Extract path and query parameters
      const path = url.pathname;
      const searchParams = new URLSearchParams(url.search);
      logger.debug("routing", `Path: ${path}, Search params: ${JSON.stringify(Object.fromEntries(searchParams.entries()))}`);

      logger.debug(
        "routing",
        `Parsed OpenAlex URL: path=${path}, params=${JSON.stringify(Object.fromEntries(searchParams.entries()))}`,
      );

      // Check for single entity pattern: /entityType/id or just /id
      const pathParts = path.split("/").filter((p) => p);
      logger.debug("routing", `Path parts: ${JSON.stringify(pathParts)}, Length: ${pathParts.length}`);
      if (pathParts.length === 2) {
        const id = pathParts[1];
        const detection = EntityDetectionService.detectEntity(id);
        if (detection?.entityType) {
          const targetPath = `/${detection.entityType}/${id}`;
          navigate({
            to: targetPath,
            search: parseSearchParams(searchParams),
            replace: true,
          });
          return;
        }
      } else if (pathParts.length === 1) {
        // Handle single OpenAlex entity ID: /W2741809807
        const id = pathParts[0];
        logger.debug("routing", `Length 1, treating as ID: ${id}`);

        const detection = EntityDetectionService.detectEntity(id);
        logger.debug("routing", `Detection for length 1 ID: ${JSON.stringify(detection)}`);
        if (detection?.entityType) {
          const targetPath = `/${detection.entityType}/${id}`;
          logger.debug("routing", `Navigating to (length 1 ID): ${targetPath} with search: ${JSON.stringify(Object.fromEntries(searchParams))}`);
          logger.debug("routing", `About to navigate for length 1 ID`);
          navigate({
            to: targetPath,
            search: parseSearchParams(searchParams),
            replace: true,
          });
          logger.debug("routing", `Navigation called for length 1 ID`);
          return;
        }
        logger.debug("routing", "No detection for length 1 ID, continuing");
      }

      // Handle autocomplete
      logger.debug("routing", `Checking autocomplete, path starts with /autocomplete/: ${path.startsWith("/autocomplete/")}`);
      if (path.startsWith("/autocomplete/")) {
        const subPath = path.substring("/autocomplete/".length);
        const targetPath = `/autocomplete/${subPath}`;
        logger.debug("routing", `Autocomplete match, navigating to: ${targetPath} with search: ${JSON.stringify(Object.fromEntries(searchParams))}`);
        logger.debug("routing", `About to navigate for autocomplete`);
        navigate({
          to: targetPath,
          search: parseSearchParams(searchParams),
          replace: true,
        });
        logger.debug("routing", `Navigation called for autocomplete`);
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
          search: parseSearchParams(searchParams),
          replace: true,
        });
        return;
      }
      logger.debug("routing", "No entity list match, falling to search");

      // Fallback to search for unmapped paths
      const fallbackPath = `/search?q=${encodeURIComponent(decodedSplat)}`;
      logger.debug("routing", `Fallback navigating to: ${fallbackPath}`);
      logger.debug("routing", `About to navigate for fallback search`);
      navigate({
        to: fallbackPath,
        replace: true,
      });
      logger.debug("routing", `Navigation called for fallback search`);
    } catch (error) {
      logger.debug("routing", `Error in parsing: ${error}`);
      logger.error(
        "routing",
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
