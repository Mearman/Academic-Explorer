import React, {
  useMemo,
  useRef,
  useCallback,
  useEffect,
  useState,
} from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Html } from "@react-three/drei";
import R3fForceGraph, { GraphMethods } from "r3f-forcegraph";
import SpriteText from "three-spritetext";
import * as THREE from "three";

import type {
  GraphData,
  GraphAdapterConfig,
  GraphAdapter,
  GraphNode,
  GraphLink,
} from "./GraphAdapter";
import type { R3FForceGraphConfig } from "../configs";
import { detectEntityType } from "@academic-explorer/graph";
import type { OpenAlexEntity } from "@academic-explorer/types";

// Fit View Button Component
function FitViewButton({ onFitView }: { onFitView: () => void }) {
  return (
    <button
      onClick={onFitView}
      style={{
        position: "absolute",
        top: "8px",
        right: "8px",
        zIndex: 1000,
        background: "rgba(0, 0, 0, 0.8)",
        color: "white",
        border: "1px solid #666",
        borderRadius: "4px",
        padding: "6px 12px",
        fontSize: "12px",
        fontWeight: "bold",
        cursor: "pointer",
        backdropFilter: "blur(4px)",
      }}
      title="Fit view to graph"
    >
      Fit View
    </button>
  );
}

// Camera Controller Component
function CameraController({
  fgRef,
  controlsRef,
  cameraDistance,
  enableControls,
  nodeCount,
  linkCount,
}: {
  fgRef: React.RefObject<GraphMethods | undefined>;
  controlsRef: React.RefObject<any>;
  cameraDistance: number;
  enableControls: boolean;
  nodeCount: number;
  linkCount: number;
}) {
  const { camera } = useThree();
  const [isInitialized, setIsInitialized] = useState(false);

  // Auto-fit camera when data changes
  useEffect(() => {
    if (!isInitialized && nodeCount > 0) {
      // Wait a bit for the graph to stabilize
      const timeoutId = setTimeout(() => {
        try {
          // Try to get the graph bounding box for better camera positioning
          let bbox: {
            x: [number, number];
            y: [number, number];
            z: [number, number];
          } | null = null;
          if (
            fgRef.current?.getGraphBbox &&
            typeof fgRef.current.getGraphBbox === "function"
          ) {
            bbox = fgRef.current.getGraphBbox();
          }

          let optimalDistance = Math.max(5000, cameraDistance); // Default fallback - much larger
          let targetPosition = { x: 0, y: 0, z: 0 };

          if (bbox) {
            // Calculate the center of the bounding box
            const { x, y, z } = bbox;
            const centerX = (x[0] + x[1]) / 2;
            const centerY = (y[0] + y[1]) / 2;
            const centerZ = (z[0] + z[1]) / 2;

            // Calculate the maximum extent from center
            const extentX = Math.max(
              Math.abs(centerX - x[0]),
              Math.abs(centerX - x[1]),
            );
            const extentY = Math.max(
              Math.abs(centerY - y[0]),
              Math.abs(centerY - y[1]),
            );
            const extentZ = Math.max(
              Math.abs(centerZ - z[0]),
              Math.abs(centerZ - z[1]),
            );
            const maxExtent = Math.max(extentX, extentY, extentZ);

            // Use a larger multiplier to ensure the graph fits
            optimalDistance = maxExtent * 4; // Much more conservative
            targetPosition = { x: centerX, y: centerY, z: centerZ };
          }

          // Position camera to view the entire graph
          camera.position.set(
            targetPosition.x,
            targetPosition.y,
            targetPosition.z + optimalDistance,
          );
          camera.lookAt(targetPosition.x, targetPosition.y, targetPosition.z);

          // Update controls if they exist
          if (
            controlsRef.current &&
            typeof controlsRef.current.update === "function"
          ) {
            controlsRef.current.target.set(
              targetPosition.x,
              targetPosition.y,
              targetPosition.z,
            );
            controlsRef.current.update();
          }

          setIsInitialized(true);
        } catch {
          // Fallback positioning
          camera.position.set(0, 0, cameraDistance || 5000);
          camera.lookAt(0, 0, 0);
          setIsInitialized(true);
        }
      }, 2000); // Wait 2 seconds for graph to stabilize

      return () => clearTimeout(timeoutId);
    }
  }, [
    fgRef,
    controlsRef,
    camera,
    cameraDistance,
    nodeCount,
    linkCount,
    isInitialized,
  ]);

  return null;
}

