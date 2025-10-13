import type { ReactFlowConfig } from "./types";

/**
 * ReactFlow hierarchical adapter configurations
 */
export const REACTFLOW_CONFIGS: ReactFlowConfig[] = [
  {
    name: "Standard Hierarchical",
    description: "Top-bottom hierarchical layout with standard spacing",
    isDefault: true,
    direction: "TB",
    nodeSpacing: 150,
    levelSpacing: 100,
    alignCenter: true,
  },
  {
    name: "Compact Hierarchical",
    description: "Top-bottom layout with tighter spacing for dense graphs",
    direction: "TB",
    nodeSpacing: 100,
    levelSpacing: 80,
    alignCenter: true,
  },
  {
    name: "Wide Hierarchical",
    description: "Top-bottom layout with generous spacing",
    direction: "TB",
    nodeSpacing: 200,
    levelSpacing: 150,
    alignCenter: true,
  },
  {
    name: "Left-to-Right",
    description: "Horizontal layout flowing left to right",
    direction: "LR",
    nodeSpacing: 150,
    levelSpacing: 100,
    alignCenter: false,
  },
  {
    name: "Right-to-Left",
    description: "Horizontal layout flowing right to left",
    direction: "RL",
    nodeSpacing: 150,
    levelSpacing: 100,
    alignCenter: false,
  },
];
