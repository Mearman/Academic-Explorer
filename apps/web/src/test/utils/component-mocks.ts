/**
 * Component dependency mocking utilities
 * Provides mocks for complex external components and libraries
 */

import { vi } from "vitest";
import React from "react";

/**
 * Mock XYFlow/React Flow components and hooks
 * These are heavy components that don't need to be tested in isolation
 */
export const mockXYFlow = () => {
  const mockNode = {
    id: "test-node",
    position: { x: 0, y: 0 },
    data: { label: "Test Node" },
    type: "default",
  };

  const mockEdge = {
    id: "test-edge",
    source: "test-source",
    target: "test-target",
    type: "default",
  };

  vi.doMock("@xyflow/react", () => ({
    ReactFlow: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) =>
      React.createElement(
        "div",
        { "data-testid": "@xyflow/react", ...props },
        children,
      ),
    MiniMap: (props: Record<string, unknown>) =>
      React.createElement("div", { "data-testid": "minimap", ...props }),
    Controls: (props: Record<string, unknown>) =>
      React.createElement("div", { "data-testid": "controls", ...props }),
    Background: (props: Record<string, unknown>) =>
      React.createElement("div", { "data-testid": "background", ...props }),
    Panel: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) =>
      React.createElement(
        "div",
        { "data-testid": "panel", ...props },
        children,
      ),
    Handle: (props: Record<string, unknown>) =>
      React.createElement("div", { "data-testid": "handle", ...props }),
    NodeResizer: (props: Record<string, unknown>) =>
      React.createElement("div", { "data-testid": "node-resizer", ...props }),

    // Hooks
    useNodesState: () => [[mockNode], vi.fn(), vi.fn()],
    useEdgesState: () => [[mockEdge], vi.fn(), vi.fn()],
    useReactFlow: () => ({
      getNodes: vi.fn(() => [mockNode]),
      getEdges: vi.fn(() => [mockEdge]),
      setNodes: vi.fn(),
      setEdges: vi.fn(),
      addNodes: vi.fn(),
      addEdges: vi.fn(),
      deleteElements: vi.fn(),
      fitView: vi.fn(),
      project: vi.fn(),
      getViewport: vi.fn(() => ({ x: 0, y: 0, zoom: 1 })),
      setViewport: vi.fn(),
      screenToFlowPosition: vi.fn(),
      flowToScreenPosition: vi.fn(),
      zoomIn: vi.fn(),
      zoomOut: vi.fn(),
      zoomTo: vi.fn(),
      getIntersectingNodes: vi.fn(() => []),
      isNodeIntersecting: vi.fn(() => false),
      updateNode: vi.fn(),
      updateNodeData: vi.fn(),
    }),
    useStore: vi.fn(),
    useStoreApi: vi.fn(),
    useKeyPress: vi.fn(),
    useOnSelectionChange: vi.fn(),
    useOnViewportChange: vi.fn(),
    useUpdateNodeInternals: vi.fn(),

    // Utilities
    addEdge: vi.fn(),
    applyEdgeChanges: vi.fn(),
    applyNodeChanges: vi.fn(),
    getConnectedEdges: vi.fn(() => []),
    getIncomers: vi.fn(() => []),
    getOutgoers: vi.fn(() => []),
    isEdge: vi.fn(),
    isNode: vi.fn(),

    // Provider
    ReactFlowProvider: ({ children }: React.PropsWithChildren<Record<string, unknown>>) => children,

    // Types and constants
    Position: {
      Top: "top",
      Right: "right",
      Bottom: "bottom",
      Left: "left",
    },
    MarkerType: {
      Arrow: "arrow",
      ArrowClosed: "arrowclosed",
    },
    ConnectionMode: {
      Strict: "strict",
      Loose: "loose",
    },
  }));
};

/**
 * Mock D3 force simulation and related utilities
 */