function R3FForceGraphScene({
  data,
  config,
  adapterConfig,
  fitViewTriggerRef,
}: {
  data: GraphData;
  config: GraphAdapterConfig;
  adapterConfig?: R3FForceGraphConfig;
  fitViewTriggerRef: React.RefObject<(() => void) | null>;
}) {
  const fgRef = useRef<GraphMethods | undefined>(undefined);
  const controlsRef = useRef<any>(null);
  const { camera } = useThree();
  const [currentNodes, setCurrentNodes] = useState<
    Array<{ id: string; name?: string; x?: number; y?: number; z?: number }>
  >([]);

  // Call tickFrame on every frame to update the simulation
  useFrame(() => {
    if (fgRef.current) {
      fgRef.current.tickFrame();
    }
  });

  // Convert GraphData to r3f-forcegraph format
  const graphData = useMemo(() => {
    const convertedNodes = data.nodes.map((node) => ({
      id: node.id,
      name: node.label,
      color: config.themeColors.getEntityColor(node.entityType),
      val: node.size || 4,
    }));

    const convertedLinks = data.links.map((link) => ({
      source: link.source,
      target: link.target,
      value: link.value || 1,
    }));

    return {
      nodes: convertedNodes,
      links: convertedLinks,
    };
  }, [data, config.themeColors]);

  // State to track node positions for labels
  const [nodePositions, setNodePositions] = useState<
    Map<string, { x: number; y: number; z: number }>
  >(new Map());

  // Callback to update node positions for labels
  const nodePositionUpdate = useCallback(
    (
      nodeObject: unknown,
      coords: { x: number; y: number; z: number },
      node: { id?: string | number | undefined },
    ) => {
      // Update the position for this specific node
      if (node.id !== undefined) {
        setNodePositions((prev) => {
          const newMap = new Map(prev);
          newMap.set(String(node.id), coords);
          return newMap;
        });
      }
    },
    [],
  );

  // Update currentNodes whenever nodePositions changes
  useEffect(() => {
    const updatedNodes = data.nodes.map((node) => {
      const pos = nodePositions.get(node.id);
      return {
        id: node.id,
        name: node.label || node.id,
        x: pos?.x,
        y: pos?.y,
        z: pos?.z,
      };
    });
    setCurrentNodes(updatedNodes);
  }, [data.nodes, nodePositions]);

  // Fit view handler
  const handleFitView = useCallback(() => {
    try {
      // Try to get the graph bounding box for better camera positioning
      let bbox: {
        x: [number, number];
        y: [number, number];
        z: [number, number];
      } | null = null;
      if (
        fgRef.current?.getGraphBbox &&
        typeof fgRef.current.getGraphBbox === "function"
      ) {
        bbox = fgRef.current.getGraphBbox();
      }

      let optimalDistance = 5000; // Default fallback - much larger
      let targetPosition = { x: 0, y: 0, z: 0 };

      if (bbox) {
        // Calculate the center of the bounding box
        const { x, y, z } = bbox;
        const centerX = (x[0] + x[1]) / 2;
        const centerY = (y[0] + y[1]) / 2;
        const centerZ = (z[0] + z[1]) / 2;

        // Calculate the maximum extent from center
        const extentX = Math.max(
          Math.abs(centerX - x[0]),
          Math.abs(centerX - x[1]),
        );
        const extentY = Math.max(
          Math.abs(centerY - y[0]),
          Math.abs(centerY - y[1]),
        );
        const extentZ = Math.max(
          Math.abs(centerZ - z[0]),
          Math.abs(centerZ - z[1]),
        );
        const maxExtent = Math.max(extentX, extentY, extentZ);

        // Use a larger multiplier to ensure the graph fits
        optimalDistance = maxExtent * 4; // Much more conservative
        targetPosition = { x: centerX, y: centerY, z: centerZ };
      }

      // Set camera position and look at the center
      camera.position.set(
        targetPosition.x,
        targetPosition.y,
        targetPosition.z + optimalDistance,
      );
      camera.lookAt(targetPosition.x, targetPosition.y, targetPosition.z);

      // Update controls if they exist
      if (controlsRef.current) {
        controlsRef.current.target.set(
          targetPosition.x,
          targetPosition.y,
          targetPosition.z,
        );
        controlsRef.current.update();
      }
    } catch {
      // Fallback: reset to default position
      camera.position.set(0, 0, adapterConfig?.cameraDistance || 5000);
      camera.lookAt(0, 0, 0);
    }
  }, [fgRef, camera, adapterConfig?.cameraDistance]);

  // Set the fit view trigger ref so parent component can call it
  useEffect(() => {
    fitViewTriggerRef.current = handleFitView;
  }, [handleFitView, fitViewTriggerRef]);

  const nodeColor = useCallback(
    (node: Record<string, unknown> & { color?: string }) => {
      return node.color || config.themeColors.colors.background.tertiary;
    },
    [config.themeColors],
  );

  const linkColor = useCallback(() => {
    return config.themeColors.colors.border.secondary;
  }, [config.themeColors]);

  const enableControls =
    adapterConfig?.enableOrbitControls ?? config.interactive ?? false;

  return (
    <>
      <CameraController
        fgRef={fgRef}
        controlsRef={controlsRef}
        cameraDistance={adapterConfig?.cameraDistance || 5000}
        enableControls={enableControls}
        nodeCount={data.nodes.length}
        linkCount={data.links.length}
      />
      {enableControls && (
        <OrbitControls
          ref={controlsRef}
          enablePan={true}
          enableZoom={true}
          enableRotate={true}
        />
      )}
      <ambientLight args={[config.themeColors.colors.text.primary, 0.5]} />
      <directionalLight
        args={[config.themeColors.colors.text.primary, 0.8]}
        position={[1000, 1000, 1000]}
      />
      <R3fForceGraph
        ref={fgRef}
        graphData={graphData}
        nodeColor={nodeColor}
        nodeVal={(node: Record<string, unknown> & { val?: number }) =>
          node.val || adapterConfig?.nodeSize || 4
        }
        linkColor={linkColor}
        linkWidth={adapterConfig?.linkWidth || 2}
        linkDirectionalArrowLength={3}
        linkDirectionalArrowRelPos={1}
        nodeOpacity={1.0}
        linkOpacity={0.3}
        cooldownTicks={100}
        warmupTicks={30}
        nodePositionUpdate={nodePositionUpdate}
        nodeThreeObject={(node: any) => {
          // Create a group containing both the node sphere and its label
          const group = new THREE.Group();

          // Create the node sphere
          const nodeGeometry = new THREE.SphereGeometry(
            node.val || adapterConfig?.nodeSize || 4,
            8,
            8,
          );
          const nodeMaterial = new THREE.MeshLambertMaterial({
            color:
              node.color || config.themeColors.getEntityColor(node.entityType),
            transparent: true,
            opacity: 1.0,
          });
          const nodeMesh = new THREE.Mesh(nodeGeometry, nodeMaterial);
          group.add(nodeMesh);

          // Create the label as a sprite
          if (node.name || node.id) {
            const sprite = new SpriteText(node.name || node.id);
            sprite.color = "white";
            sprite.backgroundColor = "rgba(255, 0, 0, 0.9)";
            sprite.padding = [6, 12];
            sprite.borderRadius = 6;
            sprite.fontSize = 16;
            sprite.fontWeight = "bold";
            sprite.borderColor = "white";
            sprite.borderWidth = 3;
            sprite.position.set(0, 10, 0); // Position above the node
            group.add(sprite);
          }

          return group;
        }}
      />
    </>
  );
}

