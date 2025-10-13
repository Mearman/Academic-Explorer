import type { ReactForceGraph2DConfig } from "./types";

/**
 * React Force Graph 2D adapter configurations
 */
export const REACT_FORCE_GRAPH_2D_CONFIGS: ReactForceGraph2DConfig[] = [
  {
    name: "Balanced Force",
    description:
      "Balanced force simulation with moderate attraction and repulsion",
    isDefault: true,
    force: {
      link: -30,
      charge: -400,
      center: 1,
    },
    nodeSize: 8,
    linkWidth: 2,
    enableZoom: true,
  },
  {
    name: "Tight Clustering",
    description: "Strong attraction forces for tight node clustering",
    force: {
      link: -50,
      charge: -200,
      center: 1,
    },
    nodeSize: 6,
    linkWidth: 1,
    enableZoom: true,
  },
  {
    name: "Loose Network",
    description: "Weak forces for a more spread out, organic layout",
    force: {
      link: -15,
      charge: -600,
      center: 0.5,
    },
    nodeSize: 10,
    linkWidth: 3,
    enableZoom: true,
  },
  {
    name: "High Energy",
    description: "Strong repulsive forces for dynamic, spread out layout",
    force: {
      link: -20,
      charge: -800,
      center: 0.8,
    },
    nodeSize: 12,
    linkWidth: 2,
    enableZoom: true,
  },
];
