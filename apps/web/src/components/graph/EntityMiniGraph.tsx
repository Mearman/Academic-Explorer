import { useMemo, useState, useRef, useEffect } from "react";
import { Select } from "@mantine/core";
import { useThemeColors } from "@/hooks/use-theme-colors";

import type { OpenAlexEntity } from "@academic-explorer/client";
import type { GraphAdapter } from "./adapters/GraphAdapter";
import {
  GraphAdapterFactory,
  type GraphAdapterType,
} from "./adapters/GraphAdapterFactory";

// Loading fallback component
function GraphLoadingFallback() {
  const themeColors = useThemeColors();

  return (
    <div
      style={{
        width: "100%",
        height: "300px",
        border: `1px solid ${themeColors.colors.border.primary}`,
        borderRadius: "8px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: themeColors.colors.background.secondary,
        color: themeColors.colors.text.secondary,
      }}
    >
      Loading graph...
    </div>
  );
}

interface EntityMiniGraphProps {
  entity: OpenAlexEntity;
  relatedEntities: OpenAlexEntity[];
  adapterType?: GraphAdapterType;
  showAdapterSelector?: boolean;
}

export function EntityMiniGraph({
  entity,
  relatedEntities,
  adapterType: initialAdapterType = GraphAdapterFactory.getDefaultAdapter(),
  showAdapterSelector = true,
}: EntityMiniGraphProps) {
  const themeColors = useThemeColors();
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 400, height: 300 });
  const [selectedAdapterType, setSelectedAdapterType] =
    useState<GraphAdapterType>(initialAdapterType);
  const [adapter, setAdapter] = useState<GraphAdapter | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setDimensions({ width: rect.width, height: rect.height });
      }
    };

    updateDimensions();
    window.addEventListener("resize", updateDimensions);
    return () => window.removeEventListener("resize", updateDimensions);
  }, []);

  // Load the graph adapter when the type changes
  useEffect(() => {
    let isMounted = true;

    const loadAdapter = async () => {
      setIsLoading(true);
      try {
        const newAdapter =
          await GraphAdapterFactory.createAdapter(selectedAdapterType);
        if (isMounted) {
          setAdapter(newAdapter);
          setIsLoading(false);
        }
      } catch {
        // Error loading graph adapter - silently fail and stop loading
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadAdapter();

    return () => {
      isMounted = false;
    };
  }, [selectedAdapterType]);

  // Convert entities to graph data
  const graphData = useMemo(() => {
    if (!adapter) return null;
    return adapter.convertEntitiesToGraphData(entity, relatedEntities);
  }, [adapter, entity, relatedEntities]);

  // Create adapter config
  const config = useMemo(
    () => ({
      width: dimensions.width,
      height: dimensions.height,
      themeColors,
      interactive: false,
      fitView: true,
    }),
    [dimensions, themeColors],
  );

  const adapterOptions = [
    { value: "reactflow-hierarchical", label: "2D Hierarchical" },
    { value: "react-force-graph-3d", label: "3D Force-Directed" },
    { value: "r3f-forcegraph", label: "3D R3F Force Graph" },
  ];

  return (
    <div
      ref={containerRef}
      style={{
        width: "100%",
        position: "relative",
      }}
    >
      {showAdapterSelector && (
        <div
          style={{
            marginBottom: "8px",
            display: "flex",
            justifyContent: "flex-end",
          }}
        >
          <Select
            size="xs"
            data={adapterOptions}
            value={selectedAdapterType}
            onChange={(value) =>
              value && setSelectedAdapterType(value as GraphAdapterType)
            }
            style={{ width: "160px" }}
            placeholder="Select graph type"
            disabled={isLoading}
          />
        </div>
      )}

      {isLoading || !adapter || !graphData ? (
        <GraphLoadingFallback />
      ) : (
        <div style={{ height: "300px", position: "relative" }}>
          {adapter.render(graphData, config)}
        </div>
      )}
    </div>
  );
}
