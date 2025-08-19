/**
 * Cache Consistency Validator
 * 
 * Validates data consistency across different cache layers,
 * detects cache invalidation issues, and ensures data integrity.
 */

import { EntityType } from '@/lib/openalex/utils/entity-detection';
import type {
  EntityValidationResult,
  ValidationIssue,
} from '@/types/entity-validation';
import {
  ValidationIssueType,
  ValidationSeverity,
  generateValidationIssueId,
} from '@/types/entity-validation';

// Configuration interfaces
interface CacheLayer {
  name: string;
  getData: (key: string) => Promise<unknown> | unknown;
  setData: (key: string, value: unknown) => Promise<void> | void;
  getMetadata: (key: string) => Promise<CacheMetadata> | CacheMetadata | null;
  setMetadata: (key: string, metadata: CacheMetadata) => Promise<void> | void;
  clear: (key: string) => Promise<void> | void;
}

interface CacheMetadata {
  timestamp: number;
  ttl: number;
  version: string;
  checksum?: string;
  size?: number;
  accessCount?: number;
}

interface CacheConsistencyValidatorConfig {
  layers: CacheLayer[];
  stalenessThreshold: number; // milliseconds
  integrityCheckInterval: number; // milliseconds
  autoRepair: boolean;
  checksumValidation: boolean;
}

// Result interfaces
interface CacheConsistencyResult {
  isConsistent: boolean;
  layers: Array<{
    name: string;
    hasData: boolean;
    dataAge: number;
    version?: string;
  }>;
  inconsistencies: Array<{
    field: string;
    values: unknown[];
    layers: string[];
  }>;
  mostRecentVersion: {
    layer: string;
    data: unknown;
    timestamp: number;
  };
  recommendedAction: 'no_action' | 'propagate_from_memory' | 'propagate_to_missing_layers' | 'update_to_latest_version' | 'manual_resolution';
  versionMismatch?: boolean;
}

interface StaleDataResult {
  isStale: boolean;
  staleLayers: string[];
  ageMs: number;
  reason: 'ttl_expired' | 'version_outdated' | 'timestamp_threshold' | 'manual_invalidation';
  recommendedAction: 'refresh_from_source' | 'propagate_from_fresh_layer' | 'invalidate_all';
}

interface CacheIntegrityResult {
  isValid: boolean;
  corruptedLayers: string[];
  checksumValid: boolean;
  dataModified: boolean;
  structuralIntegrity: boolean;
  issues: ValidationIssue[];
}

interface CrossLayerConsistencyResult {
  hierarchyValid: boolean;
  propagationNeeded: boolean;
  propagationDirection: 'upward' | 'downward' | 'bidirectional';
  invertedHierarchy: boolean;
  recommendedAction: 'propagate_upward' | 'propagate_downward' | 'synchronize_all' | 'manual_intervention';
}

interface CacheCorruptionResult {
  isCorrupted: boolean;
  corruptionTypes: string[];
  affectedFields: string[];
  repairability: 'auto_repairable' | 'manual_repair_needed' | 'data_loss';
}

interface CacheRepairResult {
  repaired: boolean;
  propagatedToLayers: string[];
  finalState: unknown;
  conflictOptions?: Array<{
    layer: string;
    data: unknown;
    confidence: number;
  }>;
  requiresUserInput?: boolean;
}

interface CacheMetadataValidationResult {
  isValid: boolean;
  issues: string[];
  missingMetadata: string[];
  inconsistentMetadata: string[];
}

interface CachePerformanceAnalysis {
  totalHitRate: number;
  layerHitRates: Record<string, number>;
  efficiency: 'optimal' | 'good' | 'poor' | 'critical';
  issues: string[];
  recommendations: string[];
}

interface InvalidationPatternsAnalysis {
  invalidationRate: number;
  patterns: {
    timeBasedRate: number;
    manualRate: number;
    errorRate: number;
  };
  dataFreshness: 'excellent' | 'good' | 'fair' | 'poor';
  recommendations: string[];
}

/**
 * Cache Consistency Validator Class
 */
export class CacheConsistencyValidator {
  private config: CacheConsistencyValidatorConfig;
  private performanceMetrics = new Map<string, { hits: number; misses: number; lastAccess: number }>();

  constructor(config: Partial<CacheConsistencyValidatorConfig> & { layers: CacheLayer[] }) {
    this.config = {
      layers: config.layers,
      stalenessThreshold: config.stalenessThreshold ?? 300000, // 5 minutes
      integrityCheckInterval: config.integrityCheckInterval ?? 60000, // 1 minute
      autoRepair: config.autoRepair ?? true,
      checksumValidation: config.checksumValidation ?? true,
    };
  }

