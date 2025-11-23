/**
 * Data Model Interfaces for E2E Test Coverage Enhancement
 *
 * These interfaces define the data models for test cases, coverage metrics,
 * test suites, and reporting structures used in the E2E test coverage feature.
 *
 * Storage: No persistent storage required - these are conceptual data models
 * for documentation purposes. Actual data:
 * - Test metadata: Stored in test files as JSDoc comments
 * - Coverage metrics: Generated at runtime via coverage scripts
 * - Test reports: Output by Playwright reporter (JSON/HTML)
 * - Route manifest: Static TypeScript file (apps/web/coverage/route-manifest.ts)
 *
 * See: specs/020-e2e-test-coverage/data-model.md for full documentation
 */

import type { EntityType } from '@academic-explorer/types';

/**
 * Test Case
 *
 * Represents a single E2E test scenario with execution metadata.
 *
 * State transitions:
 * pending → running → pass (final)
 * pending → running → fail → retry (if retries < 1) → running → pass/fail (final)
 */
export interface TestCase {
  /** Unique identifier (e.g., "e2e-works-detail-001") */
  testId: string;

  /** Human-readable test description */
  description: string;

  /** Route pattern being tested (e.g., "/works/$_", "/search") */
  routePattern: string;

  /** Entity type if route is entity-specific */
  entityType?: EntityType;

  /** DOM elements expected to be present */
  expectedElements: string[];

  /** Priority level from spec */
  priority: "P1" | "P2" | "P3";

  /** Current test status */
  status: "pending" | "running" | "pass" | "fail";

  /** Execution time in milliseconds */
  executionTime: number;

  /** Number of retry attempts (0 = first attempt) */
  retries: number;

  /** Test tags (e.g., "@smoke", "@regression", "@a11y") */
  tags?: string[];

  /** Test creation timestamp (ISO string) */
  createdAt: string;

  /** Last execution timestamp (ISO string) */
  lastRun?: string;
}

/**
 * Coverage Gap
 *
 * Represents an untested code path identified during coverage analysis.
 *
 * State transitions:
 * identified → planned → in-progress → resolved
 */
export interface CoverageGap {
  /** Unique identifier (e.g., "gap-domains-detail") */
  gapId: string;

  /** Route path with gap (e.g., "/domains/$domainId") */
  route: string;

  /** Type of coverage gap */
  gapType: "route" | "workflow" | "error";

  /** Description of what's untested */
  description: string;

  /** Priority level from spec */
  priority: "P1" | "P2" | "P3";

  /** Current status */
  remediationStatus: "identified" | "planned" | "in-progress" | "resolved";

  /** Developer/tester assigned */
  assignedTo?: string;

  /** TestCase ID created to remediate (when resolved) */
  targetTestId?: string;

  /** Gap identification timestamp (ISO string) */
  identifiedAt: string;

  /** Gap resolution timestamp (ISO string) */
  resolvedAt?: string;
}

/**
 * Test Suite
 *
 * Represents a collection of related test cases grouped by feature area.
 *
 * Calculated fields:
 * - passRate = (passedTests / totalTests) × 100
 * - avgExecutionTime = sum(testExecutionTimes) / testCount
 */
export interface TestSuite {
  /** Unique identifier (e.g., "suite-relationships") */
  suiteId: string;

  /** Human-readable suite name */
  name: string;

  /** Suite category */
  category: "entity" | "workflow" | "error" | "accessibility";

  /** Total number of tests in suite */
  testCount: number;

  /** Percentage of tests passing (0-100) */
  passRate: number;

  /** Average test execution time in milliseconds */
  avgExecutionTime: number;

  /** Last suite execution timestamp (ISO string) */
  lastRun?: string;

  /** Suite-level tags */
  tags?: string[];
}

/**
 * Test Report
 *
 * Represents aggregated test execution results for a test run.
 *
 * Validation:
 * - totalTests = passedTests + failedTests + skippedTests
 *
 * Calculated fields:
 * - passRate = (passedTests / totalTests) × 100
 * - flakinessRate = (flakyTests / totalTests) × 100
 */
export interface TestReport {
  /** Unique identifier (e.g., "report-2025-11-23-001") */
  reportId: string;

  /** Test run timestamp (ISO string) */
  runDate: string;

  /** Total tests executed */
  totalTests: number;

  /** Tests that passed */
  passedTests: number;

  /** Tests that failed */
  failedTests: number;

  /** Tests that were skipped */
  skippedTests: number;

  /** Tests that passed after retry */
  flakyTests: number;

  /** Total execution time in milliseconds */
  executionTime: number;

  /** Route coverage percentage (0-100) */
  coveragePercentage: number;

  /** Execution environment */
  environment: "local" | "ci" | "production";

  /** Git branch name */
  branch: string;

  /** Git commit SHA */
  commit: string;
}

/**
 * Error Scenario
 *
 * Represents a specific error condition to test with expected error UI.
 */
export interface ErrorScenario {
  /** Unique identifier (e.g., "error-404-work") */
  scenarioId: string;

  /** Error category */
  errorType: "404" | "500" | "network" | "timeout" | "validation";

  /** How to trigger the error (e.g., "Navigate to invalid work ID") */
  triggerMethod: string;

  /** Expected error UI elements */
  expectedErrorUI: string[];

  /** Expected error message text */
  expectedMessage?: string;

  /** Expected recovery action (e.g., "Retry button", "Back to home link") */
  recoveryAction?: string;

  /** Associated TestCase ID */
  testId?: string;
}
