/**
 * Custom Force Manager
 * Manages and applies custom forces to the D3 force simulation
 */

import { logger } from "@/lib/logger";
import { forceCalculations } from "./calculations";
import type {
  CustomForce,
  CustomForceType,
  CustomForceManagerConfig,
  CustomForceManagerState,
  ForceCalculationFunction,
  ForcePerformanceMetrics,
  EnhancedSimulationNode,
  ForcePreset,
} from "./types";
import { BUILT_IN_PRESETS } from "./types";

/**
 * Custom Force Manager Class
 * Handles registration, configuration, and execution of custom forces
 */
export class CustomForceManager {
  private state: CustomForceManagerState;

  constructor(config: CustomForceManagerConfig = {}) {
    this.state = {
      forces: new Map(),
      calculationFunctions: new Map([
        ["radial", forceCalculations.radial],
        ["property-x", forceCalculations["property-x"]],
        ["property-y", forceCalculations["property-y"]],
        ["property-both", forceCalculations["property-both"]],
        ["cluster", forceCalculations.cluster],
        ["repulsion", forceCalculations.repulsion],
        ["attraction", forceCalculations.attraction],
        ["orbit", forceCalculations.orbit],
      ]),
      performanceMetrics: [],
      config: {
        maxForces: 10,
        enablePriority: true,
        defaultStrength: 0.5,
        performance: {
          enableTiming: false,
          logSlowForces: false,
          maxExecutionTime: 10, // 10ms
        },
        ...config,
      },
    };

    logger.debug("graph", "Custom force manager initialized", {
      config: this.state.config,
    });
  }

  /**
   * Register a new custom force
   */
  addForce(force: Omit<CustomForce, "id"> & { id?: string }): string {
    const timestamp = Date.now().toString();
    const random = Math.random().toString(36).substring(2, 9);
    const id = force.id || `force_${timestamp}_${random}`;

    if (this.state.forces.has(id)) {
      throw new Error(`Force with id "${id}" already exists`);
    }

    if (this.state.forces.size >= (this.state.config.maxForces ?? 10)) {
      const maxForces = (this.state.config.maxForces ?? 10).toString();
      throw new Error(`Maximum number of forces (${maxForces}) reached`);
    }

    const customForce: CustomForce = {
      id,
      name: force.name,
      type: force.type,
      enabled: force.enabled ?? true,
      strength: force.strength ?? (this.state.config.defaultStrength ?? 0.5),
      priority: force.priority ?? 0,
      config: force.config,
    };

    this.state.forces.set(id, customForce);

    logger.debug("graph", "Custom force added", {
      id,
      type: customForce.type,
      name: customForce.name,
      enabled: customForce.enabled,
    });

    return id;
  }

  /**
   * Remove a custom force
   */
  removeForce(id: string): boolean {
    const removed = this.state.forces.delete(id);

    if (removed) {
      logger.debug("graph", "Custom force removed", { id });
    } else {
      logger.warn("graph", "Attempted to remove non-existent force", { id });
    }

    return removed;
  }

  /**
   * Update an existing force
   */
  updateForce(id: string, updates: Partial<Omit<CustomForce, "id">>): boolean {
    const force = this.state.forces.get(id);

    if (!force) {
      logger.warn("graph", "Attempted to update non-existent force", { id });
      return false;
    }

    const updatedForce: CustomForce = {
      ...force,
      ...updates,
      id, // Ensure ID cannot be changed
    };

    this.state.forces.set(id, updatedForce);

    logger.debug("graph", "Custom force updated", {
      id,
      updates: Object.keys(updates),
    });

    return true;
  }

  /**
   * Get a specific force
   */
  getForce(id: string): CustomForce | undefined {
    return this.state.forces.get(id);
  }

  /**
   * Get all forces
   */
  getAllForces(): CustomForce[] {
    return Array.from(this.state.forces.values());
  }

  /**
   * Get enabled forces sorted by priority
   */
  getEnabledForces(): CustomForce[] {
    const forces = Array.from(this.state.forces.values()).filter(f => f.enabled);

    if (this.state.config.enablePriority) {
      return forces.sort((a, b) => a.priority - b.priority);
    }

    return forces;
  }

  /**
   * Toggle force enabled state
   */
  toggleForce(id: string): boolean {
    const force = this.state.forces.get(id);

    if (!force) {
      return false;
    }

    force.enabled = !force.enabled;

    logger.debug("graph", "Custom force toggled", {
      id,
      enabled: force.enabled,
    });

    return true;
  }

  /**
   * Clear all forces
   */
  clearAllForces(): void {
    const count = this.state.forces.size;
    this.state.forces.clear();

    logger.debug("graph", "All custom forces cleared", { count });
  }

