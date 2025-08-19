/**
 * Data Processing Utilities for Advanced Visualizations
 * 
 * Comprehensive data transformation, aggregation, and statistical functions
 * for academic data visualization components.
 */

import type { Work } from '@/lib/openalex/types';

import type {
  TimelineDataPoint,
  NetworkNode,
  NetworkEdge,
  HeatmapDataPoint,
  SankeyNode,
  SankeyLink
} from '../types';

// ============================================================================
// Type Definitions
// ============================================================================

export interface StatisticalSummary {
  count: number;
  sum: number;
  mean: number;
  median: number;
  mode: number[];
  min: number;
  max: number;
  range: number;
  variance: number;
  stdDev: number;
  q1: number;
  q3: number;
  iqr: number;
  skewness: number;
  kurtosis: number;
}

export interface OutlierDetectionResult {
  outliers: number[];
  cleanData: number[];
  indices: number[];
  method: 'iqr' | 'zscore' | 'modified_zscore';
  threshold?: number;
}

export interface TrendAnalysis {
  direction: 'increasing' | 'decreasing' | 'stable';
  slope: number;
  correlation: number;
  rSquared: number;
  pValue?: number;
  significance: 'high' | 'medium' | 'low' | 'none';
}

export type AggregationFunction = 'sum' | 'average' | 'max' | 'min' | 'count';
export type TimelineMetric = 'publication_count' | 'citation_count' | 'collaboration_count';
export type HeatmapDimension = 'institution' | 'author' | 'concept' | 'topic' | 'country' | 'year';
export type HeatmapMetric = 'publication_count' | 'citation_count' | 'collaboration_count' | 'h_index';
export type SankeyFlow = 'institution' | 'concept' | 'topic' | 'author' | 'country';

// ============================================================================
// Timeline Data Processing
// ============================================================================

/**
 * Transform works data into timeline data points
 */
export function transformWorksToTimeline(
  works: Work[],
  metric: TimelineMetric
): TimelineDataPoint[] {
  if (!works || works.length === 0) return [];

  // Group by year, filtering out null publication years
  const yearGroups = new Map<number, Work[]>();
  
  works.forEach(work => {
    if (work.publication_year) {
      const year = work.publication_year;
      if (!yearGroups.has(year)) {
        yearGroups.set(year, []);
      }
      yearGroups.get(year)!.push(work);
    }
  });

  // Convert to timeline data points
  const timelineData: TimelineDataPoint[] = [];
  
  yearGroups.forEach((yearWorks, year) => {
    let value: number;
    
    switch (metric) {
      case 'publication_count':
        value = yearWorks.length;
        break;
      case 'citation_count':
        value = yearWorks.reduce((sum, work) => sum + work.cited_by_count, 0);
        break;
      case 'collaboration_count':
        value = yearWorks.reduce((sum, work) => {
          return sum + (work.authorships?.length || 0);
        }, 0);
        break;
      default:
        value = yearWorks.length;
    }
    
    timelineData.push({
      date: new Date(year, 0, 1), // January 1st of the year
      value,
      label: year.toString(),
      metadata: {
        works: yearWorks,
        year
      }
    });
  });

  // Sort by date
  return timelineData.sort((a, b) => a.date.getTime() - b.date.getTime());
}

/**
 * Aggregate timeline data by year using specified function
 */