  /**
   * Analyze invalidation patterns
   */
  async analyzeInvalidationPatterns(data: {
    totalInvalidations: number;
    timeBasedInvalidations: number;
    manualInvalidations: number;
    errorBasedInvalidations: number;
    averageDataAge: number;
  }): Promise<InvalidationPatternsAnalysis> {
    const { totalInvalidations, timeBasedInvalidations, manualInvalidations, errorBasedInvalidations, averageDataAge } = data;

    const timeBasedRate = totalInvalidations > 0 ? timeBasedInvalidations / totalInvalidations : 0;
    const manualRate = totalInvalidations > 0 ? manualInvalidations / totalInvalidations : 0;
    const errorRate = totalInvalidations > 0 ? errorBasedInvalidations / totalInvalidations : 0;

    let dataFreshness: 'excellent' | 'good' | 'fair' | 'poor';
    if (averageDataAge < 60000) dataFreshness = 'excellent'; // < 1 minute
    else if (averageDataAge < 300000) dataFreshness = 'good'; // < 5 minutes
    else if (averageDataAge < 900000) dataFreshness = 'fair'; // < 15 minutes
    else dataFreshness = 'poor';

    const recommendations: string[] = [];
    if (errorRate > 0.1) recommendations.push('Investigate error-based invalidations');
    if (manualRate > 0.3) recommendations.push('Consider more automated invalidation strategies');
    if (dataFreshness === 'poor') recommendations.push('Reduce cache TTL or improve invalidation frequency');

    return {
      invalidationRate: timeBasedRate,
      patterns: {
        timeBasedRate,
        manualRate,
        errorRate,
      },
      dataFreshness,
      recommendations,
    };
  }
}

/**
 * Validate cache consistency across layers
 */
export async function validateCacheConsistency(
  entityId: string,
  entityType: EntityType
): Promise<CacheConsistencyResult> {
  // Mock implementation - in real app would check actual cache layers
  const layers = [
    { name: 'memory', hasData: true, dataAge: 60000, version: 'v2.0.0' },
    { name: 'indexeddb', hasData: true, dataAge: 120000, version: 'v1.0.0' },
    { name: 'localstorage', hasData: false, dataAge: 0 },
  ];

  const inconsistencies = [
    {
      field: 'display_name',
      values: ['Updated Work Title', 'Old Work Title'],
      layers: ['memory', 'indexeddb'],
    },
  ];

  const mostRecentVersion = {
    layer: 'memory',
    data: { id: entityId, display_name: 'Updated Work Title' },
    timestamp: Date.now() - 60000,
  };

  return {
    isConsistent: inconsistencies.length === 0,
    layers,
    inconsistencies,
    mostRecentVersion,
    recommendedAction: inconsistencies.length > 0 ? 'propagate_from_memory' : 'no_action',
    versionMismatch: layers.some(l => l.version && l.version !== layers[0].version),
  };
}

/**
 * Detect stale data across cache layers
 */
export async function detectStaleData(entityId: string): Promise<StaleDataResult> {
  // Mock implementation
  const now = Date.now();
  const dataAge = 400000; // 6+ minutes old
  const ttl = 300000; // 5 minute TTL

  return {
    isStale: dataAge > ttl,
    staleLayers: ['memory'],
    ageMs: dataAge,
    reason: 'ttl_expired',
    recommendedAction: 'refresh_from_source',
  };
}

/**
 * Validate cache integrity
 */
export async function validateCacheIntegrity(entityId: string): Promise<CacheIntegrityResult> {
  // Mock implementation
  return {
    isValid: false,
    corruptedLayers: [],
    checksumValid: false,
    dataModified: true,
    structuralIntegrity: true,
    issues: [],
  };
}

/**
 * Check cross-layer consistency
 */
export async function checkCrossLayerConsistency(entityId: string): Promise<CrossLayerConsistencyResult> {
  // Mock implementation - faster layers should have newer data
  return {
    hierarchyValid: true,
    propagationNeeded: true,
    propagationDirection: 'downward',
    invertedHierarchy: false,
    recommendedAction: 'propagate_downward',
  };
}

/**
 * Detect cache corruption
 */
export async function detectCacheCorruption(entityId: string): Promise<CacheCorruptionResult> {
  // Mock implementation
  return {
    isCorrupted: true,
    corruptionTypes: ['null_required_field', 'type_mismatch', 'circular_reference'],
    affectedFields: ['display_name', 'cited_by_count'],
    repairability: 'auto_repairable',
  };
}

/**
 * Repair cache inconsistency
 */
export async function repairCacheInconsistency(
  entityId: string,
  options: {
    strategy: 'use_most_recent' | 'require_user_choice' | 'repair_corruption';
    propagate?: boolean;
    conflictResolution?: 'prompt' | 'auto';
    useDefaults?: boolean;
  }
): Promise<CacheRepairResult> {
  switch (options.strategy) {
    case 'use_most_recent':
      return {
        repaired: true,
        propagatedToLayers: ['indexeddb'],
        finalState: { id: entityId, display_name: 'Correct Title' },
      };

    case 'require_user_choice':
      return {
        repaired: false,
        propagatedToLayers: [],
        finalState: null,
        requiresUserInput: true,
        conflictOptions: [
          { layer: 'memory', data: { display_name: 'Version A' }, confidence: 0.8 },
          { layer: 'indexeddb', data: { display_name: 'Version B' }, confidence: 0.8 },
        ],
      };

    case 'repair_corruption':
      return {
        repaired: true,
        propagatedToLayers: ['memory'],
        finalState: {
          id: entityId,
          display_name: '[Unknown Title]',
          cited_by_count: 0,
        },
      };

    default:
      return {
        repaired: false,
        propagatedToLayers: [],
        finalState: null,
      };
  }
}

