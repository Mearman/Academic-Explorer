/**
 * Hooks for comparison data processing and analysis
 * Provides metric calculation, comparative analysis, and insights
 */

import { useMemo } from 'react';

import type { EntityData } from '@/hooks/use-entity-data';
import type { Author, Work, Source, Institution } from '@/lib/openalex/types';
import { EntityType } from '@/lib/openalex/utils/entity-detection';
import { formatNumber } from '@/lib/openalex/utils/transformers';
import type { ComparisonEntity } from '@/stores/comparison-store';

/**
 * Metric comparison data for a single metric across entities
 */
export interface MetricComparison {
  /** Raw numeric value */
  value: number;
  /** Formatted display value */
  formatted: string;
  /** Whether this is the highest value */
  isHighest: boolean;
  /** Whether this is the lowest value */
  isLowest: boolean;
  /** Rank (1 = highest) */
  rank: number;
  /** Percentile (100 = highest) */
  percentile: number;
}

/**
 * All comparison metrics for a single entity
 */
export interface ComparisonMetrics {
  /** Entity identifier */
  entityId: string;
  /** Entity display name */
  entityName: string;
  /** Entity type */
  entityType: EntityType;
  
  /** Comparison metrics by category */
  metrics: {
    // Universal metrics
    citedByCount: MetricComparison;
    
    // Shared metrics (used by multiple entity types)
    worksCount?: MetricComparison;
    hIndex?: MetricComparison;
    i10Index?: MetricComparison;
    
    // Author-specific metrics
    twoYearMeanCitedness?: MetricComparison;
    
    // Work-specific metrics
    fwci?: MetricComparison;
    referencedWorksCount?: MetricComparison;
    institutionsDistinctCount?: MetricComparison;
    countriesDistinctCount?: MetricComparison;
    publicationYear?: MetricComparison;
  };
}

/**
 * Spread analysis for a metric
 */
export interface MetricSpread {
  min: number;
  max: number;
  range: number;
  mean: number;
  median: number;
  ratio: number; // max/min
}

/**
 * Insight generated from comparison analysis
 */
export interface ComparisonInsight {
  /** Insight type */
  type: 'leader' | 'outlier' | 'trend' | 'statistical' | 'temporal';
  /** Entity ID this insight relates to (if applicable) */
  entityId?: string;
  /** Human-readable insight message */
  message: string;
  /** Confidence score (0-1) */
  confidence: number;
  /** Supporting data for the insight */
  data?: Record<string, unknown>;
}

/**
 * Complete comparison analysis
 */
export interface ComparisonAnalysis {
  /** Type of entities being compared */
  entityType: EntityType;
  /** Number of entities in comparison */
  entityCount: number;
  /** Summary statistics */
  summary: {
    totalEntities: number;
    hasCompleteData: boolean;
    averageCitations: number;
    medianCitations: number;
  };
  /** Top performers by metric */
  topPerformers: {
    citedByCount: string;
    worksCount?: string;
    hIndex?: string;
    [key: string]: string | undefined;
  };
  /** Spread analysis by metric */
  spreads: {
    citedByCount: MetricSpread;
    worksCount?: MetricSpread;
    hIndex?: MetricSpread;
    [key: string]: MetricSpread | undefined;
  };
  /** Generated insights */
  insights: ComparisonInsight[];
}

/**
 * Extract metrics from entity data based on type
 */