export function aggregateByYear(
  data: TimelineDataPoint[],
  aggregationFn: AggregationFunction
): TimelineDataPoint[] {
  if (!data || data.length === 0) return [];

  const yearGroups = new Map<number, TimelineDataPoint[]>();
  
  data.forEach(point => {
    const year = point.date.getFullYear();
    if (!yearGroups.has(year)) {
      yearGroups.set(year, []);
    }
    yearGroups.get(year)!.push(point);
  });

  const aggregatedData: TimelineDataPoint[] = [];
  
  yearGroups.forEach((points, year) => {
    let value: number;
    
    switch (aggregationFn) {
      case 'sum':
        value = points.reduce((sum, p) => sum + p.value, 0);
        break;
      case 'average':
        value = points.reduce((sum, p) => sum + p.value, 0) / points.length;
        break;
      case 'max':
        value = Math.max(...points.map(p => p.value));
        break;
      case 'min':
        value = Math.min(...points.map(p => p.value));
        break;
      case 'count':
        value = points.length;
        break;
      default:
        value = points.reduce((sum, p) => sum + p.value, 0);
    }
    
    aggregatedData.push({
      date: new Date(year, 0, 1),
      value,
      label: year.toString(),
      metadata: {
        originalPoints: points,
        aggregationFunction: aggregationFn
      }
    });
  });

  return aggregatedData.sort((a, b) => a.date.getTime() - b.date.getTime());
}

// ============================================================================
// Network Data Processing
// ============================================================================

/**
 * Calculate collaboration network from works data
 */
export function calculateCollaborationNetwork(works: Work[]): {
  nodes: NetworkNode[];
  edges: NetworkEdge[];
} {
  if (!works || works.length === 0) {
    return { nodes: [], edges: [] };
  }

  const authorMap = new Map<string, {
    id: string;
    label: string;
    worksCount: number;
    citationsCount: number;
    collaborators: Set<string>;
  }>();
  
  const collaborationCounts = new Map<string, number>();

  // Process each work to build author map and collaboration counts
  works.forEach(work => {
    if (!work.authorships || work.authorships.length === 0) return;
    
    const workAuthors = work.authorships.map(authorship => authorship.author);
    
    // Update author information
    workAuthors.forEach(author => {
      if (!authorMap.has(author.id)) {
        authorMap.set(author.id, {
          id: author.id,
          label: author.display_name,
          worksCount: 0,
          citationsCount: 0,
          collaborators: new Set()
        });
      }
      
      const authorData = authorMap.get(author.id)!;
      authorData.worksCount += 1;
      authorData.citationsCount += work.cited_by_count;
      
      // Add collaborators
      workAuthors.forEach(collaborator => {
        if (collaborator.id !== author.id) {
          authorData.collaborators.add(collaborator.id);
        }
      });
    });
    
    // Count collaborations between authors
    for (let i = 0; i < workAuthors.length; i++) {
      for (let j = i + 1; j < workAuthors.length; j++) {
        const id1 = workAuthors[i].id;
        const id2 = workAuthors[j].id;
        const edgeId = [id1, id2].sort().join('-');
        
        collaborationCounts.set(edgeId, (collaborationCounts.get(edgeId) || 0) + 1);
      }
    }
  });

  // Create nodes
  const maxWorks = Math.max(...Array.from(authorMap.values()).map(a => a.worksCount));
  const minSize = 5;
  const maxSize = 30;
  
  const nodes: NetworkNode[] = Array.from(authorMap.values()).map(author => ({
    id: author.id,
    label: author.label,
    type: 'author',
    size: minSize + ((author.worksCount / maxWorks) * (maxSize - minSize)),
    metadata: {
      worksCount: author.worksCount,
      citationsCount: author.citationsCount,
      collaboratorCount: author.collaborators.size
    }
  }));

  // Create edges
  const edges: NetworkEdge[] = [];
  collaborationCounts.forEach((count, edgeId) => {
    const [sourceId, targetId] = edgeId.split('-');
    edges.push({
      id: edgeId,
      source: sourceId,
      target: targetId,
      weight: count,
      type: 'collaboration',
      metadata: {
        collaborationCount: count
      }
    });
  });

  return { nodes, edges };
}

/**
 * Apply clustering algorithm to network data
 */
