import type { R3FForceGraphConfig } from "./types";

/**
 * R3F Force Graph adapter configurations
 */
export const R3F_FORCEGRAPH_CONFIGS: R3FForceGraphConfig[] = [
  {
    name: "Standard R3F Force",
    description: "Balanced R3F force simulation with moderate forces",
    isDefault: true,
    force: {
      link: -30,
      charge: -400,
      center: 1,
    },
    nodeSize: 8,
    linkWidth: 2,
    cameraDistance: 1000,
    enableOrbitControls: true,
    showLabels: true,
  },
  {
    name: "Compact R3F Sphere",
    description: "Strong attraction forces for spherical clustering in R3F",
    force: {
      link: -50,
      charge: -200,
      center: 2,
    },
    nodeSize: 6,
    linkWidth: 1,
    cameraDistance: 800,
    enableOrbitControls: true,
    showLabels: true,
  },
  {
    name: "Explosive R3F",
    description: "High repulsion forces for dynamic R3F spread",
    force: {
      link: -15,
      charge: -800,
      center: 0.5,
    },
    nodeSize: 10,
    linkWidth: 3,
    cameraDistance: 1500,
    enableOrbitControls: true,
    showLabels: true,
  },
  {
    name: "Minimal R3F",
    description: "Subtle forces with small nodes for clean R3F visualization",
    force: {
      link: -20,
      charge: -300,
      center: 1,
    },
    nodeSize: 4,
    linkWidth: 1,
    cameraDistance: 600,
    enableOrbitControls: false,
    showLabels: true,
  },
];