function extractEntityMetrics(entity: EntityData, type: EntityType): Record<string, number> {
  const metrics: Record<string, number> = {};
  
  // Universal metrics
  if (typeof entity.cited_by_count === 'number') {
    metrics.citedByCount = entity.cited_by_count;
  }
  
  switch (type) {
    case EntityType.AUTHOR: {
      const author = entity as Author;
      if (typeof author.works_count === 'number') {
        metrics.worksCount = author.works_count;
      }
      if (author.summary_stats) {
        if (typeof author.summary_stats.h_index === 'number') {
          metrics.hIndex = author.summary_stats.h_index;
        }
        if (typeof author.summary_stats.i10_index === 'number') {
          metrics.i10Index = author.summary_stats.i10_index;
        }
        if (typeof author.summary_stats['2yr_mean_citedness'] === 'number') {
          metrics.twoYearMeanCitedness = author.summary_stats['2yr_mean_citedness'];
        }
      }
      break;
    }
    
    case EntityType.WORK: {
      const work = entity as Work;
      if (typeof work.fwci === 'number') {
        metrics.fwci = work.fwci;
      }
      if (typeof work.referenced_works_count === 'number') {
        metrics.referencedWorksCount = work.referenced_works_count;
      }
      if (typeof work.institutions_distinct_count === 'number') {
        metrics.institutionsDistinctCount = work.institutions_distinct_count;
      }
      if (typeof work.countries_distinct_count === 'number') {
        metrics.countriesDistinctCount = work.countries_distinct_count;
      }
      if (typeof work.publication_year === 'number') {
        metrics.publicationYear = work.publication_year;
      }
      break;
    }
    
    case EntityType.SOURCE: {
      const source = entity as Source;
      if (typeof source.works_count === 'number') {
        metrics.worksCount = source.works_count;
      }
      if (source.summary_stats) {
        if (typeof source.summary_stats.h_index === 'number') {
          metrics.hIndex = source.summary_stats.h_index;
        }
        if (typeof source.summary_stats.i10_index === 'number') {
          metrics.i10Index = source.summary_stats.i10_index;
        }
      }
      break;
    }
    
    case EntityType.INSTITUTION: {
      const institution = entity as Institution;
      if (typeof institution.works_count === 'number') {
        metrics.worksCount = institution.works_count;
      }
      break;
    }
  }
  
  return metrics;
}

/**
 * Calculate ranking and percentile for a metric value
 */
function calculateRanking(value: number, allValues: number[]): {
  rank: number;
  percentile: number;
  isHighest: boolean;
  isLowest: boolean;
} {
  const sortedValues = [...allValues].sort((a, b) => b - a); // Descending order
  const rank = sortedValues.indexOf(value) + 1;
  const percentile = Math.round(((allValues.length - rank + 1) / allValues.length) * 100);
  
  return {
    rank,
    percentile,
    isHighest: rank === 1,
    isLowest: rank === allValues.length
  };
}

/**
 * Format metric value for display
 */
function formatMetricValue(value: number, metricKey: string): string {
  // Special formatting for different metric types
  if (metricKey === 'twoYearMeanCitedness' || metricKey === 'fwci') {
    return value.toFixed(1);
  }
  
  if (metricKey === 'publicationYear') {
    return value.toString();
  }
  
  // Use regular number formatting for all values to match test expectations
  return formatNumber(value);
}

/**
 * Calculate spread statistics for a set of values
 */
function calculateSpread(values: number[]): MetricSpread {
  const sorted = [...values].sort((a, b) => a - b);
  const min = sorted[0];
  const max = sorted[sorted.length - 1];
  const sum = values.reduce((acc, val) => acc + val, 0);
  const mean = sum / values.length;
  const median = sorted.length % 2 === 0
    ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
    : sorted[Math.floor(sorted.length / 2)];
  
  return {
    min,
    max,
    range: max - min,
    mean,
    median,
    ratio: min > 0 ? max / min : 0
  };
}

/**
 * Generate insights from comparison data
 */
