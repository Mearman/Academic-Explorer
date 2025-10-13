import type { ReactForceGraph3DConfig } from "./types";

/**
 * React Force Graph 3D adapter configurations
 */
export const REACT_FORCE_GRAPH_3D_CONFIGS: ReactForceGraph3DConfig[] = [
  {
    name: "Standard 3D Force",
    description: "Balanced 3D force simulation with moderate forces",
    isDefault: true,
    force: {
      link: -30,
      charge: -400,
      center: 1,
    },
    nodeSize: 8,
    linkWidth: 2,
    enableControls: true,
  },
  {
    name: "Compact 3D Sphere",
    description: "Strong attraction forces for spherical clustering in 3D",
    force: {
      link: -50,
      charge: -200,
      center: 2,
    },
    nodeSize: 6,
    linkWidth: 1,
    enableControls: true,
  },
  {
    name: "Explosive 3D",
    description: "High repulsion forces for dynamic 3D spread",
    force: {
      link: -15,
      charge: -800,
      center: 0.5,
    },
    nodeSize: 10,
    linkWidth: 3,
    enableControls: true,
  },
  {
    name: "Minimal 3D",
    description: "Subtle forces with small nodes for clean 3D visualization",
    force: {
      link: -20,
      charge: -300,
      center: 1,
    },
    nodeSize: 4,
    linkWidth: 1,
    enableControls: false,
  },
];
