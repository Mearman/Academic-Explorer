/**
 * Custom Force Calculation Functions
 * Implements the actual force calculations for each custom force type
 */

 
 

import type {
  EnhancedSimulationNode,
  CustomForceConfig,
  ForceCalculationFunction,
  RadialForceConfig,
  PropertyForceConfig,
  PropertyBothForceConfig,
  ClusterForceConfig,
  RepulsionForceConfig,
  AttractionForceConfig,
  OrbitForceConfig,
} from "./types";

/**
 * Utility function to get numeric property value from node
 */
function getNodePropertyValue(node: EnhancedSimulationNode, propertyName: string): number {
  const value = node[propertyName];

  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "string") {
    const parsed = parseFloat(value);
    return isNaN(parsed) ? 0 : parsed;
  }

  return 0;
}

/**
 * Utility function to get string property value from node
 */
function getNodeStringProperty(node: EnhancedSimulationNode, propertyName: string): string {
  const value = node[propertyName];
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "number") {
    return String(value);
  }
  return "";
}

/**
 * Creates scaling function based on scale type
 */
function createScaleFunction(
  scaleType: "linear" | "log" | "sqrt" | "pow",
  exponent = 2,
  reverse = false
): (value: number) => number {
  let scaleFn: (value: number) => number;

  switch (scaleType) {
    case "log":
      scaleFn = (value: number) => Math.log(Math.max(value, 1));
      break;
    case "sqrt":
      scaleFn = (value: number) => Math.sqrt(Math.max(value, 0));
      break;
    case "pow":
      scaleFn = (value: number) => Math.pow(Math.max(value, 0), exponent);
      break;
    case "linear":
    default:
      scaleFn = (value: number) => value;
      break;
  }

  return reverse ? (value: number) => -scaleFn(value) : scaleFn;
}

/**
 * Normalizes a value from one range to another
 */
function normalizeValue(
  value: number,
  fromMin: number,
  fromMax: number,
  toMin: number,
  toMax: number
): number {
  if (fromMax === fromMin) return toMin;

  const normalized = (value - fromMin) / (fromMax - fromMin);
  return toMin + normalized * (toMax - toMin);
}

/**
 * Radial force calculation
 * Positions nodes in circular patterns
 */
export const calculateRadialForce: ForceCalculationFunction = (
  nodes: EnhancedSimulationNode[],
  config: CustomForceConfig,
  strength: number,
  alpha: number
): boolean => {
  const radialConfig = config as RadialForceConfig;
  const {
    centerX = 0,
    centerY = 0,
    radius,
    innerRadius = 0,
    evenDistribution = false,
    startAngle = 0,
  } = radialConfig;

  nodes.forEach((node, index) => {
    if (node.fx !== undefined || node.fy !== undefined) return; // Skip pinned nodes

    let targetRadius = radius;

    // For annular layout, interpolate between inner and outer radius
    if (innerRadius > 0) {
      const ratio = nodes.length > 1 ? index / (nodes.length - 1) : 0;
      targetRadius = innerRadius + (radius - innerRadius) * ratio;
    }

    let targetAngle: number;

    if (evenDistribution) {
      // Distribute nodes evenly around the circle
      targetAngle = startAngle + (index / nodes.length) * 2 * Math.PI;
    } else {
      // Use current position to determine angle
      const currentX = (node.x || 0) - centerX;
      const currentY = (node.y || 0) - centerY;
      targetAngle = Math.atan2(currentY, currentX);
    }

    const targetNodeX = centerX + Math.cos(targetAngle) * targetRadius;
    const targetNodeY = centerY + Math.sin(targetAngle) * targetRadius;

    // Apply force toward target position
    const dx = targetNodeX - (node.x || 0);
    const dy = targetNodeY - (node.y || 0);

    node.vx = (node.vx || 0) + dx * strength * alpha;
    node.vy = (node.vy || 0) + dy * strength * alpha;
  });

  return true;
};

/**
 * Property-based positioning force (single axis)
 */