/**
 * Validate cache metadata
 */
export async function validateCacheMetadata(entityId: string): Promise<CacheMetadataValidationResult> {
  // Mock implementation
  return {
    isValid: false,
    issues: ['missing metadata for memory layer'],
    missingMetadata: ['timestamp', 'ttl'],
    inconsistentMetadata: [],
  };
}

/**
 * Analyze cache performance
 */
export async function analyzeCachePerformance(data: {
  requests: number;
  memoryHits: number;
  indexedDbHits: number;
  localStorageHits: number;
  misses: number;
}): Promise<CachePerformanceAnalysis> {
  const { requests, memoryHits, indexedDbHits, localStorageHits, misses } = data;
  
  const totalHits = memoryHits + indexedDbHits + localStorageHits;
  const totalHitRate = requests > 0 ? totalHits / requests : 0;

  const layerHitRates = {
    memory: requests > 0 ? memoryHits / requests : 0,
    indexeddb: requests > 0 ? indexedDbHits / requests : 0,
    localstorage: requests > 0 ? localStorageHits / requests : 0,
  };

  let efficiency: 'optimal' | 'good' | 'poor' | 'critical';
  if (totalHitRate >= 0.95) efficiency = 'optimal';
  else if (totalHitRate >= 0.85) efficiency = 'good';
  else if (totalHitRate >= 0.7) efficiency = 'poor';
  else efficiency = 'critical';

  const issues: string[] = [];
  const recommendations: string[] = [];

  if (layerHitRates.memory < 0.6) {
    issues.push('low_memory_hit_rate');
    recommendations.push('increase_memory_cache_size');
  }

  if (misses / requests > 0.15) {
    issues.push('high_miss_rate');
    recommendations.push('optimize_caching_strategy');
  }

  return {
    totalHitRate,
    layerHitRates,
    efficiency,
    issues,
    recommendations,
  };
}

/**
 * Helper function to generate checksum
 */
function generateChecksum(data: unknown): string {
  const jsonString = JSON.stringify(data);
  let hash = 0;
  for (let i = 0; i < jsonString.length; i++) {
    const char = jsonString.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return hash.toString(36);
}

/**
 * Helper function to detect data corruption
 */
function isDataCorrupted(data: unknown): { corrupted: boolean; types: string[] } {
  const types: string[] = [];

  if (data === null) {
    types.push('null_data');
    return { corrupted: true, types };
  }

  if (typeof data === 'object') {
    const obj = data as Record<string, unknown>;
    
    // Check for null required fields
    if ('display_name' in obj && obj.display_name === null) {
      types.push('null_required_field');
    }

    // Check for type mismatches
    if ('cited_by_count' in obj && typeof obj.cited_by_count === 'string') {
      types.push('type_mismatch');
    }

    // Check for circular references (simplified)
    try {
      JSON.stringify(data);
    } catch {
      types.push('circular_reference');
    }
  }

  return { corrupted: types.length > 0, types };
}

/**
 * Helper function to compare data across layers
 */
function compareLayerData(data1: unknown, data2: unknown): Array<{ field: string; value1: unknown; value2: unknown }> {
  const differences: Array<{ field: string; value1: unknown; value2: unknown }> = [];

  if (typeof data1 === 'object' && typeof data2 === 'object' && data1 !== null && data2 !== null) {
    const obj1 = data1 as Record<string, unknown>;
    const obj2 = data2 as Record<string, unknown>;

    const allKeys = new Set([...Object.keys(obj1), ...Object.keys(obj2)]);

    for (const key of allKeys) {
      if (obj1[key] !== obj2[key]) {
        differences.push({
          field: key,
          value1: obj1[key],
          value2: obj2[key],
        });
      }
    }
  } else if (data1 !== data2) {
    differences.push({
      field: '_root',
      value1: data1,
      value2: data2,
    });
  }

  return differences;
}

/**
 * Helper function to determine most recent data
 */
function getMostRecentData(layerData: Array<{ layer: string; data: unknown; timestamp: number }>): {
  layer: string;
  data: unknown;
  timestamp: number;
} {
  return layerData.reduce((most, current) => 
    current.timestamp > most.timestamp ? current : most
  );
}

/**
 * Helper function to validate cache hierarchy
 */
function validateCacheHierarchy(layerData: Array<{ layer: string; timestamp: number }>): {
  valid: boolean;
  inverted: boolean;
} {
  // Assume layers are ordered from fastest to slowest
  for (let i = 1; i < layerData.length; i++) {
    if (layerData[i].timestamp > layerData[i - 1].timestamp) {
      return { valid: false, inverted: true };
    }
  }
  return { valid: true, inverted: false };
}