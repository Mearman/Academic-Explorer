/**
 * Page Object Contracts for E2E Test Coverage Enhancement
 *
 * These interfaces define the contracts for page objects used in E2E tests.
 * All page objects should implement these interfaces to ensure consistency
 * across test suites and enable type-safe test development.
 *
 * Pattern: Hierarchical 4-layer inheritance
 * BasePageObject → BaseSPAPageObject → BaseEntityPageObject → Specific
 *
 * See: specs/020-e2e-test-coverage/research.md (Research Task 2)
 */

import type { Page } from '@playwright/test';
import type { EntityType } from '@bibgraph/types';

/**
 * Base page object interface
 * All page objects must extend this interface
 */
export interface BasePageObject {
  readonly page: Page;

  /**
   * Navigate to the page
   * @param options - Navigation options
   */
  goto(options?: NavigationOptions): Promise<void>;

  /**
   * Wait for page to be fully loaded and interactive
   * Uses app-ready checks instead of generic networkidle
   */
  waitForReady(timeout?: number): Promise<void>;

  /**
   * Check if page is currently displayed
   */
  isDisplayed(): Promise<boolean>;

  /**
   * Get page URL
   */
  getUrl(): string;
}

/**
 * SPA-specific page object interface
 * Extends BasePageObject with hash routing awareness
 */
export interface BaseSPAPageObject extends BasePageObject {
  /**
   * Navigate using hash route (/#/route)
   */
  navigateToHash(hash: string): Promise<void>;

  /**
   * Wait for TanStack Router to complete navigation
   */
  waitForRouterReady(timeout?: number): Promise<void>;

  /**
   * Check if main content area is visible
   */
  hasMainContent(): Promise<boolean>;

  /**
   * Check if navigation controls are present
   */
  hasNavigation(): Promise<boolean>;
}

/**
 * Entity-specific page object interface
 * Base for all entity detail and index pages
 */
export interface BaseEntityPageObject extends BaseSPAPageObject {
  readonly entityType: EntityType;

  /**
   * Wait for entity data to load from API
   */
  waitForEntityData(timeout?: number): Promise<void>;

  /**
   * Check if entity data is displayed (no error state)
   */
  hasEntityData(): Promise<boolean>;

  /**
   * Get entity ID from current URL
   */
  getEntityId(): Promise<string>;
}

/**
 * Entity detail page object
 * Represents individual entity pages (e.g., /works/W123)
 */
export interface EntityDetailPage extends BaseEntityPageObject {
  /**
   * Navigate to entity detail page
   * @param entityId - OpenAlex entity ID (e.g., "W2741809807")
   */
  goto(entityId: string, options?: NavigationOptions): Promise<void>;

  /**
   * Get entity title/name displayed on page
   */
  getEntityTitle(): Promise<string>;

  /**
   * Get entity metadata (structured info display)
   */
  getEntityInfo(): Promise<Record<string, unknown>>;

  /**
   * Check if entity has relationship visualization
   */
  hasRelationships(): Promise<boolean>;

  /**
   * Get count of incoming relationships
   */
  getIncomingRelationshipCount(): Promise<number>;

  /**
   * Get count of outgoing relationships
   */
  getOutgoingRelationshipCount(): Promise<number>;

  /**
   * Check if graph visualization is displayed
   */
  hasGraph(): Promise<boolean>;

  /**
   * Wait for graph to render (D3 force simulation complete)
   */
  waitForGraphReady(timeout?: number): Promise<void>;
}

/**
 * Entity index page object
 * Represents entity list/browse pages (e.g., /works)
 */
export interface EntityIndexPage extends BaseEntityPageObject {
  /**
   * Navigate to entity index page
   */
  goto(options?: NavigationOptions): Promise<void>;

  /**
   * Check if search input is present
   */
  hasSearchInput(): Promise<boolean>;

  /**
   * Check if filter controls are present
   */
  hasFilterControls(): Promise<boolean>;