function R3FForceGraphComponent({
  data,
  config,
  adapterConfig,
  registerFitViewCallback,
}: {
  data: GraphData;
  config: GraphAdapterConfig;
  adapterConfig?: R3FForceGraphConfig;
  registerFitViewCallback: (callback: () => void) => () => void;
}) {
  const fgRef = useRef<GraphMethods | undefined>(undefined);
  const controlsRef = useRef<any>(null);

  // Create a fit view trigger that will be called from the scene
  const fitViewTriggerRef = useRef<(() => void) | null>(null);

  const handleFitView = useCallback(() => {
    // Trigger fit view in the scene component
    if (fitViewTriggerRef.current) {
      fitViewTriggerRef.current();
    }
  }, []);

  // Register the fit view callback with the adapter
  useEffect(() => {
    return registerFitViewCallback(handleFitView);
  }, [registerFitViewCallback, handleFitView]);

  // Button click handler
  const handleButtonClick = useCallback(() => {
    handleFitView();
  }, [handleFitView]);

  return (
    <div style={{ width: "100%", height: "300px", position: "relative" }}>
      <FitViewButton onFitView={handleButtonClick} />
      <Canvas
        camera={{
          position: [0, 0, 5000], // Start with a larger default distance
          far: 20000,
        }}
        style={{ background: config.themeColors.colors.background.secondary }}
      >
        <R3FForceGraphScene
          data={data}
          config={config}
          adapterConfig={adapterConfig}
          fitViewTriggerRef={fitViewTriggerRef}
        />
      </Canvas>
    </div>
  );
}

