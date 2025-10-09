import { EntityDetectionService } from "@academic-explorer/graph";
import { useRawEntityData } from "@/hooks/use-raw-entity-data";
import { logger } from "@academic-explorer/utils/logger";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";

function FunderRoute() {
  const { funderId } = Route.useParams();
  const navigate = useNavigate();

  const entityType = "funder" as const;
  const [viewMode, setViewMode] = useState<"raw" | "rich">("rich");

  // Fetch entity data for title
  const rawEntityData = useRawEntityData({
    entityId: funderId,
    enabled: !!funderId,
  });
  const funder = rawEntityData.data;

  // Check if ID needs normalization and redirect if necessary
  useEffect(() => {
    if (!funderId) return;

    const detection = EntityDetectionService.detectEntity(funderId);

    // If ID was normalized and is different from input, redirect
    if (detection?.normalizedId && detection.normalizedId !== funderId) {
      logger.debug(
        "routing",
        "Redirecting to normalized funder ID",
        {
          originalId: funderId,
          normalizedId: detection.normalizedId,
        },
        "FunderRoute",
      );

      // Replace current URL with normalized version, preserving query params
      void navigate({
        to: "/funders/$funderId",
        params: { funderId: detection.normalizedId },
        search: (prev) => prev, // Preserve existing search params
        replace: true,
      });
      return;
    }
  }, [funderId, navigate]);

  return <div>Hello "/funders/$funderId"!</div>;
}

export const Route = createFileRoute("/funders/$funderId")({
  component: FunderRoute,
});
