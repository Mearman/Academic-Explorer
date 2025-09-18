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
  ClusterForceConfig,
  RepulsionForceConfig,
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
  // Type guard for RadialForceConfig
  if (!('radius' in config)) {
    return false;
  }
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
      const nodeX = typeof node.x === "number" ? node.x : 0;
      const nodeY = typeof node.y === "number" ? node.y : 0;
      const currentX = nodeX - centerX;
      const currentY = nodeY - centerY;
      targetAngle = Math.atan2(currentY, currentX);
    }

    const targetNodeX = centerX + Math.cos(targetAngle) * targetRadius;
    const targetNodeY = centerY + Math.sin(targetAngle) * targetRadius;

    // Apply force toward target position
    const dx = targetNodeX - nodeX;
    const dy = targetNodeY - nodeY;

    const currentVx = typeof node.vx === "number" ? node.vx : 0;
    const currentVy = typeof node.vy === "number" ? node.vy : 0;
    node.vx = currentVx + dx * strength * alpha;
    node.vy = currentVy + dy * strength * alpha;
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
  // Type guard for PropertyForceConfig
  if (!('propertyName' in config && 'type' in config)) {
    return false;
  }
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
      const nodeX = typeof node.x === "number" ? node.x : 0;
      const dx = targetCoord - nodeX;
      const currentVx = typeof node.vx === "number" ? node.vx : 0;
      node.vx = currentVx + dx * strength * alpha;
    } else {
      const nodeY = typeof node.y === "number" ? node.y : 0;
      const dy = targetCoord - nodeY;
      const currentVy = typeof node.vy === "number" ? node.vy : 0;
      node.vy = currentVy + dy * strength * alpha;
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
  // Type guard for PropertyBothForceConfig
  if (!('xProperty' in config && 'yProperty' in config)) {
    return false;
  }
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
  // Type guard for ClusterForceConfig
  if (!('propertyName' in config && 'clusters' in config)) {
    return false;
  }
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

      const nodeX = typeof node.x === "number" ? node.x : 0;
      const nodeY = typeof node.y === "number" ? node.y : 0;
      const dx = center.x - nodeX;
      const dy = center.y - nodeY;

      const currentVx = typeof node.vx === "number" ? node.vx : 0;
      const currentVy = typeof node.vy === "number" ? node.vy : 0;
      node.vx = currentVx + dx * strength * alpha;
      node.vy = currentVy + dy * strength * alpha;
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
  // Type guard for RepulsionForceConfig
  if (!('maxDistance' in config)) {
    return false;
  }
  const repulsionConfig = config as RepulsionForceConfig;
  const { maxDistance, minDistance, falloff, nodeSelector } = repulsionConfig;

  // Filter nodes if selector is provided
  const sourceNodes = nodeSelector ? nodes.filter(nodeSelector) : nodes;

  sourceNodes.forEach(source => {
    if (source.fx !== undefined || source.fy !== undefined) return; // Skip pinned nodes

    nodes.forEach(target => {
      if (source === target) return;

      const sourceX = typeof source.x === "number" ? source.x : 0;
      const sourceY = typeof source.y === "number" ? source.y : 0;
      const targetX = typeof target.x === "number" ? target.x : 0;
      const targetY = typeof target.y === "number" ? target.y : 0;
      const dx = sourceX - targetX;
      const dy = sourceY - targetY;
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

      const currentVx = typeof source.vx === "number" ? source.vx : 0;
      const currentVy = typeof source.vy === "number" ? source.vy : 0;
      source.vx = currentVx + fx;
      source.vy = currentVy + fy;
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
  // Type guard for AttractionForceConfig
  if (!('attractorSelector' in config)) {
    return false;
  }
  const attractionConfig = config as AttractionForceConfig;
  const { attractorSelector, maxDistance, falloff } = attractionConfig;

  const attractors = nodes.filter(attractorSelector);
  const targets = nodes.filter(node => !attractorSelector(node));

  targets.forEach(target => {
    if (target.fx !== undefined || target.fy !== undefined) return; // Skip pinned nodes

    attractors.forEach(attractor => {
      const attractorX = typeof attractor.x === "number" ? attractor.x : 0;
      const attractorY = typeof attractor.y === "number" ? attractor.y : 0;
      const targetX = typeof target.x === "number" ? target.x : 0;
      const targetY = typeof target.y === "number" ? target.y : 0;
      const dx = attractorX - targetX;
      const dy = attractorY - targetY;
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

      const currentVx = typeof target.vx === "number" ? target.vx : 0;
      const currentVy = typeof target.vy === "number" ? target.vy : 0;
      target.vx = currentVx + fx;
      target.vy = currentVy + fy;
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
  // Type guard for OrbitForceConfig
  if (!('centerSelector' in config && 'radius' in config && 'speed' in config && 'direction' in config)) {
    return false;
  }
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
      const centerX = typeof center.x === "number" ? center.x : 0;
      const centerY = typeof center.y === "number" ? center.y : 0;
      const orbiterX = typeof orbiter.x === "number" ? orbiter.x : 0;
      const orbiterY = typeof orbiter.y === "number" ? orbiter.y : 0;
      const dx = centerX - orbiterX;
      const dy = centerY - orbiterY;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestCenter = center;
      }
    });

    if (!nearestCenter) return;

    const finalCenterX = typeof nearestCenter.x === "number" ? nearestCenter.x : 0;
    const finalCenterY = typeof nearestCenter.y === "number" ? nearestCenter.y : 0;
    const finalOrbiterX = typeof orbiter.x === "number" ? orbiter.x : 0;
    const finalOrbiterY = typeof orbiter.y === "number" ? orbiter.y : 0;

    // Calculate current angle
    const currentAngle = Math.atan2(finalOrbiterY - finalCenterY, finalOrbiterX - finalCenterX);

    // Calculate new angle based on orbital speed
    const angleDirection = direction === "clockwise" ? -1 : 1;
    const newAngle = currentAngle + (speed * angleDirection * alpha);

    // Calculate target position
    const targetX = finalCenterX + (Math.cos(newAngle) * radius);
    const targetY = finalCenterY + (Math.sin(newAngle) * radius);

    // Apply force toward target orbital position
    const dx = targetX - finalOrbiterX;
    const dy = targetY - finalOrbiterY;

    const currentVx = typeof orbiter.vx === "number" ? orbiter.vx : 0;
    const currentVy = typeof orbiter.vy === "number" ? orbiter.vy : 0;
    orbiter.vx = currentVx + dx * strength * alpha;
    orbiter.vy = currentVy + dy * strength * alpha;
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