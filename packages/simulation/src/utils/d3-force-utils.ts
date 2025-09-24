import type { Force } from "d3-force";

/**
 * Type guards and utilities for working with D3 forces safely without type assertions
 * Framework-agnostic utilities that work with any D3 simulation node/link types
 */

// Generic node and link types for D3 compatibility
export interface D3SimulationNode {
  id: string;
  type?: string;
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
  vx?: number;
  vy?: number;
  index?: number;
}

export interface D3SimulationLink {
  id: string;
  source: string | D3SimulationNode;
  target: string | D3SimulationNode;
  index?: number;
}

// Type guard interfaces for different force types
interface ForceWithStrength {
  strength(): number;
  strength(strength: number | ((d: D3SimulationNode, i: number, data: D3SimulationNode[]) => number)): this;
}

interface ForceWithDistance {
  distance(): number;
  distance(distance: number | ((d: D3SimulationNode, i: number, data: D3SimulationNode[]) => number)): this;
}

interface ForceWithRadius {
  radius(): number;
  radius(radius: number | ((d: D3SimulationNode, i: number, data: D3SimulationNode[]) => number)): this;
}

// Type guards
export function hasStrength(force: Force<D3SimulationNode, D3SimulationLink>): force is Force<D3SimulationNode, D3SimulationLink> & ForceWithStrength {
  return "strength" in force && typeof force.strength === "function";
}

export function hasDistance(force: Force<D3SimulationNode, D3SimulationLink>): force is Force<D3SimulationNode, D3SimulationLink> & ForceWithDistance {
  return "distance" in force && typeof force.distance === "function";
}

export function hasRadius(force: Force<D3SimulationNode, D3SimulationLink>): force is Force<D3SimulationNode, D3SimulationLink> & ForceWithRadius {
  return "radius" in force && typeof force.radius === "function";
}

// Safe accessor functions
export function setForceStrength({ force, strength }: { force: Force<D3SimulationNode, D3SimulationLink>; strength: number }): boolean {
  if (hasStrength(force)) {
    force.strength(strength);
    return true;
  }
  return false;
}

export function setForceDistance({ force, distance }: { force: Force<D3SimulationNode, D3SimulationLink>; distance: number }): boolean {
  if (hasDistance(force)) {
    force.distance(distance);
    return true;
  }
  return false;
}

export function setForceRadius({ force, radius }: { force: Force<D3SimulationNode, D3SimulationLink>; radius: number }): boolean {
  if (hasRadius(force)) {
    force.radius(radius);
    return true;
  }
  return false;
}

export function getForceStrength(force: Force<D3SimulationNode, D3SimulationLink>): number | null {
  if (hasStrength(force)) {
    return force.strength();
  }
  return null;
}

export function getForceDistance(force: Force<D3SimulationNode, D3SimulationLink>): number | null {
  if (hasDistance(force)) {
    return force.distance();
  }
  return null;
}

export function getForceRadius(force: Force<D3SimulationNode, D3SimulationLink>): number | null {
  if (hasRadius(force)) {
    return force.radius();
  }
  return null;
}

// Validation utilities
export function isValidPosition(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export function sanitizePosition(value: unknown, fallback = 0): number {
  return isValidPosition(value) ? value : fallback;
}

// Node position utilities
export function extractNodePosition(node: D3SimulationNode): { x: number; y: number } {
  return {
    x: sanitizePosition(node.x),
    y: sanitizePosition(node.y)
  };
}

export function setNodePosition(node: D3SimulationNode, x: number, y: number): void {
  if (isValidPosition(x)) node.x = x;
  if (isValidPosition(y)) node.y = y;
}

export function pinNode(node: D3SimulationNode, x?: number, y?: number): void {
  node.fx = x ?? node.x ?? 0;
  node.fy = y ?? node.y ?? 0;
}

export function unpinNode(node: D3SimulationNode): void {
  node.fx = null;
  node.fy = null;
}

export function isNodePinned(node: D3SimulationNode): boolean {
  return node.fx !== null && node.fx !== undefined &&
         node.fy !== null && node.fy !== undefined;
}