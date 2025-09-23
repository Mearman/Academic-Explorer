import type { Force } from "d3-force";
import type { D3SimulationNode, D3SimulationLink } from "./force-simulation-engine";

/**
 * Type guards and utilities for working with D3 forces safely without type assertions
 */

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