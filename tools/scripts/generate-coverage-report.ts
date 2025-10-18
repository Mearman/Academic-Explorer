#!/usr/bin/env npx tsx
/**
 * Generate coverage report for GitHub Actions
 * Reads coverage-summary.json and outputs formatted report
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const THRESHOLDS = {
  lines: 80,
  functions: 80,
  branches: 75,
  statements: 80,
} as const;

const TABLE_HEADER = "| Metric | Coverage | Status |";
const TABLE_SEPARATOR = "|--------|----------|--------|";

interface CoverageMetric {
  pct: number;
}

interface CoverageData {
  total: {
    lines: CoverageMetric;
    functions: CoverageMetric;
    branches: CoverageMetric;
    statements: CoverageMetric;
  };
}

interface Metric {
  name: string;
  key: keyof typeof THRESHOLDS;
  actual: number;
  threshold: number;
}

type ReportFormat = "summary" | "pr-comment";

function getStatusIcon({
  actual,
  threshold,
}: {
  actual: number;
  threshold: number;
}): string {
  return actual >= threshold ? "[SUCCESS]" : "[ERROR]";
}

function getStatusText({
  actual,
  threshold,
}: {
  actual: number;
  threshold: number;
}): string {
  return actual >= threshold ? "Pass" : "Fail";
}

function generateReport({
  coverageData,
  format = "summary",
}: {
  coverageData: CoverageData;
  format?: ReportFormat;
}): void {
  const { total } = coverageData;

  const metrics: Metric[] = [
    {
      name: "Lines",
      key: "lines",
      actual: total.lines.pct,
      threshold: THRESHOLDS.lines,
    },
    {
      name: "Functions",
      key: "functions",
      actual: total.functions.pct,
      threshold: THRESHOLDS.functions,
    },
    {
      name: "Branches",
      key: "branches",
      actual: total.branches.pct,
      threshold: THRESHOLDS.branches,
    },
    {
      name: "Statements",
      key: "statements",
      actual: total.statements.pct,
      threshold: THRESHOLDS.statements,
    },
  ];

  if (format === "summary") {
    console.log(TABLE_HEADER);
    console.log(TABLE_SEPARATOR);

    metrics.forEach((metric) => {
      const icon = getStatusIcon({
        actual: metric.actual,
        threshold: metric.threshold,
      });
      console.log(`| ${metric.name} | ${metric.actual}% | ${icon} |`);
    });
  } else if (format === "pr-comment") {
    console.log("## Coverage Report\n");
    console.log(TABLE_HEADER);
    console.log(TABLE_SEPARATOR);

    metrics.forEach((metric) => {
      const status = `${getStatusIcon({ actual: metric.actual, threshold: metric.threshold })} ${getStatusText({ actual: metric.actual, threshold: metric.threshold })}`;
      console.log(`| ${metric.name} | ${metric.actual}% | ${status} |`);
    });

    console.log(
      `\n**Thresholds:** Lines ≥${THRESHOLDS.lines}%, Functions ≥${THRESHOLDS.functions}%, Branches ≥${THRESHOLDS.branches}%, Statements ≥${THRESHOLDS.statements}%`,
    );
  }
}

function main(): void {
  const format = (process.argv[2] || "summary") as ReportFormat;
  const coverageFile =
    process.argv[3] || "coverage-reports/coverage-summary.json";

  if (!fs.existsSync(coverageFile)) {
    console.error(`Coverage file not found: ${coverageFile}`);
    if (format === "summary") {
      console.log(TABLE_HEADER);
      console.log(TABLE_SEPARATOR);
      console.log("| No coverage data | - | [ERROR] |");
    } else {
      console.log("## Coverage Report\n\n[ERROR] No coverage data found");
    }
    process.exit(1);
  }

  try {
    const coverageData: CoverageData = JSON.parse(
      fs.readFileSync(coverageFile, "utf8"),
    );
    generateReport({ coverageData, format });
  } catch (error) {
    console.error(`Error reading coverage file: ${(error as Error).message}`);
    process.exit(1);
  }
}

// ES module - check if this file is being run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { generateReport, THRESHOLDS };
export type { CoverageData, ReportFormat };
