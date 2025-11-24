import {
  useNavigate,
  useParams,
  createLazyFileRoute,
} from "@tanstack/react-router";
import { useEffect } from "react";
import { IconUser } from "@tabler/icons-react";
import { EntityDetectionService } from "@academic-explorer/utils";
import { logError, logger } from "@academic-explorer/utils/logger";

function ORCIDAuthorRoute() {
  const { orcid } = useParams({ from: "/authors/orcid/$orcid" });
  const navigate = useNavigate();

  useEffect(() => {
    const resolveORCID = async () => {
      try {
        // Decode the ORCID parameter
        const decodedORCID = decodeURIComponent(orcid);

        // Normalize the ORCID to full URL format
        // EntityDetectionService will validate and normalize the format
        const detection = EntityDetectionService.detectEntity(decodedORCID);

        if (!detection || detection.entityType !== "authors") {
          throw new Error(
            `Invalid ORCID format: ${decodedORCID}`,
          );
        }

        // Redirect to standard authors route with normalized ORCID
        void navigate({
          to: `/authors/${detection.normalizedId}`,
          replace: true,
        });
      } catch (error) {
        logError(
          logger,
          "Failed to resolve ORCID:",
          error,
          "ORCIDAuthorRoute",
          "routing",
        );
        // Navigate to search with the ORCID as query
        void navigate({
          to: "/search",
          search: { q: orcid, filter: undefined, search: undefined },
          replace: true,
        });
      }
    };

    void resolveORCID();
  }, [orcid, navigate]);

  return (
    <div
      style={{
        padding: "40px 20px",
        textAlign: "center",
        fontSize: "16px",
      }}
    >
      <div style={{ marginBottom: "20px", fontSize: "18px" }}>
        <IconUser size={18} style={{ display: "inline", marginRight: "8px" }} />
        Resolving ORCID...
      </div>
      <div
        style={{
          fontFamily: "monospace",
          backgroundColor: "#f5f5f5",
          padding: "10px",
          borderRadius: "4px",
        }}
      >
        {decodeURIComponent(orcid)}
      </div>
    </div>
  );
}

export const Route = createLazyFileRoute("/authors/orcid/$orcid")({
  component: ORCIDAuthorRoute,
});

export default ORCIDAuthorRoute;
