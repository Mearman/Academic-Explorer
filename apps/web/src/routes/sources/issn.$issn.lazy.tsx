import {
  useNavigate,
  useParams,
  createLazyFileRoute,
} from "@tanstack/react-router";
import { useEffect } from "react";
import { IconBook } from "@tabler/icons-react";
import { EntityDetectionService } from "@academic-explorer/utils";
import { logError, logger } from "@academic-explorer/utils/logger";

function ISSNSourceRoute() {
  const { issn } = useParams({ from: "/sources/issn/$issn" });
  const navigate = useNavigate();

  useEffect(() => {
    const resolveISSN = async () => {
      try {
        // Decode the ISSN parameter
        const decodedISSN = decodeURIComponent(issn);

        // Detect and normalize the ISSN
        const detection = EntityDetectionService.detectEntity(decodedISSN);

        if (detection?.entityType === "sources") {
          // Redirect to standard sources route with normalized ISSN
          void navigate({
            to: `/sources/${detection.normalizedId}`,
            replace: true,
          });
        } else {
          throw new Error(`Invalid ISSN format: ${decodedISSN}`);
        }
      } catch (error) {
        logError(
          logger,
          "Failed to resolve ISSN:",
          error,
          "ISSNSourceRoute",
          "routing",
        );
        // Navigate to search with the ISSN as query
        void navigate({
          to: "/search",
          search: { q: issn, filter: undefined, search: undefined },
          replace: true,
        });
      }
    };

    void resolveISSN();
  }, [issn, navigate]);

  return (
    <div
      style={{
        padding: "40px 20px",
        textAlign: "center",
        fontSize: "16px",
      }}
    >
      <div style={{ marginBottom: "20px", fontSize: "18px" }}>
        <IconBook size={18} style={{ display: "inline", marginRight: "8px" }} />
        Resolving ISSN...
      </div>
      <div
        style={{
          fontFamily: "monospace",
          backgroundColor: "#f5f5f5",
          padding: "10px",
          borderRadius: "4px",
        }}
      >
        {decodeURIComponent(issn)}
      </div>
    </div>
  );
}

export const Route = createLazyFileRoute("/sources/issn/$issn")({
  component: ISSNSourceRoute,
});

export default ISSNSourceRoute;