export function applyNetworkClustering(
  nodes: NetworkNode[],
  edges: NetworkEdge[],
  _algorithm: 'modularity' | 'louvain' = 'modularity'
): NetworkNode[] {
  // Basic modularity-based clustering implementation
  // For production, consider using dedicated graph libraries like igraph-js
  
  const adjacencyList = new Map<string, Set<string>>();
  
  // Build adjacency list
  nodes.forEach(node => {
    adjacencyList.set(node.id, new Set());
  });
  
  edges.forEach(edge => {
    adjacencyList.get(edge.source)?.add(edge.target);
    adjacencyList.get(edge.target)?.add(edge.source);
  });
  
  // Simple clustering: connected components
  const visited = new Set<string>();
  const clusters: string[][] = [];
  
  const dfs = (nodeId: string, cluster: string[]) => {
    if (visited.has(nodeId)) return;
    visited.add(nodeId);
    cluster.push(nodeId);
    
    adjacencyList.get(nodeId)?.forEach(neighborId => {
      if (!visited.has(neighborId)) {
        dfs(neighborId, cluster);
      }
    });
  };
  
  nodes.forEach(node => {
    if (!visited.has(node.id)) {
      const cluster: string[] = [];
      dfs(node.id, cluster);
      if (cluster.length > 0) {
        clusters.push(cluster);
      }
    }
  });
  
  // Assign cluster IDs to nodes
  const clusteredNodes = nodes.map(node => {
    const clusterIndex = clusters.findIndex(cluster => cluster.includes(node.id));
    return {
      ...node,
      metadata: {
        ...node.metadata,
        clusterId: clusterIndex,
        clusterSize: clusters[clusterIndex]?.length || 1
      }
    };
  });
  
  return clusteredNodes;
}

// ============================================================================
// Heatmap Data Processing
// ============================================================================

/**
 * Generate heatmap data from works
 */
export function generateHeatmapData(
  works: Work[],
  xDimension: HeatmapDimension,
  yDimension: HeatmapDimension,
  metric: HeatmapMetric
): HeatmapDataPoint[] {
  if (!works || works.length === 0) return [];

  const dataMap = new Map<string, {
    x: string | number;
    y: string | number;
    works: Work[];
    value: number;
  }>();

  works.forEach(work => {
    const xValues = extractDimensionValues(work, xDimension);
    const yValues = extractDimensionValues(work, yDimension);
    
    // Create combinations of x and y values
    xValues.forEach(xValue => {
      yValues.forEach(yValue => {
        const key = `${xValue}-${yValue}`;
        
        if (!dataMap.has(key)) {
          dataMap.set(key, {
            x: xValue,
            y: yValue,
            works: [],
            value: 0
          });
        }
        
        dataMap.get(key)!.works.push(work);
      });
    });
  });

  // Calculate metric values
  const heatmapData: HeatmapDataPoint[] = [];
  
  dataMap.forEach(({ x, y, works }) => {
    let value: number;
    
    switch (metric) {
      case 'publication_count':
        value = works.length;
        break;
      case 'citation_count':
        value = works.reduce((sum, work) => sum + work.cited_by_count, 0);
        break;
      case 'collaboration_count':
        value = works.reduce((sum, work) => sum + (work.authorships?.length || 0), 0);
        break;
      case 'h_index':
        // Simplified h-index calculation for this context
        const citations = works.map(w => w.cited_by_count).sort((a, b) => b - a);
        value = calculateHIndex(citations);
        break;
      default:
        value = works.length;
    }
    
    heatmapData.push({
      x,
      y,
      value,
      metadata: {
        works,
        metric,
        xDimension,
        yDimension
      }
    });
  });

  return heatmapData;
}

/**
 * Extract dimension values from a work
 */
function extractDimensionValues(work: Work, dimension: HeatmapDimension): (string | number)[] {
  switch (dimension) {
    case 'year':
      return work.publication_year ? [work.publication_year] : [];
    case 'institution':
      return work.authorships?.flatMap(auth => 
        auth.institutions.map(inst => inst.display_name)
      ) || [];
    case 'author':
      return work.authorships?.map(auth => auth.author.display_name) || [];
    case 'concept':
      return work.concepts?.map(concept => concept.display_name) || [];
    case 'topic':
      return work.topics?.map(topic => topic.display_name) || [];
    case 'country':
      return work.authorships?.flatMap(auth => 
        auth.institutions.map(inst => inst.country_code).filter((code): code is string => Boolean(code))
      ) || [];
    default:
      return [];
  }
}

