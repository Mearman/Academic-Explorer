import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { IconSearch } from "@tabler/icons-react";
import { EntityDetectionService } from "@academic-explorer/graph";
import { logError, logger } from "@academic-explorer/utils/logger";

export const Route = createFileRoute("/openalex/org/$")({
  component: OpenAlexRoute,
});

function OpenAlexRoute() {
  const { _splat } = Route.useParams();
  const navigate = useNavigate();

  useEffect(() => {
    const resolveOpenAlexUrl = () => {
      try {
        if (!_splat) {
          throw new Error("No URL path provided");
        }

        const fullUrl = `https://openalex.org/${_splat}`;
        const detection = EntityDetectionService.detectEntity(fullUrl);

        if (
          detection?.entityType &&
          detection.detectionMethod.includes("OpenAlex")
        ) {
          const entityRoute = `/${detection.entityType}/${detection.normalizedId}`;

          // Check if the original URL had query parameters and preserve them
          const urlObj = new URL(fullUrl);
          const searchObj: Record<string, string> = {};
          urlObj.searchParams.forEach((value, key) => {
            searchObj[key] = value;
          });

          void navigate({
            to: entityRoute,
            search: Object.keys(searchObj).length > 0 ? searchObj : undefined,
            replace: true,
          });
        } else {
          void navigate({
            to: `/${encodeURIComponent(fullUrl)}`,
            replace: true,
          });
        }
      } catch (error) {
        logError(
          logger,
          "Failed to resolve OpenAlex URL:",
          error,
          "OpenAlexRoute",
          "routing",
        );
        void navigate({
          to: "/search",
          search: { q: _splat },
          replace: true,
        });
      }
    };

    resolveOpenAlexUrl();
  }, [_splat, navigate]);

  return (
    <div
      style={{
        padding: "40px 20px",
        textAlign: "center",
        fontSize: "16px",
      }}
    >
      <div style={{ marginBottom: "20px", fontSize: "18px" }}>
        <IconSearch
          size={18}
          style={{ display: "inline", marginRight: "8px" }}
        />
        Resolving OpenAlex URL...
      </div>
      <div
        style={{
          fontFamily: "monospace",
          backgroundColor: "#f5f5f5",
          padding: "10px",
          borderRadius: "4px",
        }}
      >
        openalex.org/{decodeURIComponent(_splat ?? "")}
      </div>
      <div style={{ marginTop: "20px", fontSize: "14px", color: "#666" }}>
        Detecting entity type and redirecting
      </div>
    </div>
  );
}
