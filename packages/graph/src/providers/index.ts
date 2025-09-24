/**
 * Provider and Component Type Exports
 * Stub providers and component types for XYFlow integration
 */

// Provider factory functions (stubs)
export function createGraphProvider(_config?: unknown): unknown {
  throw new Error("createGraphProvider not available in graph package - use from application layer");
}

export function XYFlowProvider(_props: { children: unknown }): unknown {
  throw new Error("XYFlowProvider not available in graph package - use from application layer");
}

// Node and edge types for XYFlow (stubs)
export const nodeTypes = {
  default: null,
  input: null,
  output: null,
  group: null
};

export const edgeTypes = {
  default: null,
  straight: null,
  step: null,
  smoothstep: null,
  bezier: null
};

// Type definitions for XYFlow components
export interface XYFlowNodeData {
  label?: string;
  [key: string]: unknown;
}

export interface XYFlowEdgeData {
  label?: string;
  [key: string]: unknown;
}

export interface XYFlowNode {
  id: string;
  type?: string;
  position: { x: number; y: number };
  data: XYFlowNodeData;
  [key: string]: unknown;
}

export interface XYFlowEdge {
  id: string;
  source: string;
  target: string;
  type?: string;
  data?: XYFlowEdgeData;
  [key: string]: unknown;
}