/**
 * Calculate H-index from citation counts
 */
function calculateHIndex(citationCounts: number[]): number {
  const sortedCitations = citationCounts.sort((a, b) => b - a);
  let hIndex = 0;
  
  for (let i = 0; i < sortedCitations.length; i++) {
    const citations = sortedCitations[i];
    const position = i + 1;
    
    if (citations >= position) {
      hIndex = position;
    } else {
      break;
    }
  }
  
  return hIndex;
}

// ============================================================================
// Sankey Data Processing
// ============================================================================

/**
 * Prepare Sankey diagram data from works
 */
export function prepareSankeyData(
  works: Work[],
  sourceFlow: SankeyFlow,
  targetFlow: SankeyFlow
): {
  nodes: SankeyNode[];
  links: SankeyLink[];
} {
  if (!works || works.length === 0) {
    return { nodes: [], links: [] };
  }

  const nodeMap = new Map<string, SankeyNode>();
  const linkMap = new Map<string, number>();

  works.forEach(work => {
    const sourceValues = extractFlowValues(work, sourceFlow);
    const targetValues = extractFlowValues(work, targetFlow);
    
    // Create nodes
    sourceValues.forEach(value => {
      const nodeId = `${sourceFlow}-${value}`;
      if (!nodeMap.has(nodeId)) {
        nodeMap.set(nodeId, {
          id: nodeId,
          label: value,
          category: sourceFlow
        });
      }
    });
    
    targetValues.forEach(value => {
      const nodeId = `${targetFlow}-${value}`;
      if (!nodeMap.has(nodeId)) {
        nodeMap.set(nodeId, {
          id: nodeId,
          label: value,
          category: targetFlow
        });
      }
    });
    
    // Create links
    sourceValues.forEach(sourceValue => {
      targetValues.forEach(targetValue => {
        const sourceId = `${sourceFlow}-${sourceValue}`;
        const targetId = `${targetFlow}-${targetValue}`;
        const linkId = `${sourceId}-${targetId}`;
        
        linkMap.set(linkId, (linkMap.get(linkId) || 0) + 1);
      });
    });
  });

  const nodes = Array.from(nodeMap.values());
  const links: SankeyLink[] = [];
  
  linkMap.forEach((value, linkId) => {
    // LinkId format is: "sourceFlow-sourceValue-targetFlow-targetValue"
    // We need to find the boundary between source and target parts
    const parts = linkId.split('-');
    if (parts.length >= 4) {
      // Find the middle point - should be where flow type changes
      let splitIndex = -1;
      for (let i = 1; i < parts.length - 1; i++) {
        const possibleTargetFlow = parts[i];
        if (possibleTargetFlow === targetFlow) {
          splitIndex = i;
          break;
        }
      }
      
      if (splitIndex > 0) {
        const sourceId = parts.slice(0, splitIndex).join('-');
        const targetId = parts.slice(splitIndex).join('-');
        
        links.push({
          id: linkId,
          source: sourceId,
          target: targetId,
          value,
          metadata: {
            sourceFlow,
            targetFlow
          }
        });
      }
    }
  });

  return { nodes, links };
}

/**
 * Extract flow values from a work
 */
function extractFlowValues(work: Work, flow: SankeyFlow): string[] {
  switch (flow) {
    case 'institution':
      return work.authorships?.flatMap(auth => 
        auth.institutions.map(inst => inst.display_name)
      ) || [];
    case 'author':
      return work.authorships?.map(auth => auth.author.display_name) || [];
    case 'concept':
      return work.concepts?.map(concept => concept.display_name) || [];
    case 'topic':
      return work.topics?.map(topic => topic.display_name) || [];
    case 'country':
      return work.authorships?.flatMap(auth => 
        auth.institutions.map(inst => inst.country_code).filter((code): code is string => Boolean(code))
      ) || [];
    default:
      return [];
  }
}

