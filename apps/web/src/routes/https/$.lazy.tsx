import { EntityDetectionService } from "@academic-explorer/graph";
import { logError, logger } from "@academic-explorer/utils/logger";
import { IconSearch } from "@tabler/icons-react";
import {
  useNavigate,
  useParams,
  createLazyFileRoute,
} from "@tanstack/react-router";
import { useEffect } from "react";

function HttpsRoute() {
  const { _splat: splat } = useParams({ from: "/https/$" });
  const externalId = splat || "";
  const navigate = useNavigate();

  useEffect(() => {
    const resolveExternalId = async () => {
      try {
        // Decode the parameter
        let decodedId = decodeURIComponent(externalId);

        // Fix collapsed double slashes in protocol (https:/ -> https://)
        if (
          decodedId.match(/^https?:\//i) &&
          !decodedId.match(/^https?:\/\//i)
        ) {
          decodedId = decodedId.replace(/^(https?:\/?)/, "$1/");
          logger.debug(
            "routing",
            "Fixed collapsed protocol slashes in external ID",
            { original: externalId, fixed: decodedId },
            "HttpsRoute",
          );
        }

        // Check if this is a full URL that should be handled
        if (decodedId.match(/^https?:\/\//i)) {
          // Try to detect entity type and normalize ID
          const detection = EntityDetectionService.detectEntity(decodedId);
          if (detection?.entityType && detection?.normalizedId) {
            logger.debug(
              "routing",
              "Detected entity from https URL, navigating",
              {
                externalId: decodedId,
                entityType: detection.entityType,
                normalizedId: detection.normalizedId
              },
              "HttpsRoute",
            );
            // Navigate to the proper entity route with encoded ID
            navigate({
              to: `/${detection.entityType}/${encodeURIComponent(detection.normalizedId)}`,
              replace: true,
            });
            return;
          }
        }

        // If nothing worked, show error
        logger.error(
          "routing",
          "Could not resolve https URL",
          { externalId: decodedId },
          "HttpsRoute",
        );
      } catch (error) {
        logError(
          logger,
          "Error resolving https URL",
          error,
          "HttpsRoute",
          "routing",
        );
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
        Processing HTTPS URL
      </div>
      <div style={{ marginBottom: "20px" }}>
        https://{decodeURIComponent(externalId)}
      </div>
      <div style={{ marginTop: "20px", fontSize: "14px", color: "#666" }}>
        Detecting entity type and redirecting
      </div>
    </div>
  );
}

export const Route = createLazyFileRoute("/https/$")({
  component: HttpsRoute,
});

export default HttpsRoute;