  /**
   * Get number of results displayed
   */
  getResultCount(): Promise<number>;

  /**
   * Click first result in list
   */
  clickFirstResult(): Promise<void>;

  /**
   * Perform search query
   */
  search(query: string): Promise<void>;

  /**
   * Wait for search results to load
   */
  waitForSearchResults(minCount?: number, timeout?: number): Promise<void>;
}

/**
 * Error page object
 * Represents error states (404, 500, network failures)
 */
export interface ErrorPage extends BasePageObject {
  /**
   * Check if current page is an error page
   */
  isErrorPage(): Promise<boolean>;

  /**
   * Get error type from displayed content
   */
  getErrorType(): Promise<ErrorType>;

  /**
   * Get error message text
   */
  getErrorMessage(): Promise<string>;

  /**
   * Check if retry button is present
   */
  hasRetryButton(): Promise<boolean>;

  /**
   * Click retry button
   */
  clickRetry(): Promise<void>;

  /**
   * Check if "Back to home" link is present
   */
  hasBackToHomeLink(): Promise<boolean>;

  /**
   * Click "Back to home" link
   */
  clickBackToHome(): Promise<void>;
}

/**
 * Search page object
 * Represents the global search page (/search)
 */
export interface SearchPage extends BaseSPAPageObject {
  /**
   * Navigate to search page
   */
  goto(query?: string, options?: NavigationOptions): Promise<void>;

  /**
   * Enter search query
   */
  enterQuery(query: string): Promise<void>;

  /**
   * Submit search form
   */
  submit(): Promise<void>;

  /**
   * Get search results
   */
  getResults(): Promise<SearchResult[]>;

  /**
   * Apply filter by entity type
   */
  filterByEntityType(entityType: EntityType): Promise<void>;

  /**
   * Get applied filters
   */
  getAppliedFilters(): Promise<SearchFilter[]>;

  /**
   * Clear all filters
   */
  clearFilters(): Promise<void>;
}

/**
 * Browse page object
 * Represents the browse/explore page
 */
export interface BrowsePage extends BaseSPAPageObject {
  /**
   * Navigate to browse page
   */
  goto(options?: NavigationOptions): Promise<void>;

  /**
   * Check if entity type grid is displayed
   */
  hasEntityTypeGrid(): Promise<boolean>;

  /**
   * Get list of available entity types
   */
  getEntityTypes(): Promise<EntityType[]>;

  /**
   * Click entity type card
   */
  clickEntityType(entityType: EntityType): Promise<void>;
}

/**
 * Settings page object
 * Represents the settings page
 */
export interface SettingsPage extends BaseSPAPageObject {
  /**
   * Navigate to settings page
   */
  goto(options?: NavigationOptions): Promise<void>;

  /**
   * Check if xpac toggle is present
   */
  hasXpacToggle(): Promise<boolean>;

  /**
   * Get xpac toggle state
   */
  getXpacToggleState(): Promise<boolean>;

  /**
   * Toggle xpac setting
   */
  toggleXpac(): Promise<void>;

  /**
   * Check if data version selector is present
   */
  hasDataVersionSelector(): Promise<boolean>;

  /**
   * Get selected data version
   */
  getDataVersion(): Promise<'1' | '2'>;

  /**
   * Select data version
   */
  selectDataVersion(version: '1' | '2'): Promise<void>;
}

// Supporting Types

export interface NavigationOptions {
  waitUntil?: 'load' | 'domcontentloaded' | 'networkidle' | 'commit';
  timeout?: number;
  referer?: string;
}

export type ErrorType = '404' | '500' | 'network' | 'timeout' | 'unknown';

export interface SearchResult {
  id: string;
  type: EntityType;
  title: string;
  snippet?: string;
}

export interface SearchFilter {
  type: 'entityType' | 'date' | 'custom';
  value: string;
  label: string;
}
