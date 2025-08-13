/**
 * Next.js 15 App Router page parameter types
 * For dynamic routes in the Academic Explorer
 */

// import type { EntityType } from '@/lib/openalex/utils/entity-detection'; // Unused for now

/**
 * Parameters for dynamic entity routes
 */
export interface EntityPageParams {
  /**
   * The entity ID from the URL (can be prefixed like W123 or clean like 123)
   */
  id: string;
}

/**
 * Parameters for the generic entity ID route
 */
export interface GenericEntityPageParams {
  /**
   * The entity ID from the URL (should be prefixed like W123456)
   */
  entityId: string;
}

/**
 * Search parameters that can be passed to entity pages
 */
export interface EntityPageSearchParams {
  /**
   * View mode for the entity display
   */
  view?: 'detailed' | 'compact' | 'minimal';
  
  /**
   * Tab selection for multi-tab displays
   */
  tab?: string;
  
  /**
   * Highlight specific sections
   */
  highlight?: string;
  
  /**
   * Source of navigation (for analytics)
   */
  from?: string;
}

/**
 * Complete page props for entity pages
 */
export interface EntityPageProps<T extends EntityPageParams = EntityPageParams> {
  params: Promise<T>;
  searchParams: Promise<EntityPageSearchParams>;
}

/**
 * Props for entity-specific pages
 */
export type WorkPageProps = EntityPageProps<EntityPageParams>;
export type AuthorPageProps = EntityPageProps<EntityPageParams>;
export type SourcePageProps = EntityPageProps<EntityPageParams>;
export type InstitutionPageProps = EntityPageProps<EntityPageParams>;
export type PublisherPageProps = EntityPageProps<EntityPageParams>;
export type FunderPageProps = EntityPageProps<EntityPageParams>;
export type TopicPageProps = EntityPageProps<EntityPageParams>;
export type ConceptPageProps = EntityPageProps<EntityPageParams>;
export type KeywordPageProps = EntityPageProps<EntityPageParams>;
export type ContinentPageProps = EntityPageProps<EntityPageParams>;
export type RegionPageProps = EntityPageProps<EntityPageParams>;

/**
 * Props for the generic entity page
 */
export interface GenericEntityPageProps {
  params: Promise<GenericEntityPageParams>;
  searchParams: Promise<EntityPageSearchParams>;
}

/**
 * Type guard to check if params contain a valid entity type
 */
export function isValidEntityPageParams(
  params: unknown, 
  // _expectedType?: EntityType // Currently unused, kept for future use
): params is EntityPageParams {
  if (typeof params !== 'object' || params === null) {
    return false;
  }
  
  const { id } = params as Record<string, unknown>;
  
  if (typeof id !== 'string' || !id.trim()) {
    return false;
  }
  
  return true;
}