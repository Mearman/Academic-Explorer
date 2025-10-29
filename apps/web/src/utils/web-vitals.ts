/**
 * Web Vitals Performance Monitoring
 * Tracks Core Web Vitals and reports to app activity store
 */

import { logger } from "@academic-explorer/utils";
import type { Metric } from "web-vitals";

// Core Web Vitals thresholds (from web.dev)
const THRESHOLDS = {
  // Largest Contentful Paint (LCP) - should be < 2.5s
  LCP: { good: 2500, needsImprovement: 4000 },
  // First Input Delay (FID) - should be < 100ms
  FID: { good: 100, needsImprovement: 300 },
  // Cumulative Layout Shift (CLS) - should be < 0.1
  CLS: { good: 0.1, needsImprovement: 0.25 },
  // First Contentful Paint (FCP) - should be < 1.8s
  FCP: { good: 1800, needsImprovement: 3000 },
  // Time to First Byte (TTFB) - should be < 800ms
  TTFB: { good: 800, needsImprovement: 1800 },
  // Interaction to Next Paint (INP) - should be < 200ms
  INP: { good: 200, needsImprovement: 500 },
};

type Rating = "good" | "needs-improvement" | "poor";

function getRating(metric: Metric): Rating {
  const threshold = THRESHOLDS[metric.name as keyof typeof THRESHOLDS];
  if (!threshold) return "good";

  if (metric.value <= threshold.good) return "good";
  if (metric.value <= threshold.needsImprovement) return "needs-improvement";
  return "poor";
}

function reportMetric(metric: Metric) {
  const rating = getRating(metric);

  logger.debug("performance", `Web Vital: ${metric.name}`, {
    value: metric.value,
    rating,
    id: metric.id,
    navigationType: metric.navigationType,
  });

  // Store in app activity (if available)
  if (typeof window !== "undefined" && "performance" in window) {
    // Mark the performance entry for later analysis
    performance.mark(`web-vital:${metric.name}`, {
      detail: {
        name: metric.name,
        value: metric.value,
        rating,
        id: metric.id,
      },
    });
  }

  // Send to analytics if configured
  // Note: This could be extended to send to Google Analytics, Sentry, etc.
}

/**
 * Initialize Web Vitals monitoring
 * Call this once when the app starts
 */
export async function initWebVitals() {
  if (typeof window === "undefined") return;

  try {
    const { onCLS, onLCP, onFCP, onTTFB, onINP } = await import("web-vitals");

    // Report all Web Vitals
    // Note: FID has been replaced by INP in web-vitals v4+
    onCLS(reportMetric);
    onLCP(reportMetric);
    onFCP(reportMetric);
    onTTFB(reportMetric);
    onINP(reportMetric);

    logger.debug("performance", "Web Vitals monitoring initialized");
  } catch (error) {
    logger.error("performance", "Failed to initialize Web Vitals", { error });
  }
}

/**
 * Get all recorded Web Vitals metrics
 */
export function getWebVitalsMetrics() {
  if (typeof window === "undefined" || !("performance" in window)) {
    return [];
  }

  return performance
    .getEntriesByType("mark")
    .filter((entry) => entry.name.startsWith("web-vital:"))
    .map((entry) => ({
      name: entry.name.replace("web-vital:", ""),
      ...((entry as PerformanceMark).detail || {}),
      timestamp: entry.startTime,
    }));
}

/**
 * Get Web Vitals summary statistics
 */
export function getWebVitalsSummary() {
  const metrics = getWebVitalsMetrics();

  if (metrics.length === 0) {
    return null;
  }

  const summary: Record<
    string,
    { value: number; rating: Rating; timestamp: number }
  > = {};

  for (const metric of metrics) {
    if (
      metric.name &&
      !summary[metric.name] &&
      "value" in metric &&
      "rating" in metric &&
      "timestamp" in metric
    ) {
      summary[metric.name] = {
        value: metric.value as number,
        rating: metric.rating as Rating,
        timestamp: metric.timestamp as number,
      };
    }
  }

  return summary;
}