function generateInsights(
  entities: ComparisonEntity[],
  metrics: ComparisonMetrics[],
  spreads: Record<string, MetricSpread>
): ComparisonInsight[] {
  const insights: ComparisonInsight[] = [];
  
  // Leader insights
  const citationLeader = metrics.reduce((leader, current) => 
    current.metrics.citedByCount.value > leader.metrics.citedByCount.value ? current : leader
  );
  
  insights.push({
    type: 'leader',
    entityId: citationLeader.entityId,
    message: `${citationLeader.entityName} leads in citations with ${citationLeader.metrics.citedByCount.formatted} citations.`,
    confidence: 1.0,
    data: { metric: 'citedByCount', value: citationLeader.metrics.citedByCount.value }
  });
  
  // Outlier insights (look for values significantly different from others)
  const citationSpread = spreads.citedByCount;
  if (citationSpread && citationSpread.ratio > 2) {
    const highOutlier = metrics.find(m => m.metrics.citedByCount.value === citationSpread.max);
    const lowOutlier = metrics.find(m => m.metrics.citedByCount.value === citationSpread.min);
    
    if (highOutlier && lowOutlier && entities.length > 2) {
      insights.push({
        type: 'outlier',
        entityId: highOutlier.entityId,
        message: `${highOutlier.entityName} has significantly more citations (${highOutlier.metrics.citedByCount.formatted}) than ${lowOutlier.entityName} (${lowOutlier.metrics.citedByCount.formatted}).`,
        confidence: 0.8,
        data: { ratio: citationSpread.ratio }
      });
    }
  }
  
  // Statistical insights
  if (entities.length >= 3 && citationSpread) {
    const coefficient = citationSpread.range / citationSpread.mean;
    if (coefficient > 1) {
      insights.push({
        type: 'statistical',
        message: `High variability in citations detected. The range spans ${citationSpread.range} citations with a coefficient of variation of ${coefficient.toFixed(2)}.`,
        confidence: 0.7,
        data: { coefficient, range: citationSpread.range }
      });
    }
  }
  
  // Temporal insights for works
  if (entities.length > 1 && entities[0].type === EntityType.WORK) {
    const years = metrics
      .map(m => m.metrics.publicationYear?.value)
      .filter((year): year is number => typeof year === 'number');
    
    if (years.length > 1) {
      const yearSpread = calculateSpread(years);
      if (yearSpread.range > 0) {
        insights.push({
          type: 'temporal',
          message: `Works span ${yearSpread.range} years (${yearSpread.min}-${yearSpread.max}), showing evolution over time.`,
          confidence: 0.9,
          data: { yearRange: yearSpread.range, earliestYear: yearSpread.min, latestYear: yearSpread.max }
        });
      }
    }
  }
  
  // Productivity insights for authors
  if (entities.length > 1 && entities[0].type === EntityType.AUTHOR) {
    const worksSpread = spreads.worksCount;
    if (worksSpread && worksSpread.ratio > 1.5) {
      const mostProductive = metrics.find(m => m.metrics.worksCount?.value === worksSpread.max);
      if (mostProductive) {
        insights.push({
          type: 'trend',
          entityId: mostProductive.entityId,
          message: `${mostProductive.entityName} is the most productive author with ${mostProductive.metrics.worksCount?.formatted} works.`,
          confidence: 0.9,
          data: { metric: 'worksCount', value: worksSpread.max }
        });
      }
    }
  }
  
  return insights;
}

/**
 * Hook for calculating comparison metrics across entities
 */
export function useComparisonMetrics(entities: ComparisonEntity[]) {
  const comparisonMetrics = useMemo(() => {
    if (entities.length === 0) {
      return [];
    }
    
    try {
      // Extract all metrics from all entities
      const entityMetrics = entities.map(entity => ({
        entityId: entity.id,
        entityName: entity.data.display_name || 'Unknown',
        entityType: entity.type,
        rawMetrics: extractEntityMetrics(entity.data, entity.type)
      }));
      
      // Get all metric keys
      const allMetricKeys = new Set<string>();
      entityMetrics.forEach(em => {
        Object.keys(em.rawMetrics).forEach(key => allMetricKeys.add(key));
      });
      
      // Calculate comparisons for each metric
      const metricComparisons: Record<string, Record<string, MetricComparison>> = {};
      
      for (const metricKey of allMetricKeys) {
        const values = entityMetrics
          .map(em => em.rawMetrics[metricKey])
          .filter((val): val is number => typeof val === 'number');
        
        if (values.length === 0) continue;
        
        entityMetrics.forEach(em => {
          const value = em.rawMetrics[metricKey];
          if (typeof value === 'number') {
            if (!metricComparisons[em.entityId]) {
              metricComparisons[em.entityId] = {};
            }
            
            const ranking = calculateRanking(value, values);
            metricComparisons[em.entityId][metricKey] = {
              value,
              formatted: formatMetricValue(value, metricKey),
              ...ranking
            };
          }
        });
      }
      
      // Build final comparison metrics
      return entityMetrics.map(em => ({
        entityId: em.entityId,
        entityName: em.entityName,
        entityType: em.entityType,
        metrics: {
          citedByCount: metricComparisons[em.entityId]?.citedByCount || {
            value: 0, formatted: '0', rank: 1, percentile: 100, isHighest: true, isLowest: true
          },
          worksCount: metricComparisons[em.entityId]?.worksCount,
          hIndex: metricComparisons[em.entityId]?.hIndex,
          i10Index: metricComparisons[em.entityId]?.i10Index,
          twoYearMeanCitedness: metricComparisons[em.entityId]?.twoYearMeanCitedness,
          fwci: metricComparisons[em.entityId]?.fwci,
          referencedWorksCount: metricComparisons[em.entityId]?.referencedWorksCount,
          institutionsDistinctCount: metricComparisons[em.entityId]?.institutionsDistinctCount,
          countriesDistinctCount: metricComparisons[em.entityId]?.countriesDistinctCount,
          publicationYear: metricComparisons[em.entityId]?.publicationYear
        }
      }));
    } catch (error) {
      console.error('[useComparisonMetrics] Error calculating metrics:', error);
      return [];
    }
  }, [entities]);
  
  return {
    comparisonMetrics,
    isLoading: false,
    error: null,
    hasMetrics: comparisonMetrics.length > 0
  };
}