export const mockD3Force = () => {
  const mockSimulation = {
    nodes: vi.fn().mockReturnThis(),
    force: vi.fn().mockReturnThis(),
    on: vi.fn().mockReturnThis(),
    restart: vi.fn().mockReturnThis(),
    stop: vi.fn().mockReturnThis(),
    tick: vi.fn().mockReturnThis(),
    alpha: vi.fn().mockReturnThis(),
    alphaTarget: vi.fn().mockReturnThis(),
    alphaDecay: vi.fn().mockReturnThis(),
    velocityDecay: vi.fn().mockReturnThis(),
    find: vi.fn(),
  };

  vi.doMock("d3-force", () => ({
    forceSimulation: vi.fn(() => mockSimulation),
    forceLink: vi.fn(() => ({
      id: vi.fn().mockReturnThis(),
      distance: vi.fn().mockReturnThis(),
      strength: vi.fn().mockReturnThis(),
      iterations: vi.fn().mockReturnThis(),
    })),
    forceManyBody: vi.fn(() => ({
      strength: vi.fn().mockReturnThis(),
      theta: vi.fn().mockReturnThis(),
      distanceMin: vi.fn().mockReturnThis(),
      distanceMax: vi.fn().mockReturnThis(),
    })),
    forceCenter: vi.fn(() => ({
      x: vi.fn().mockReturnThis(),
      y: vi.fn().mockReturnThis(),
      strength: vi.fn().mockReturnThis(),
    })),
    forceCollide: vi.fn(() => ({
      radius: vi.fn().mockReturnThis(),
      strength: vi.fn().mockReturnThis(),
      iterations: vi.fn().mockReturnThis(),
    })),
    forceX: vi.fn(() => ({
      x: vi.fn().mockReturnThis(),
      strength: vi.fn().mockReturnThis(),
    })),
    forceY: vi.fn(() => ({
      y: vi.fn().mockReturnThis(),
      strength: vi.fn().mockReturnThis(),
    })),
  }));

  vi.doMock("d3-drag", () => ({
    drag: vi.fn(() => ({
      subject: vi.fn().mockReturnThis(),
      on: vi.fn().mockReturnThis(),
      filter: vi.fn().mockReturnThis(),
      touchable: vi.fn().mockReturnThis(),
      clickDistance: vi.fn().mockReturnThis(),
    })),
  }));

  vi.doMock("d3-selection", () => ({
    select: vi.fn(() => ({
      call: vi.fn().mockReturnThis(),
      on: vi.fn().mockReturnThis(),
      attr: vi.fn().mockReturnThis(),
      style: vi.fn().mockReturnThis(),
      classed: vi.fn().mockReturnThis(),
      data: vi.fn().mockReturnThis(),
      enter: vi.fn().mockReturnThis(),
      exit: vi.fn().mockReturnThis(),
      remove: vi.fn().mockReturnThis(),
      append: vi.fn().mockReturnThis(),
      selectAll: vi.fn().mockReturnThis(),
    })),
    selectAll: vi.fn(),
  }));
};

/**
 * Mock Web Workers for background processing
 */
export const mockWebWorker = () => {
  const mockWorker = {
    postMessage: vi.fn(),
    terminate: vi.fn(),
    onmessage: null,
    onerror: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  };

  global.Worker = vi.fn().mockImplementation(() => mockWorker);

  return mockWorker;
};

/**
 * Mock Canvas API for components that use canvas rendering
 */
export const mockCanvas = () => {
  const mockContext = {
    fillRect: vi.fn(),
    clearRect: vi.fn(),
    getImageData: vi.fn(() => ({ data: new Uint8ClampedArray(4) })),
    putImageData: vi.fn(),
    createImageData: vi.fn(),
    setTransform: vi.fn(),
    resetTransform: vi.fn(),
    scale: vi.fn(),
    rotate: vi.fn(),
    translate: vi.fn(),
    transform: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    beginPath: vi.fn(),
    closePath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    bezierCurveTo: vi.fn(),
    quadraticCurveTo: vi.fn(),
    arc: vi.fn(),
    arcTo: vi.fn(),
    ellipse: vi.fn(),
    rect: vi.fn(),
    fill: vi.fn(),
    stroke: vi.fn(),
    drawFocusIfNeeded: vi.fn(),
    clip: vi.fn(),
    isPointInPath: vi.fn(),
    isPointInStroke: vi.fn(),
    measureText: vi.fn(() => ({ width: 0 })),
    fillText: vi.fn(),
    strokeText: vi.fn(),
    drawImage: vi.fn(),
    createLinearGradient: vi.fn(),
    createRadialGradient: vi.fn(),
    createPattern: vi.fn(),
  };

  HTMLCanvasElement.prototype.getContext = vi.fn(() => mockContext) as unknown as typeof HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.toDataURL = vi.fn(
    () => "data:image/png;base64,test",
  );
  HTMLCanvasElement.prototype.toBlob = vi.fn();

  return mockContext;
};

/**
 * Mock IndexedDB for client-side storage testing
 */
export const mockIndexedDB = () => {
  const mockDB = {
    close: vi.fn(),
    createObjectStore: vi.fn(),
    deleteObjectStore: vi.fn(),
    transaction: vi.fn(() => ({
      objectStore: vi.fn(() => ({
        add: vi.fn(),
        put: vi.fn(),
        get: vi.fn(),
        delete: vi.fn(),
        clear: vi.fn(),
        count: vi.fn(),
        getAll: vi.fn(),
        getAllKeys: vi.fn(),
        openCursor: vi.fn(),
        openKeyCursor: vi.fn(),
      })),
      abort: vi.fn(),
      commit: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  };

  const mockRequest = {
    result: mockDB,
    error: null,
    readyState: "done",
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  };

  global.indexedDB = {
    open: vi.fn(() => mockRequest),
    deleteDatabase: vi.fn(() => mockRequest),
    databases: vi.fn(() => Promise.resolve([])),
    cmp: vi.fn(),
  } as unknown as IDBFactory;

  return { mockDB, mockRequest };
};

/**
 * Setup all component mocks at once
 */
export function setupComponentMocks() {
  mockXYFlow();
  mockD3Force();
  mockWebWorker();
  mockCanvas();
  mockIndexedDB();
}

/**
 * Reset all component mocks
 */
export function resetComponentMocks() {
  vi.clearAllMocks();
}