// ============================================================================
// Statistical Analysis Functions
// ============================================================================

/**
 * Calculate comprehensive statistics for a dataset
 */
export function calculateStatistics(data: number[]): StatisticalSummary {
  if (!data || data.length === 0) {
    return {
      count: 0,
      sum: 0,
      mean: NaN,
      median: NaN,
      mode: [],
      min: NaN,
      max: NaN,
      range: NaN,
      variance: NaN,
      stdDev: NaN,
      q1: NaN,
      q3: NaN,
      iqr: NaN,
      skewness: NaN,
      kurtosis: NaN
    };
  }

  const sorted = [...data].sort((a, b) => a - b);
  const n = data.length;
  const sum = data.reduce((acc, val) => acc + val, 0);
  const mean = sum / n;
  
  // Median
  const median = n % 2 === 0 
    ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2
    : sorted[Math.floor(n / 2)];
  
  // Mode
  const frequency = new Map<number, number>();
  data.forEach(val => {
    frequency.set(val, (frequency.get(val) || 0) + 1);
  });
  const maxFreq = Math.max(...frequency.values());
  const mode = Array.from(frequency.entries())
    .filter(([, freq]) => freq === maxFreq)
    .map(([val]) => val);
  
  // Range
  const min = sorted[0];
  const max = sorted[n - 1];
  const range = max - min;
  
  // Variance and Standard Deviation
  const variance = data.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / n;
  const stdDev = Math.sqrt(variance);
  
  // Quartiles (using interpolation method)
  const q1Position = (n - 1) * 0.25;
  const q3Position = (n - 1) * 0.75;
  
  const q1 = q1Position % 1 === 0
    ? sorted[q1Position]
    : sorted[Math.floor(q1Position)] + (sorted[Math.ceil(q1Position)] - sorted[Math.floor(q1Position)]) * (q1Position % 1);
    
  const q3 = q3Position % 1 === 0
    ? sorted[q3Position]
    : sorted[Math.floor(q3Position)] + (sorted[Math.ceil(q3Position)] - sorted[Math.floor(q3Position)]) * (q3Position % 1);
  const iqr = q3 - q1;
  
  // Skewness (simplified)
  const skewness = data.reduce((acc, val) => acc + Math.pow((val - mean) / stdDev, 3), 0) / n;
  
  // Kurtosis (simplified)
  const kurtosis = data.reduce((acc, val) => acc + Math.pow((val - mean) / stdDev, 4), 0) / n - 3;
  
  return {
    count: n,
    sum,
    mean,
    median,
    mode,
    min,
    max,
    range,
    variance,
    stdDev,
    q1,
    q3,
    iqr,
    skewness,
    kurtosis
  };
}

/**
 * Normalize data to 0-1 range
 */
export function normalizeData(data: number[]): number[] {
  if (!data || data.length === 0) return [];
  if (data.length === 1) return [0];
  
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min;
  
  if (range === 0) return data.map(() => 0);
  
  return data.map(val => (val - min) / range);
}

/**
 * Detect outliers in dataset
 */