/**
 * Hook for generating comprehensive comparison analysis
 */
export function useComparisonAnalysis(entities: ComparisonEntity[]) {
  const { comparisonMetrics } = useComparisonMetrics(entities);
  
  const analysis = useMemo(() => {
    if (entities.length < 2 || comparisonMetrics.length === 0) {
      return null;
    }
    
    try {
      const entityType = entities[0].type;
      
      // Calculate summary statistics
      const citations = comparisonMetrics.map(m => m.metrics.citedByCount.value);
      const totalCitations = citations.reduce((sum, val) => sum + val, 0);
      const averageCitations = totalCitations / citations.length;
      const sortedCitations = [...citations].sort((a, b) => a - b);
      const medianCitations = sortedCitations.length % 2 === 0
        ? (sortedCitations[sortedCitations.length / 2 - 1] + sortedCitations[sortedCitations.length / 2]) / 2
        : sortedCitations[Math.floor(sortedCitations.length / 2)];
      
      // Calculate spreads for all metrics - ensure citedByCount is always present
      const spreads: ComparisonAnalysis['spreads'] = {
        citedByCount: calculateSpread(citations)
      };
      
      const optionalMetricKeys = ['worksCount', 'hIndex', 'i10Index', 'twoYearMeanCitedness', 'fwci'];
      
      for (const metricKey of optionalMetricKeys) {
        const values = comparisonMetrics
          .map(m => {
            const metrics = m.metrics as Record<string, MetricComparison | undefined>;
            return metrics[metricKey]?.value;
          })
          .filter((val): val is number => typeof val === 'number');
        
        if (values.length > 1) {
          spreads[metricKey] = calculateSpread(values);
        }
      }
      
      // Find top performers - start with required citedByCount
      const citationLeader = comparisonMetrics.find(m => m.metrics.citedByCount.rank === 1);
      const topPerformers: ComparisonAnalysis['topPerformers'] = {
        citedByCount: citationLeader?.entityId || entities[0]?.id || ''
      };
      
      // Add optional metrics
      for (const metricKey of optionalMetricKeys) {
        const topEntity = comparisonMetrics.find(m => {
          const metrics = m.metrics as Record<string, MetricComparison | undefined>;
          return metrics[metricKey]?.rank === 1;
        });
        if (topEntity) {
          topPerformers[metricKey] = topEntity.entityId;
        }
      }
      
      // Generate insights - filter out undefined spreads
      const filteredSpreads: Record<string, MetricSpread> = {};
      for (const [key, value] of Object.entries(spreads)) {
        if (value !== undefined) {
          filteredSpreads[key] = value;
        }
      }
      const insights = generateInsights(entities, comparisonMetrics, filteredSpreads);
      
      const comparisonAnalysis: ComparisonAnalysis = {
        entityType,
        entityCount: entities.length,
        summary: {
          totalEntities: entities.length,
          hasCompleteData: comparisonMetrics.every(m => m.metrics.citedByCount.value >= 0),
          averageCitations,
          medianCitations
        },
        topPerformers,
        spreads,
        insights
      };
      
      return comparisonAnalysis;
    } catch (error) {
      console.error('[useComparisonAnalysis] Error generating analysis:', error);
      return null;
    }
  }, [entities, comparisonMetrics]);
  
  return {
    analysis,
    isLoading: false,
    error: null,
    hasAnalysis: analysis !== null
  };
}

