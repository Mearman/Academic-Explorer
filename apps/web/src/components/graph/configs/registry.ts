import type { GraphAdapterConfigRegistry, GraphConfigOption } from "./types";
import type { GraphAdapterType } from "../adapters/GraphAdapterFactory";
import { REACTFLOW_CONFIGS } from "./reactflow-configs";
import { REACT_FORCE_GRAPH_2D_CONFIGS } from "./react-force-graph-2d-configs";
import { REACT_FORCE_GRAPH_3D_CONFIGS } from "./react-force-graph-3d-configs";
import { R3F_FORCEGRAPH_CONFIGS } from "./r3f-forcegraph-configs";

/**
 * Centralized registry of all graph adapter configurations
 */
export const GRAPH_ADAPTER_CONFIG_REGISTRY: GraphAdapterConfigRegistry = {
  "reactflow-hierarchical": {
    adapterType: "reactflow-hierarchical",
    configs: REACTFLOW_CONFIGS,
  },
  "react-force-graph-2d": {
    adapterType: "react-force-graph-2d",
    configs: REACT_FORCE_GRAPH_2D_CONFIGS,
  },
  "react-force-graph-3d": {
    adapterType: "react-force-graph-3d",
    configs: REACT_FORCE_GRAPH_3D_CONFIGS,
  },
  "r3f-forcegraph": {
    adapterType: "r3f-forcegraph",
    configs: R3F_FORCEGRAPH_CONFIGS,
  },
};

/**
 * Get all available graph configurations as selectable options
 */
export function getAllGraphConfigOptions(): GraphConfigOption[] {
  const options: GraphConfigOption[] = [];

  Object.entries(GRAPH_ADAPTER_CONFIG_REGISTRY).forEach(([key, registry]) => {
    registry.configs.forEach((config, index) => {
      options.push({
        id: `${key}-${index}`,
        label: config.name,
        description: config.description,
        adapterType: registry.adapterType,
        config,
      });
    });
  });

  return options;
}

/**
 * Get default configuration for a specific adapter type
 */
export function getDefaultConfigForAdapter(
  adapterType: GraphAdapterType,
): GraphConfigOption | null {
  const registry = GRAPH_ADAPTER_CONFIG_REGISTRY[adapterType];
  if (!registry) return null;

  const defaultConfig = registry.configs.find((config) => config.isDefault);
  if (!defaultConfig) return null;

  return {
    id: `${adapterType}-default`,
    label: defaultConfig.name,
    description: defaultConfig.description,
    adapterType,
    config: defaultConfig,
  };
}

/**
 * Get all configurations for a specific adapter type
 */
export function getConfigsForAdapter(
  adapterType: GraphAdapterType,
): GraphConfigOption[] {
  const registry = GRAPH_ADAPTER_CONFIG_REGISTRY[adapterType];
  if (!registry) return [];

  return registry.configs.map((config, index) => ({
    id: `${adapterType}-${index}`,
    label: config.name,
    description: config.description,
    adapterType,
    config,
  }));
}