  /**
   * Apply all enabled forces to nodes
   */
  applyForces(nodes: EnhancedSimulationNode[], alpha: number): void {
    const enabledForces = this.getEnabledForces();

    if (enabledForces.length === 0) {
      return;
    }

    logger.debug("graph", "Applying custom forces", {
      forceCount: enabledForces.length,
      nodeCount: nodes.length,
      alpha: alpha.toFixed(4),
    });

    enabledForces.forEach(force => {
      const calculationFn = this.state.calculationFunctions.get(force.type);

      if (!calculationFn) {
        logger.warn("graph", "No calculation function found for force type", {
          forceId: force.id,
          type: force.type,
        });
        return;
      }

      const startTime = this.state.config.performance?.enableTiming ? performance.now() : 0;

      try {
        calculationFn(nodes, force.config, force.strength, alpha);
      } catch (error) {
        logger.error("graph", "Error applying custom force", {
          forceId: force.id,
          type: force.type,
          error: error instanceof Error ? error.message : "Unknown error",
        });
        return;
      }

      if (this.state.config.performance?.enableTiming) {
        const executionTime = performance.now() - startTime;

        const metrics: ForcePerformanceMetrics = {
          forceId: force.id,
          executionTime,
          nodeCount: nodes.length,
          alpha,
          timestamp: Date.now(),
        };

        this.state.performanceMetrics.push(metrics);

        // Keep only last 100 metrics
        if (this.state.performanceMetrics.length > 100) {
          this.state.performanceMetrics = this.state.performanceMetrics.slice(-100);
        }

        // Log slow forces
        if (
          this.state.config.performance?.logSlowForces &&
          executionTime > (this.state.config.performance?.maxExecutionTime || 10)
        ) {
          logger.warn("graph", "Slow custom force detected", {
            forceId: force.id,
            type: force.type,
            executionTime: `${executionTime.toFixed(2)}ms`,
          });
        }
      }
    });
  }

  /**
   * Register a custom calculation function
   */
  registerCalculationFunction(
    type: CustomForceType,
    calculationFn: ForceCalculationFunction
  ): void {
    this.state.calculationFunctions.set(type, calculationFn);

    logger.debug("graph", "Custom calculation function registered", { type });
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics(): ForcePerformanceMetrics[] {
    return [...this.state.performanceMetrics];
  }

  /**
   * Clear performance metrics
   */
  clearPerformanceMetrics(): void {
    this.state.performanceMetrics = [];
  }

  /**
   * Load a preset configuration
   */
  loadPreset(preset: ForcePreset): void {
    this.clearAllForces();

    preset.forces.forEach(force => {
      this.addForce(force);
    });

    logger.debug("graph", "Force preset loaded", {
      presetId: preset.id,
      name: preset.name,
      forceCount: preset.forces.length,
    });
  }

  /**
   * Export current configuration as preset
   */
  exportAsPreset(id: string, name: string, description: string): ForcePreset {
    const forces = this.getAllForces().map(force => ({
      name: force.name,
      type: force.type,
      enabled: force.enabled,
      strength: force.strength,
      priority: force.priority,
      config: force.config,
    }));

    return {
      id,
      name,
      description,
      forces,
    };
  }

  /**
   * Get built-in presets
   */
  getBuiltInPresets(): Record<string, ForcePreset> {
    return { ...BUILT_IN_PRESETS };
  }

  /**
   * Update manager configuration
   */
  updateConfig(config: Partial<CustomForceManagerConfig>): void {
    this.state.config = {
      ...this.state.config,
      ...config,
    };

    logger.debug("graph", "Force manager configuration updated", { config });
  }

  /**
   * Get current configuration
   */
  getConfig(): CustomForceManagerConfig {
    return { ...this.state.config };
  }

  /**
   * Get summary statistics
   */
  getStats() {
    const forces = this.getAllForces();
    const enabledCount = forces.filter(f => f.enabled).length;
    const typeDistribution = forces.reduce<Record<string, number>>((acc, force) => {
      acc[force.type] = (acc[force.type] || 0) + 1;
      return acc;
    }, {});

    return {
      totalForces: forces.length,
      enabledForces: enabledCount,
      disabledForces: forces.length - enabledCount,
      typeDistribution,
      availableTypes: Array.from(this.state.calculationFunctions.keys()),
      performanceMetricsCount: this.state.performanceMetrics.length,
    };
  }
}

/**
 * Global custom force manager instance
 */
export const customForceManager = new CustomForceManager();

/**
 * Convenience functions for common operations
 */
export const customForces = {
  /**
   * Add a year vs citation positioning force
   */
  addYearCitationForce: (strength = 0.8) => {
    const yearForceId = customForceManager.addForce({
      name: "Publication Year (X-axis)",
      type: "property-x",
      enabled: true,
      strength,
      priority: 10,
      config: {
        type: "property-x",
        propertyName: "publication_year",
        minValue: -400,
        maxValue: 400,
        scaleType: "linear",
      },
    });

    const citationForceId = customForceManager.addForce({
      name: "Citation Count (Y-axis)",
      type: "property-y",
      enabled: true,
      strength,
      priority: 11,
      config: {
        type: "property-y",
        propertyName: "cited_by_count",
        minValue: -300,
        maxValue: 300,
        scaleType: "log",
      },
    });

    return { yearForceId, citationForceId };
  },

  /**
   * Add a radial positioning force
   */
  addRadialForce: (radius = 200, strength = 0.6) => {
    return customForceManager.addForce({
      name: "Radial Layout",
      type: "radial",
      enabled: true,
      strength,
      priority: 5,
      config: {
        type: "radial",
        radius,
        centerX: 0,
        centerY: 0,
        evenDistribution: true,
      },
    });
  },

  /**
   * Add institution clustering force
   */
  addInstitutionClusterForce: (spacing = 150, strength = 0.7) => {
    return customForceManager.addForce({
      name: "Institution Clusters",
      type: "cluster",
      enabled: true,
      strength,
      priority: 8,
      config: {
        type: "cluster",
        propertyName: "institution_id",
        spacing,
        arrangement: "circular",
      },
    });
  },
};