export const calculatePropertyForce: ForceCalculationFunction = (
  nodes: EnhancedSimulationNode[],
  config: CustomForceConfig,
  strength: number,
  alpha: number
): boolean => {
  const propertyConfig = config as PropertyForceConfig;
  const {
    type,
    propertyName,
    minValue,
    maxValue,
    propertyRange,
    scaleType = "linear",
    scaleExponent = 2,
    reverse = false,
  } = propertyConfig;

  // Determine property value range if not provided
  let propMin: number, propMax: number;

  if (propertyRange) {
    [propMin, propMax] = propertyRange;
  } else {
    const values = nodes.map(node => getNodePropertyValue(node, propertyName));
    propMin = Math.min(...values);
    propMax = Math.max(...values);
  }

  const scaleFunction = createScaleFunction(scaleType, scaleExponent, reverse);
  const isXAxis = type === "property-x";

  nodes.forEach((node) => {
    if ((isXAxis && node.fx !== undefined) || (!isXAxis && node.fy !== undefined)) {
      return; // Skip pinned nodes
    }

    const rawValue = getNodePropertyValue(node, propertyName);
    const scaledValue = scaleFunction(rawValue);

    // Normalize to target coordinate range
    const scaledMin = scaleFunction(propMin);
    const scaledMax = scaleFunction(propMax);
    const targetCoord = normalizeValue(scaledValue, scaledMin, scaledMax, minValue, maxValue);

    if (isXAxis) {
      const dx = targetCoord - (node.x || 0);
      node.vx = (node.vx || 0) + dx * strength * alpha;
    } else {
      const dy = targetCoord - (node.y || 0);
      node.vy = (node.vy || 0) + dy * strength * alpha;
    }
  });

  return true;
};

/**
 * Property-based positioning force (both axes)
 */
export const calculatePropertyBothForce: ForceCalculationFunction = (
  nodes: EnhancedSimulationNode[],
  config: CustomForceConfig,
  strength: number,
  alpha: number
): boolean => {
  const bothConfig = config as PropertyBothForceConfig;

  // Apply X-axis force
  calculatePropertyForce(nodes, {
    type: "property-x",
    ...bothConfig.xProperty,
  }, strength, alpha);

  // Apply Y-axis force
  calculatePropertyForce(nodes, {
    type: "property-y",
    ...bothConfig.yProperty,
  }, strength, alpha);

  return true;
};

/**
 * Cluster force calculation
 * Groups nodes by categorical property
 */
export const calculateClusterForce: ForceCalculationFunction = (
  nodes: EnhancedSimulationNode[],
  config: CustomForceConfig,
  strength: number,
  alpha: number
): boolean => {
  const clusterConfig = config as ClusterForceConfig;
  const { propertyName, spacing, arrangement, gridDimensions } = clusterConfig;

  // Group nodes by property value
  const clusters = new Map<string, EnhancedSimulationNode[]>();

  nodes.forEach(node => {
    const clusterKey = getNodeStringProperty(node, propertyName);
    if (!clusters.has(clusterKey)) {
      clusters.set(clusterKey, []);
    }
    clusters.get(clusterKey)?.push(node);
  });

  const clusterKeys = Array.from(clusters.keys());
  const clusterCount = clusterKeys.length;

  // Calculate cluster center positions
  const clusterCenters = new Map<string, { x: number; y: number }>();

  clusterKeys.forEach((key, index) => {
    let centerX: number, centerY: number;

    switch (arrangement) {
      case "grid": {
        const cols = gridDimensions?.[0] || Math.ceil(Math.sqrt(clusterCount));
        const rows = gridDimensions?.[1] || Math.ceil(clusterCount / cols);
        const col = index % cols;
        const row = Math.floor(index / cols);
        centerX = (col - (cols - 1) / 2) * spacing;
        centerY = (row - (rows - 1) / 2) * spacing;
        break;
      }
      case "circular": {
        const angle = (index / clusterCount) * 2 * Math.PI;
        const radius = (clusterCount * spacing) / (2 * Math.PI);
        centerX = Math.cos(angle) * radius;
        centerY = Math.sin(angle) * radius;
        break;
      }
      case "random":
      default: {
        centerX = (Math.random() - 0.5) * spacing * clusterCount;
        centerY = (Math.random() - 0.5) * spacing * clusterCount;
        break;
      }
    }

    clusterCenters.set(key, { x: centerX, y: centerY });
  });

  // Apply forces to move nodes toward their cluster centers
  clusters.forEach((clusterNodes, clusterKey) => {
    const center = clusterCenters.get(clusterKey);
    if (!center) return;

    clusterNodes.forEach(node => {
      if (node.fx !== undefined || node.fy !== undefined) return; // Skip pinned nodes

      const dx = center.x - (node.x || 0);
      const dy = center.y - (node.y || 0);

      node.vx = (node.vx || 0) + dx * strength * alpha;
      node.vy = (node.vy || 0) + dy * strength * alpha;
    });
  });

  return true;
};

/**
 * Custom repulsion force calculation
 */