export function detectOutliers(
  data: number[],
  method: 'iqr' | 'zscore' | 'modified_zscore' = 'iqr',
  threshold: number = 1.5
): OutlierDetectionResult {
  if (!data || data.length === 0) {
    return {
      outliers: [],
      cleanData: [],
      indices: [],
      method,
      threshold
    };
  }

  const outlierIndices = new Set<number>();
  
  if (method === 'iqr') {
    const stats = calculateStatistics(data);
    const lowerBound = stats.q1 - threshold * stats.iqr;
    const upperBound = stats.q3 + threshold * stats.iqr;
    
    data.forEach((val, index) => {
      if (val < lowerBound || val > upperBound) {
        outlierIndices.add(index);
      }
    });
  } else if (method === 'zscore') {
    const stats = calculateStatistics(data);
    
    data.forEach((val, index) => {
      const zScore = Math.abs((val - stats.mean) / stats.stdDev);
      if (zScore > threshold) {
        outlierIndices.add(index);
      }
    });
  } else if (method === 'modified_zscore') {
    const {median} = calculateStatistics(data);
    const mad = calculateStatistics(data.map(val => Math.abs(val - median))).median;
    const modifiedThreshold = 0.6745; // Standard threshold for modified z-score
    
    data.forEach((val, index) => {
      const modifiedZScore = modifiedThreshold * (val - median) / mad;
      if (Math.abs(modifiedZScore) > threshold) {
        outlierIndices.add(index);
      }
    });
  }
  
  const outliers = Array.from(outlierIndices).map(index => data[index]);
  const cleanData = data.filter((_, index) => !outlierIndices.has(index));
  
  return {
    outliers,
    cleanData,
    indices: Array.from(outlierIndices),
    method,
    threshold
  };
}

/**
 * Group data by category using a key function
 */
export function groupByCategory<T>(
  data: T[],
  keyFn: (item: T) => string
): Record<string, T[]> {
  return data.reduce((groups, item) => {
    const key = keyFn(item);
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(item);
    return groups;
  }, {} as Record<string, T[]>);
}

/**
 * Calculate trend analysis for time series data
 */
export function calculateTrends(data: { date: Date; value: number }[]): TrendAnalysis {
  if (!data || data.length < 2) {
    return {
      direction: 'stable',
      slope: 0,
      correlation: 0,
      rSquared: 0,
      significance: 'none'
    };
  }

  // Convert dates to numeric values (days since first date)
  const sortedData = [...data].sort((a, b) => a.date.getTime() - b.date.getTime());
  const firstDate = sortedData[0].date.getTime();
  
  const x = sortedData.map(d => (d.date.getTime() - firstDate) / (1000 * 60 * 60 * 24));
  const y = sortedData.map(d => d.value);
  
  // Calculate linear regression
  const n = x.length;
  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = y.reduce((a, b) => a + b, 0);
  const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
  const sumXX = x.reduce((sum, xi) => sum + xi * xi, 0);
  const sumYY = y.reduce((sum, yi) => sum + yi * yi, 0);
  
  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  const _intercept = (sumY - slope * sumX) / n;
  
  // Calculate correlation coefficient
  const numerator = n * sumXY - sumX * sumY;
  const denominator = Math.sqrt((n * sumXX - sumX * sumX) * (n * sumYY - sumY * sumY));
  const correlation = denominator === 0 ? 0 : numerator / denominator;
  const rSquared = correlation * correlation;
  
  // Determine trend direction
  let direction: 'increasing' | 'decreasing' | 'stable';
  const slopeThreshold = 0.01; // Adjust based on data scale
  
  if (Math.abs(slope) < slopeThreshold) {
    direction = 'stable';
  } else if (slope > 0) {
    direction = 'increasing';
  } else {
    direction = 'decreasing';
  }
  
  // Determine significance
  let significance: 'high' | 'medium' | 'low' | 'none';
  if (Math.abs(correlation) > 0.8) {
    significance = 'high';
  } else if (Math.abs(correlation) > 0.5) {
    significance = 'medium';
  } else if (Math.abs(correlation) > 0.3) {
    significance = 'low';
  } else {
    significance = 'none';
  }
  
  return {
    direction,
    slope,
    correlation,
    rSquared,
    significance
  };
}

// Export additional types for testing
export type {
  TimelineDataPoint,
  NetworkNode,
  NetworkEdge,
  HeatmapDataPoint,
  SankeyNode,
  SankeyLink
};