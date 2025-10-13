import { useMemo, useState, useRef, useEffect } from "react";
import { Select } from "@mantine/core";
import { useThemeColors } from "@/hooks/use-theme-colors";

import type { OpenAlexEntity } from "@academic-explorer/client";
import type { GraphAdapter } from "./adapters/GraphAdapter";
import {
  GraphAdapterFactory,
  type GraphAdapterType,
} from "./adapters/GraphAdapterFactory";
import {
  getConfigsForAdapter,
  getDefaultConfigForAdapter,
} from "./configs/registry";
import type { GraphAdapterConfig, GraphConfigOption } from "./configs";

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
  showSelector?: boolean;
}

export function EntityMiniGraph({
  entity,
  relatedEntities,
  adapterType: initialAdapterType = GraphAdapterFactory.getDefaultAdapter(),
  showSelector = true,
}: EntityMiniGraphProps) {
  const themeColors = useThemeColors();
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 400, height: 300 });
  const [selectedOption, setSelectedOption] = useState<{
    adapterType: GraphAdapterType;
    config: GraphAdapterConfig;
  } | null>(null);
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

  // Create combined options for single dropdown
  const combinedOptions = useMemo(() => {
    const options: Array<{
      value: string;
      label: string;
      adapterType: GraphAdapterType;
      config: GraphAdapterConfig;
    }> = [];

    // Get all available adapter types
    const adapterTypes: GraphAdapterType[] = [
      "reactflow-hierarchical",
      "react-force-graph-2d",
      "react-force-graph-3d",
      "r3f-forcegraph",
    ];

    // For each adapter type, get its configs and create combined options
    adapterTypes.forEach((adapterType) => {
      const configs = getConfigsForAdapter(adapterType);
      configs.forEach((configOption) => {
        const adapterLabel = {
          "reactflow-hierarchical": "React Flow",
          "react-force-graph-2d": "React Force Graph 2D",
          "react-force-graph-3d": "React Force Graph 3D",
          "r3f-forcegraph": "R3F Force Graph",
        }[adapterType];

        options.push({
          value: `${adapterType}-${configOption.config.name}`,
          label: `${adapterLabel}: ${configOption.config.name}`,
          adapterType,
          config: configOption.config,
        });
      });
    });

    return options;
  }, []);

  // Set default option on initial load
  useEffect(() => {
    if (!selectedOption && combinedOptions.length > 0) {
      // Find the default option for the initial adapter type
      const defaultOption =
        combinedOptions.find(
          (option) =>
            option.adapterType === initialAdapterType &&
            option.config.isDefault,
        ) ||
        combinedOptions.find(
          (option) => option.adapterType === initialAdapterType,
        ) ||
        combinedOptions[0];

      if (defaultOption) {
        setSelectedOption({
          adapterType: defaultOption.adapterType,
          config: defaultOption.config,
        });
      }
    }
  }, [selectedOption, combinedOptions, initialAdapterType]);

  // Load the graph adapter when the selected option changes
  useEffect(() => {
    if (!selectedOption) return;

    let isMounted = true;

    const loadAdapter = async () => {
      setIsLoading(true);
      try {
        const newAdapter = await GraphAdapterFactory.createAdapter(
          selectedOption.adapterType,
          selectedOption.config,
        );
        if (isMounted) {
          setAdapter(newAdapter);
          setIsLoading(false);
          // Trigger fit view when a new adapter is loaded
          setTimeout(() => {
            if (newAdapter.fitView) {
              newAdapter.fitView();
            }
          }, 500); // Small delay to let the graph render
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
  }, [selectedOption]);

  // Convert entities to graph data
  const graphData = useMemo(() => {
    if (!adapter) return null;
    return adapter.convertEntitiesToGraphData(entity, relatedEntities);
  }, [adapter, entity, relatedEntities]);

  // Trigger fit view when graph data changes
  useEffect(() => {
    if (adapter && graphData && adapter.fitView) {
      // Small delay to let the graph render with new data
      const timeoutId = setTimeout(() => {
        adapter.fitView?.();
      }, 1000);
      return () => clearTimeout(timeoutId);
    }
  }, [adapter, graphData]);

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

  return (
    <div
      ref={containerRef}
      style={{
        width: "100%",
        position: "relative",
      }}
    >
      {showSelector && (
        <div
          style={{
            marginBottom: "8px",
            display: "flex",
            justifyContent: "flex-end",
          }}
        >
          <Select
            size="xs"
            data={combinedOptions.map((option) => ({
              value: option.value,
              label: option.label,
            }))}
            value={
              selectedOption
                ? `${selectedOption.adapterType}-${selectedOption.config.name}`
                : undefined
            }
            onChange={(value) => {
              if (value) {
                const option = combinedOptions.find(
                  (opt) => opt.value === value,
                );
                if (option) {
                  setSelectedOption({
                    adapterType: option.adapterType,
                    config: option.config,
                  });
                }
              }
            }}
            style={{ width: "200px" }}
            placeholder="Select graph provider & config"
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