export class R3FForceGraphAdapter implements GraphAdapter {
  private config?: R3FForceGraphConfig;
  private fitViewCallbacks: Array<() => void> = [];

  constructor(config?: R3FForceGraphConfig) {
    this.config = config;
  }

  fitView(): void {
    // Call all registered callbacks
    this.fitViewCallbacks.forEach((callback) => callback());
  }

  render({
    data,
    config,
  }: {
    data: GraphData;
    config: GraphAdapterConfig;
  }): React.ReactElement {
    return (
      <R3FForceGraphComponent
        data={data}
        config={config}
        adapterConfig={this.config}
        registerFitViewCallback={(callback) => {
          this.fitViewCallbacks.push(callback);
          return () => {
            this.fitViewCallbacks = this.fitViewCallbacks.filter(
              (cb) => cb !== callback,
            );
          };
        }}
      />
    );
  }

  convertEntitiesToGraphData({
    mainEntity,
    relatedEntities,
  }: {
    mainEntity: OpenAlexEntity;
    relatedEntities: OpenAlexEntity[];
  }): GraphData {
    const nodes: GraphNode[] = [];
    const links: GraphLink[] = [];

    // Add main entity node
    const mainEntityType = detectEntityType(mainEntity.id);
    const mainNode = {
      id: mainEntity.id,
      label: mainEntity.display_name || mainEntity.id,
      color: "primary",
      size: 6,
      entityType: mainEntityType,
    };
    nodes.push(mainNode);

    // Add related entity nodes
    relatedEntities.forEach((relatedEntity) => {
      const entityType = detectEntityType(relatedEntity.id);
      const relatedNode = {
        id: relatedEntity.id,
        label: relatedEntity.display_name || relatedEntity.id,
        color: "secondary",
        size: 4,
        entityType,
      };
      nodes.push(relatedNode);

      // Add edge from main entity to related entity
      const link = {
        source: mainEntity.id,
        target: relatedEntity.id,
        value: 1,
      };
      links.push(link);
    });

    return { nodes, links };
  }
}
