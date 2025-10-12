import { EntityDetectionService } from "@academic-explorer/graph";
import { logError, logger } from "@academic-explorer/utils/logger";
import { IconSearch } from "@tabler/icons-react";
import { useNavigate, useParams, useSearch, createLazyFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";

export const Route = createLazyFileRoute("/api-openalex-org/$")({
  component: ApiOpenAlexRoute,
});

function ApiOpenAlexRoute() {
  const { _splat: splat } = useParams({ from: "/api-openalex-org/$" });
  const externalId = splat || "";
  const routeSearch = useSearch({ from: "/api-openalex-org/$" });
  const navigate = useNavigate();
  // Serialize routeSearch to avoid infinite loop from object reference changes
  const routeSearchKey = JSON.stringify(routeSearch);

  useEffect(() => {
    const resolveExternalId = async () => {
      try {
        // Decode the parameter
        const decodedId = decodeURIComponent(externalId);

        // Check if this is a full OpenAlex API URL that should be redirected
        const openAlexApiPattern = /^https?:\/\/api\.openalex\.org\/(.+)$/i;
        const apiMatch = decodedId.match(openAlexApiPattern);
        if (apiMatch) {
          const cleanPath = apiMatch[1];
          logger.debug(
            "routing",
            "Detected OpenAlex API URL, redirecting",
            { original: decodedId, cleanPath },
            "ApiOpenAlexRoute",
          );
          // Navigate to the clean path
          navigate({ to: `/${cleanPath}`, replace: true });
          return;
        }

        // If not an API URL, try to detect entity type
        const entityType = EntityDetectionService.detectEntityType(decodedId);
        if (entityType) {
          logger.debug(
            "routing",
            "Detected entity type from external ID",
            { externalId: decodedId, entityType },
            "ApiOpenAlexRoute",
          );
          // Load the entity
          const graphData = { loadEntity: () => {}, loadEntityIntoGraph: () => {} };
          return;
        }

        // If nothing worked, show error
        logger.error(
          "routing",
          "Could not resolve external ID",
          { externalId: decodedId },
          "ApiOpenAlexRoute",
        );
      } catch (error) {
        logError(logger, "Error resolving external ID", error, "ApiOpenAlexRoute", "routing");
      }
    };

    if (externalId) {
      resolveExternalId();
    }
  }, [externalId, navigate]);

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
          style={{ marginRight: "8px", verticalAlign: "middle" }}
        />
        Processing OpenAlex API URL
      </div>
      <div style={{ marginBottom: "20px" }}>
        Redirecting {decodeURIComponent(externalId)}
        {Object.keys(routeSearch).length > 0
          ? `?${new URLSearchParams(routeSearch as Record<string, string>).toString()}`
          : ""}
      </div>
      <div style={{ marginTop: "20px", fontSize: "14px", color: "#666" }}>
        Detecting entity type and redirecting
      </div>
    </div>
  );
}

export default ApiOpenAlexRoute;
