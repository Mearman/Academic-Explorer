/**
 * Query Comparison Utilities
 * 
 * Utilities for comparing queries to identify when they represent the same search
 * with different pagination or sorting parameters.
 */

import { z } from 'zod';

import type { WorksParams } from '@/lib/openalex/types';

/**
 * Zod schemas for parameter validation and extraction
 */
const CoreSearchParamsSchema = z.object({
  search: z.string().optional(),
  filter: z.union([z.string(), z.record(z.string(), z.unknown())]).optional(),
  from_publication_date: z.string().optional(),
  to_publication_date: z.string().optional(),
  sample: z.number().optional(),
  group_by: z.string().optional(),
}).strict();

const NavigationParamsSchema = z.object({
  page: z.number().optional(),
  per_page: z.number().optional(),
  sort: z.string().optional(),
}).strict();

const _WorksParamsSchema = CoreSearchParamsSchema.merge(NavigationParamsSchema).merge(
  z.object({
    // Additional WorksParams that aren't core search or navigation
    cursor: z.string().optional(),
    select: z.union([z.string(), z.array(z.string())]).optional(),
  }).partial()
);

type CoreSearchParams = z.infer<typeof CoreSearchParamsSchema>;
type NavigationParams = z.infer<typeof NavigationParamsSchema>;

/**
 * Generate a unique signature for a query based on its core search parameters,
 * excluding navigation parameters like page, per_page, and sort.
 * 
 * This allows us to identify when two queries are essentially the same search
 * but with different pagination or sorting.
 */
export function generateQuerySignature(params: WorksParams): string {
  // Extract and validate core search parameters using Zod
  const parseResult = CoreSearchParamsSchema.safeParse(params);
  
  if (!parseResult.success) {
    // Fallback: create signature from valid core params only
    const coreParams: Partial<CoreSearchParams> = {};
    if (typeof params.search === 'string') coreParams.search = params.search;
    if (typeof params.filter === 'string' || (typeof params.filter === 'object' && params.filter !== null)) {
      coreParams.filter = params.filter;
    }
    if (typeof params.from_publication_date === 'string') coreParams.from_publication_date = params.from_publication_date;
    if (typeof params.to_publication_date === 'string') coreParams.to_publication_date = params.to_publication_date;
    if (typeof params.sample === 'number') coreParams.sample = params.sample;
    if (typeof params.group_by === 'string') coreParams.group_by = params.group_by;
    
    return createSignatureFromParams(coreParams);
  }
  
  return createSignatureFromParams(parseResult.data);
}

function createSignatureFromParams(params: Partial<CoreSearchParams>): string {
  // Create a stable signature by sorting keys
  const sortedKeys = Object.keys(params).sort();
  const signature = sortedKeys
    .map(key => `${key}:${JSON.stringify(params[key as keyof CoreSearchParams])}`)
    .join('|');
    
  return signature;
}

/**
 * Compare two query parameter sets to determine if they represent:
 * - 'same': Identical queries
 * - 'navigation': Same search with different navigation parameters
 * - 'different': Completely different searches
 */
export function compareQueries(
  paramsA: WorksParams, 
  paramsB: WorksParams
): 'same' | 'navigation' | 'different' {
  const signatureA = generateQuerySignature(paramsA);
  const signatureB = generateQuerySignature(paramsB);
  
  // If core signatures are different, these are different searches
  if (signatureA !== signatureB) {
    return 'different';
  }
  
  // Same core signature - check if navigation params differ
  const navA = getNavigationParams(paramsA);
  const navB = getNavigationParams(paramsB);
  
  const navigationDiffers = (
    navA.page !== navB.page ||
    navA.per_page !== navB.per_page ||
    navA.sort !== navB.sort
  );
  
  if (navigationDiffers) {
    return 'navigation';
  }
  
  return 'same';
}

/**
 * Check if two queries represent the same search with different pagination
 */
export function isPageNavigation(currentParams: WorksParams, previousParams: WorksParams): boolean {
  return compareQueries(currentParams, previousParams) === 'navigation';
}

/**
 * Check if a parameter change is only a page change (not per_page or sort)
 */
export function isOnlyPageChange(currentParams: WorksParams, previousParams: WorksParams): boolean {
  const comparison = compareQueries(currentParams, previousParams);
  
  if (comparison !== 'navigation') {
    return false;
  }
  
  // Extract navigation params using Zod for type safety
  const currentNav = getNavigationParams(currentParams);
  const previousNav = getNavigationParams(previousParams);
  
  // Check if only the page parameter changed
  const pageChanged = currentNav.page !== previousNav.page;
  const perPageSame = currentNav.per_page === previousNav.per_page;
  const sortSame = currentNav.sort === previousNav.sort;
  
  return pageChanged && perPageSame && sortSame;
}

/**
 * Get the base parameters for a query (without navigation params)
 * Useful for creating the "parent" query record
 */
export function getBaseQueryParams(params: WorksParams): WorksParams {
  // Extract and validate core search parameters using Zod
  const parseResult = CoreSearchParamsSchema.safeParse(params);
  
  if (parseResult.success) {
    return parseResult.data;
  }
  
  // Fallback: manually extract valid core params
  const baseParams: WorksParams = {};
  if (typeof params.search === 'string') baseParams.search = params.search;
  if (params.filter !== undefined) baseParams.filter = params.filter;
  if (typeof params.from_publication_date === 'string') baseParams.from_publication_date = params.from_publication_date;
  if (typeof params.to_publication_date === 'string') baseParams.to_publication_date = params.to_publication_date;
  if (typeof params.sample === 'number') baseParams.sample = params.sample;
  if (typeof params.group_by === 'string') baseParams.group_by = params.group_by;
  
  return baseParams;
}

/**
 * Get just the navigation parameters from a query
 */
export function getNavigationParams(params: WorksParams): NavigationParams {
  // Extract and validate navigation parameters using Zod
  const parseResult = NavigationParamsSchema.safeParse(params);
  
  if (parseResult.success) {
    return parseResult.data;
  }
  
  // Fallback: manually extract valid navigation params
  const navParams: NavigationParams = {};
  if (typeof params.page === 'number') navParams.page = params.page;
  if (typeof params.per_page === 'number') navParams.per_page = params.per_page;
  if (typeof params.sort === 'string') navParams.sort = params.sort;
  
  return navParams;
}

/**
 * Create a human-readable description of what changed between two queries
 */
export function describeQueryChange(
  currentParams: WorksParams, 
  previousParams: WorksParams
): string {
  const comparison = compareQueries(currentParams, previousParams);
  
  switch (comparison) {
    case 'same':
      return 'No changes';
      
    case 'different':
      return 'New search';
      
    case 'navigation': {
      const changes: string[] = [];
      
      // Extract navigation params using Zod for type safety
      const currentNav = getNavigationParams(currentParams);
      const previousNav = getNavigationParams(previousParams);
      
      if (currentNav.page !== previousNav.page) {
        changes.push(`Page ${previousNav.page || 1} → ${currentNav.page || 1}`);
      }
      
      if (currentNav.per_page !== previousNav.per_page) {
        changes.push(`Per page ${previousNav.per_page || 25} → ${currentNav.per_page || 25}`);
      }
      
      if (currentNav.sort !== previousNav.sort) {
        changes.push(`Sort: ${previousNav.sort || 'default'} → ${currentNav.sort || 'default'}`);
      }
      
      return changes.join(', ');
    }
      
    default:
      return 'Unknown change';
  }
}