export const calculateRepulsionForce: ForceCalculationFunction = (
  nodes: EnhancedSimulationNode[],
  config: CustomForceConfig,
  strength: number,
  alpha: number
): boolean => {
  const repulsionConfig = config as RepulsionForceConfig;
  const { maxDistance, minDistance, falloff, nodeSelector } = repulsionConfig;

  // Filter nodes if selector is provided
  const sourceNodes = nodeSelector ? nodes.filter(nodeSelector) : nodes;

  sourceNodes.forEach(source => {
    if (source.fx !== undefined || source.fy !== undefined) return; // Skip pinned nodes

    nodes.forEach(target => {
      if (source === target) return;

      const dx = (source.x || 0) - (target.x || 0);
      const dy = (source.y || 0) - (target.y || 0);
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance > maxDistance || distance < minDistance) return;

      let forceStrength: number;

      switch (falloff) {
        case "linear":
          forceStrength = 1 - (distance / maxDistance);
          break;
        case "quadratic":
          forceStrength = Math.pow(1 - (distance / maxDistance), 2);
          break;
        case "exponential":
          forceStrength = Math.exp(-distance / (maxDistance / 3));
          break;
        default:
          forceStrength = 1;
      }

      const force = (forceStrength * strength * alpha) / Math.max(distance, minDistance);
      const fx = (dx / distance) * force;
      const fy = (dy / distance) * force;

      source.vx = (source.vx || 0) + fx;
      source.vy = (source.vy || 0) + fy;
    });
  });

  return true;
};

/**
 * Custom attraction force calculation
 */
export const calculateAttractionForce: ForceCalculationFunction = (
  nodes: EnhancedSimulationNode[],
  config: CustomForceConfig,
  strength: number,
  alpha: number
): boolean => {
  const attractionConfig = config as AttractionForceConfig;
  const { attractorSelector, maxDistance, falloff } = attractionConfig;

  const attractors = nodes.filter(attractorSelector);
  const targets = nodes.filter(node => !attractorSelector(node));

  targets.forEach(target => {
    if (target.fx !== undefined || target.fy !== undefined) return; // Skip pinned nodes

    attractors.forEach(attractor => {
      const dx = (attractor.x || 0) - (target.x || 0);
      const dy = (attractor.y || 0) - (target.y || 0);
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance > maxDistance) return;

      let forceStrength: number;

      switch (falloff) {
        case "linear":
          forceStrength = 1 - (distance / maxDistance);
          break;
        case "quadratic":
          forceStrength = Math.pow(1 - (distance / maxDistance), 2);
          break;
        case "exponential":
          forceStrength = Math.exp(-distance / (maxDistance / 3));
          break;
        default:
          forceStrength = 1;
      }

      const force = forceStrength * strength * alpha;
      const fx = (dx / distance) * force;
      const fy = (dy / distance) * force;

      target.vx = (target.vx || 0) + fx;
      target.vy = (target.vy || 0) + fy;
    });
  });

  return true;
};

/**
 * Orbital force calculation
 */
export const calculateOrbitForce: ForceCalculationFunction = (
  nodes: EnhancedSimulationNode[],
  config: CustomForceConfig,
  strength: number,
  alpha: number
): boolean => {
  const orbitConfig = config as OrbitForceConfig;
  const { centerSelector, radius, speed, direction } = orbitConfig;

  const centers = nodes.filter(centerSelector);
  const orbiters = nodes.filter(node => !centerSelector(node));

  orbiters.forEach(orbiter => {
    if (orbiter.fx !== undefined || orbiter.fy !== undefined) return; // Skip pinned nodes

    // Find nearest center
    let nearestCenter: EnhancedSimulationNode | null = null;
    let nearestDistance = Infinity;

    centers.forEach(center => {
      const dx = (center.x || 0) - (orbiter.x || 0);
      const dy = (center.y || 0) - (orbiter.y || 0);
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestCenter = center;
      }
    });

    if (!nearestCenter) return;

    const centerX: number = (nearestCenter.x ?? 0) as number;
    const centerY: number = (nearestCenter.y ?? 0) as number;
    const orbiterX = typeof orbiter.x === "number" ? orbiter.x : 0;
    const orbiterY = typeof orbiter.y === "number" ? orbiter.y : 0;

    // Calculate current angle
    const currentAngle = Math.atan2(orbiterY - centerY, orbiterX - centerX);

    // Calculate new angle based on orbital speed
    const angleDirection = direction === "clockwise" ? -1 : 1;
    const newAngle = currentAngle + (speed * angleDirection * alpha);

    // Calculate target position
    const targetX = centerX + (Math.cos(newAngle) * radius);
    const targetY = centerY + (Math.sin(newAngle) * radius);

    // Apply force toward target orbital position
    const dx = targetX - orbiterX;
    const dy = targetY - orbiterY;

    orbiter.vx = (orbiter.vx || 0) + dx * strength * alpha;
    orbiter.vy = (orbiter.vy || 0) + dy * strength * alpha;
  });

  return true;
};

/**
 * Registry of all force calculation functions
 */
export const forceCalculations = {
  radial: calculateRadialForce,
  "property-x": calculatePropertyForce,
  "property-y": calculatePropertyForce,
  "property-both": calculatePropertyBothForce,
  cluster: calculateClusterForce,
  repulsion: calculateRepulsionForce,
  attraction: calculateAttractionForce,
  orbit: calculateOrbitForce,
} as const;