/**
 * Meta-Analysis Visualization Components for STAR Evaluation
 * Advanced charts and visualizations for thesis-ready presentation
 */

import React, { useMemo } from "react";
import type { ComparisonResults } from "@academic-explorer/utils";

// Common color constants
const COLOR_GRAY_500 = "#6b7280";
const COLOR_GRAY_100 = "#f9fafb";
const COLOR_WHITE = "#ffffff";
const COLOR_BLUE_500 = "#3b82f6";
const COLOR_GREEN_500 = "#10b981";
const COLOR_RED_500 = "#ef4444";
const COLOR_AMBER_500 = "#f59e0b";
const COLOR_VIOLET_500 = "#8b5cf6";

// Common style constants
const BORDER_STYLE = "BORDER_STYLE";
const TABLE_HEADER_BORDER = "2px solid #e5e7eb";

interface MetaAnalysisChartsProps {
  comparisonResults: ComparisonResults[];
}

interface DatasetPerformanceData {
  datasetName: string;
  precision: number;
  recall: number;
  f1Score: number;
  truePositives: number;
  falsePositives: number;
  falseNegatives: number;
  additionalPapers: number;
  totalFound: number;
  totalGroundTruth: number;
}

/**
 * Performance Comparison Bar Chart
 * Shows precision, recall, and F1-score across all datasets
 */
export function PerformanceComparisonChart({
  comparisonResults,
}: MetaAnalysisChartsProps) {
  const chartData = useMemo(() => {
    return comparisonResults.map(
      (result): DatasetPerformanceData => ({
        datasetName: result.dataset.name,
        precision: result.precision,
        recall: result.recall,
        f1Score: result.f1Score,
        truePositives: result.truePositives.length,
        falsePositives: result.falsePositives.length,
        falseNegatives: result.falseNegatives.length,
        additionalPapers: result.additionalPapersFound.length,
        totalFound: result.academicExplorerResults.length,
        totalGroundTruth: result.dataset.includedPapers.length,
      }),
    );
  }, [comparisonResults]);

  if (chartData.length === 0) {
    return (
      <div
        style={{
          backgroundColor: COLOR_GRAY_100,
          border: "BORDER_STYLE",
          borderRadius: "8px",
          padding: "24px",
          textAlign: "center",
        }}
      >
        <p style={{ color: COLOR_GRAY_500 }}>
          No comparison results available for visualization
        </p>
      </div>
    );
  }

  const maxValue = Math.max(
    ...chartData.flatMap((d) => [d.precision, d.recall, d.f1Score]),
  );
  const chartHeight = Math.max(300, chartData.length * 80);

  return (
    <div
      style={{
        backgroundColor: "white",
        border: "BORDER_STYLE",
        borderRadius: "12px",
        padding: "24px",
      }}
    >
      <h3
        style={{
          fontSize: "18px",
          fontWeight: "600",
          color: "#1f2937",
          marginBottom: "16px",
        }}
      >
        Performance Comparison Across Datasets
      </h3>

      <div
        style={{
          height: `${String(chartHeight)}px`,
          display: "flex",
          flexDirection: "column",
          gap: "16px",
        }}
      >
        {chartData.map((dataset, index) => (
          <div
            key={dataset.datasetName || `dataset-${String(index)}`}
            style={{ display: "flex", alignItems: "center", gap: "16px" }}
          >
            {/* Dataset name */}
            <div
              style={{
                width: "200px",
                fontSize: "14px",
                fontWeight: "500",
                color: "#374151",
                textAlign: "right",
              }}
            >
              {dataset.datasetName}
            </div>

            {/* Bars container */}
            <div
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                gap: "4px",
              }}
            >
              {/* Precision bar */}
              <div
                style={{ display: "flex", alignItems: "center", gap: "8px" }}
              >
                <div
                  style={{
                    width: "60px",
                    fontSize: "12px",
                    color: COLOR_GRAY_500,
                    textAlign: "right",
                  }}
                >
                  Precision
                </div>
                <div
                  style={{
                    flex: 1,
                    height: "16px",
                    backgroundColor: "#f3f4f6",
                    borderRadius: "8px",
                    position: "relative",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      width: `${String((dataset.precision / maxValue) * 100)}%`,
                      height: "100%",
                      backgroundColor: COLOR_BLUE_500,
                      borderRadius: "8px",
                    }}
                  />
                </div>
                <div
                  style={{
                    width: "50px",
                    fontSize: "12px",
                    color: "#374151",
                    fontWeight: "600",
                  }}
                >
                  {(dataset.precision * 100).toFixed(1)}%
                </div>
              </div>

              {/* Recall bar */}
              <div
                style={{ display: "flex", alignItems: "center", gap: "8px" }}
              >
                <div
                  style={{
                    width: "60px",
                    fontSize: "12px",
                    color: COLOR_GRAY_500,
                    textAlign: "right",
                  }}
                >
                  Recall
                </div>
                <div
                  style={{
                    flex: 1,
                    height: "16px",
                    backgroundColor: "#f3f4f6",
                    borderRadius: "8px",
                    position: "relative",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      width: `${String((dataset.recall / maxValue) * 100)}%`,
                      height: "100%",
                      backgroundColor: COLOR_GREEN_500,
                      borderRadius: "8px",
                    }}
                  />
                </div>
                <div
                  style={{
                    width: "50px",
                    fontSize: "12px",
                    color: "#374151",
                    fontWeight: "600",
                  }}
                >
                  {(dataset.recall * 100).toFixed(1)}%
                </div>
              </div>

              {/* F1-Score bar */}
              <div
                style={{ display: "flex", alignItems: "center", gap: "8px" }}
              >
                <div
                  style={{
                    width: "60px",
                    fontSize: "12px",
                    color: COLOR_GRAY_500,
                    textAlign: "right",
                  }}
                >
                  F1-Score
                </div>
                <div
                  style={{
                    flex: 1,
                    height: "16px",
                    backgroundColor: "#f3f4f6",
                    borderRadius: "8px",
                    position: "relative",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      width: `${String((dataset.f1Score / maxValue) * 100)}%`,
                      height: "100%",
                      backgroundColor: COLOR_VIOLET_500,
                      borderRadius: "8px",
                    }}
                  />
                </div>
                <div
                  style={{
                    width: "50px",
                    fontSize: "12px",
                    color: "#374151",
                    fontWeight: "600",
                  }}
                >
                  {(dataset.f1Score * 100).toFixed(1)}%
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Precision-Recall Scatter Plot
 * Shows the precision-recall trade-off across datasets
 */
export function PrecisionRecallScatterPlot({
  comparisonResults,
}: MetaAnalysisChartsProps) {
  const plotData = useMemo(() => {
    return comparisonResults.map((result, index) => ({
      id: index,
      datasetName: result.dataset.name,
      precision: result.precision,
      recall: result.recall,
      f1Score: result.f1Score,
      totalPapers: result.dataset.includedPapers.length,
    }));
  }, [comparisonResults]);

  if (plotData.length === 0) {
    return (
      <div
        style={{
          backgroundColor: COLOR_GRAY_100,
          border: "BORDER_STYLE",
          borderRadius: "8px",
          padding: "24px",
          textAlign: "center",
        }}
      >
        <p style={{ color: COLOR_GRAY_500 }}>
          No comparison results available for scatter plot
        </p>
      </div>
    );
  }

  const plotSize = 300;
  const padding = 40;

  return (
    <div
      style={{
        backgroundColor: "white",
        border: "BORDER_STYLE",
        borderRadius: "12px",
        padding: "24px",
      }}
    >
      <h3
        style={{
          fontSize: "18px",
          fontWeight: "600",
          color: "#1f2937",
          marginBottom: "16px",
        }}
      >
        Precision-Recall Trade-off Analysis
      </h3>

      <div style={{ display: "flex", alignItems: "flex-start", gap: "24px" }}>
        {/* SVG Plot */}
        <svg
          width={plotSize + padding * 2}
          height={plotSize + padding * 2}
          style={{ border: "BORDER_STYLE", borderRadius: "8px" }}
        >
          {/* Grid lines */}
          <defs>
            <pattern
              id="grid"
              width="30"
              height="30"
              patternUnits="userSpaceOnUse"
            >
              <path
                d="M 30 0 L 0 0 0 30"
                fill="none"
                stroke="#f3f4f6"
                strokeWidth="1"
              />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />

          {/* Axes */}
          <line
            x1={padding}
            y1={padding}
            x2={padding}
            y2={plotSize + padding}
            stroke={COLOR_GRAY_500}
            strokeWidth="2"
          />
          <line
            x1={padding}
            y1={plotSize + padding}
            x2={plotSize + padding}
            y2={plotSize + padding}
            stroke={COLOR_GRAY_500}
            strokeWidth="2"
          />

          {/* Axis labels */}
          <text
            x={plotSize / 2 + padding}
            y={plotSize + padding + 30}
            textAnchor="middle"
            style={{ fontSize: "12px", fill: COLOR_GRAY_500 }}
          >
            Recall
          </text>
          <text
            x={20}
            y={plotSize / 2 + padding}
            textAnchor="middle"
            transform={`rotate(-90 20 ${String(plotSize / 2 + padding)})`}
            style={{ fontSize: "12px", fill: COLOR_GRAY_500 }}
          >
            Precision
          </text>

          {/* Data points */}
          {plotData.map((point) => {
            const x = padding + point.recall * plotSize;
            const y = padding + (plotSize - point.precision * plotSize);
            const radius = Math.max(4, Math.min(12, point.totalPapers / 20));

            return (
              <g key={point.id}>
                <circle
                  cx={x}
                  cy={y}
                  r={radius}
                  fill={COLOR_BLUE_500}
                  fillOpacity={0.7}
                  stroke="#1e40af"
                  strokeWidth={2}
                />
                <title>
                  {point.datasetName}: Precision=
                  {(point.precision * 100).toFixed(1)}%, Recall=
                  {(point.recall * 100).toFixed(1)}%, F1=
                  {(point.f1Score * 100).toFixed(1)}%
                </title>
              </g>
            );
          })}

          {/* Scale indicators */}
          {[0, 0.25, 0.5, 0.75, 1.0].map((tick) => (
            <g key={`scale-${String(tick)}`}>
              {/* X-axis ticks */}
              <line
                x1={padding + tick * plotSize}
                y1={plotSize + padding}
                x2={padding + tick * plotSize}
                y2={plotSize + padding + 5}
                stroke={COLOR_GRAY_500}
                strokeWidth="1"
              />
              <text
                x={padding + tick * plotSize}
                y={plotSize + padding + 18}
                textAnchor="middle"
                style={{ fontSize: "10px", fill: COLOR_GRAY_500 }}
              >
                {(tick * 100).toFixed(0)}%
              </text>

              {/* Y-axis ticks */}
              <line
                x1={padding - 5}
                y1={padding + plotSize - tick * plotSize}
                x2={padding}
                y2={padding + plotSize - tick * plotSize}
                stroke={COLOR_GRAY_500}
                strokeWidth="1"
              />
              <text
                x={padding - 12}
                y={padding + plotSize - tick * plotSize + 3}
                textAnchor="end"
                style={{ fontSize: "10px", fill: COLOR_GRAY_500 }}
              >
                {(tick * 100).toFixed(0)}%
              </text>
            </g>
          ))}
        </svg>

        {/* Legend */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "8px",
            maxWidth: "200px",
          }}
        >
          <h4
            style={{
              fontSize: "14px",
              fontWeight: "600",
              color: "#374151",
              marginBottom: "8px",
            }}
          >
            Datasets
          </h4>
          {plotData.map((point, index) => (
            <div
              key={point.datasetName || `point-${String(index)}`}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                fontSize: "12px",
                color: COLOR_GRAY_500,
              }}
            >
              <div
                style={{
                  width: "8px",
                  height: "8px",
                  borderRadius: "50%",
                  backgroundColor: COLOR_BLUE_500,
                  border: "1px solid #1e40af",
                }}
              />
              <span
                style={{
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {point.datasetName}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div
        style={{
          marginTop: "16px",
          fontSize: "12px",
          color: COLOR_GRAY_500,
          fontStyle: "italic",
        }}
      >
        Circle size represents dataset size. Hover over points for detailed
        metrics.
      </div>
    </div>
  );
}

/**
 * Confusion Matrix Heatmap
 * Visual representation of true/false positives/negatives
 */
export function ConfusionMatrixHeatmap({
  comparisonResults,
}: MetaAnalysisChartsProps) {
  const aggregatedData = useMemo(() => {
    if (comparisonResults.length === 0) return null;

    const totals = comparisonResults.reduce(
      (acc, result) => ({
        truePositives: acc.truePositives + result.truePositives.length,
        falsePositives: acc.falsePositives + result.falsePositives.length,
        falseNegatives: acc.falseNegatives + result.falseNegatives.length,
        trueNegatives: acc.trueNegatives, // This would need more sophisticated calculation
      }),
      {
        truePositives: 0,
        falsePositives: 0,
        falseNegatives: 0,
        trueNegatives: 0,
      },
    );

    const total =
      totals.truePositives + totals.falsePositives + totals.falseNegatives;

    return {
      ...totals,
      total,
      tpRate: total > 0 ? totals.truePositives / total : 0,
      fpRate: total > 0 ? totals.falsePositives / total : 0,
      fnRate: total > 0 ? totals.falseNegatives / total : 0,
    };
  }, [comparisonResults]);

  if (!aggregatedData) {
    return (
      <div
        style={{
          backgroundColor: COLOR_GRAY_100,
          border: "BORDER_STYLE",
          borderRadius: "8px",
          padding: "24px",
          textAlign: "center",
        }}
      >
        <p style={{ color: COLOR_GRAY_500 }}>
          No comparison results available for confusion matrix
        </p>
      </div>
    );
  }

  const cellSize = 80;

  return (
    <div
      style={{
        backgroundColor: "white",
        border: "BORDER_STYLE",
        borderRadius: "12px",
        padding: "24px",
      }}
    >
      <h3
        style={{
          fontSize: "18px",
          fontWeight: "600",
          color: "#1f2937",
          marginBottom: "16px",
        }}
      >
        Aggregated Confusion Matrix
      </h3>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "32px",
        }}
      >
        {/* Matrix */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          {/* Column headers */}
          <div style={{ display: "flex", marginBottom: "8px" }}>
            <div style={{ width: cellSize }} />
            <div
              style={{
                width: cellSize,
                textAlign: "center",
                fontSize: "12px",
                fontWeight: "600",
                color: "#374151",
              }}
            >
              Relevant
            </div>
            <div
              style={{
                width: cellSize,
                textAlign: "center",
                fontSize: "12px",
                fontWeight: "600",
                color: "#374151",
              }}
            >
              Not Relevant
            </div>
          </div>

          {/* Retrieved row */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              marginBottom: "4px",
            }}
          >
            <div
              style={{
                width: cellSize,
                textAlign: "center",
                fontSize: "12px",
                fontWeight: "600",
                color: "#374151",
                transform: "rotate(-90deg)",
              }}
            >
              Retrieved
            </div>
            {/* True Positives */}
            <div
              style={{
                width: cellSize,
                height: cellSize,
                backgroundColor: COLOR_GREEN_500,
                color: "white",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                border: "2px solid COLOR_GREEN_700",
                fontSize: "12px",
                fontWeight: "600",
              }}
            >
              <div>TP</div>
              <div>{aggregatedData.truePositives}</div>
            </div>
            {/* False Positives */}
            <div
              style={{
                width: cellSize,
                height: cellSize,
                backgroundColor: COLOR_RED_500,
                color: "white",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                border: "2px solid COLOR_RED_600",
                fontSize: "12px",
                fontWeight: "600",
              }}
            >
              <div>FP</div>
              <div>{aggregatedData.falsePositives}</div>
            </div>
          </div>

          {/* Not Retrieved row */}
          <div style={{ display: "flex", alignItems: "center" }}>
            <div
              style={{
                width: cellSize,
                textAlign: "center",
                fontSize: "12px",
                fontWeight: "600",
                color: "#374151",
                transform: "rotate(-90deg)",
              }}
            >
              Not Retrieved
            </div>
            {/* False Negatives */}
            <div
              style={{
                width: cellSize,
                height: cellSize,
                backgroundColor: COLOR_AMBER_500,
                color: "white",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                border: "2px solid COLOR_AMBER_600",
                fontSize: "12px",
                fontWeight: "600",
              }}
            >
              <div>FN</div>
              <div>{aggregatedData.falseNegatives}</div>
            </div>
            {/* True Negatives (not applicable for our use case) */}
            <div
              style={{
                width: cellSize,
                height: cellSize,
                backgroundColor: COLOR_GRAY_500,
                color: "white",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                border: "2px solid COLOR_GRAY_600",
                fontSize: "12px",
                fontWeight: "600",
              }}
            >
              <div>TN</div>
              <div>N/A</div>
            </div>
          </div>
        </div>

        {/* Legend and metrics */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "16px",
            maxWidth: "200px",
          }}
        >
          <div>
            <h4
              style={{
                fontSize: "14px",
                fontWeight: "600",
                color: "#374151",
                marginBottom: "8px",
              }}
            >
              Legend
            </h4>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "4px",
                fontSize: "12px",
              }}
            >
              <div style={{ color: COLOR_GREEN_500 }}>
                TP: Correctly retrieved papers
              </div>
              <div style={{ color: COLOR_RED_500 }}>
                FP: Incorrectly retrieved papers
              </div>
              <div style={{ color: COLOR_AMBER_500 }}>
                FN: Missed relevant papers
              </div>
              <div style={{ color: COLOR_GRAY_500 }}>
                TN: Not applicable in IR context
              </div>
            </div>
          </div>

          <div>
            <h4
              style={{
                fontSize: "14px",
                fontWeight: "600",
                color: "#374151",
                marginBottom: "8px",
              }}
            >
              Summary
            </h4>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "4px",
                fontSize: "12px",
              }}
            >
              <div>Total Papers: {aggregatedData.total}</div>
              <div>
                Precision:{" "}
                {(
                  (aggregatedData.truePositives /
                    (aggregatedData.truePositives +
                      aggregatedData.falsePositives)) *
                  100
                ).toFixed(1)}
                %
              </div>
              <div>
                Recall:{" "}
                {(
                  (aggregatedData.truePositives /
                    (aggregatedData.truePositives +
                      aggregatedData.falseNegatives)) *
                  100
                ).toFixed(1)}
                %
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Dataset Statistics Overview
 * Shows key statistics about the datasets being compared
 */
export function DatasetStatisticsOverview({
  comparisonResults,
}: MetaAnalysisChartsProps) {
  const statisticsData = useMemo(() => {
    if (comparisonResults.length === 0) return null;

    return comparisonResults.map((result) => ({
      name: result.dataset.name,
      originalPapers: result.dataset.originalPaperCount,
      includedPapers: result.dataset.includedPapers.length,
      excludedPapers: result.dataset.excludedPapers.length,
      academicExplorerFound: result.academicExplorerResults.length,
      coverage:
        result.academicExplorerResults.length /
        result.dataset.originalPaperCount,
      precision: result.precision,
      recall: result.recall,
      f1Score: result.f1Score,
      additionalPapers: result.additionalPapersFound.length,
    }));
  }, [comparisonResults]);

  if (!statisticsData) {
    return (
      <div
        style={{
          backgroundColor: COLOR_GRAY_100,
          border: "BORDER_STYLE",
          borderRadius: "8px",
          padding: "24px",
          textAlign: "center",
        }}
      >
        <p style={{ color: COLOR_GRAY_500 }}>
          No comparison results available for statistics overview
        </p>
      </div>
    );
  }

  return (
    <div
      style={{
        backgroundColor: "white",
        border: "BORDER_STYLE",
        borderRadius: "12px",
        padding: "24px",
      }}
    >
      <h3
        style={{
          fontSize: "18px",
          fontWeight: "600",
          color: "#1f2937",
          marginBottom: "16px",
        }}
      >
        Dataset Statistics Overview
      </h3>

      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th
                style={{
                  textAlign: "left",
                  padding: "12px 8px",
                  borderBottom: "TABLE_HEADER_BORDER",
                  fontSize: "12px",
                  fontWeight: "600",
                  color: "#374151",
                }}
              >
                Dataset
              </th>
              <th
                style={{
                  textAlign: "right",
                  padding: "12px 8px",
                  borderBottom: "TABLE_HEADER_BORDER",
                  fontSize: "12px",
                  fontWeight: "600",
                  color: "#374151",
                }}
              >
                Original
              </th>
              <th
                style={{
                  textAlign: "right",
                  padding: "12px 8px",
                  borderBottom: "TABLE_HEADER_BORDER",
                  fontSize: "12px",
                  fontWeight: "600",
                  color: "#374151",
                }}
              >
                Included
              </th>
              <th
                style={{
                  textAlign: "right",
                  padding: "12px 8px",
                  borderBottom: "TABLE_HEADER_BORDER",
                  fontSize: "12px",
                  fontWeight: "600",
                  color: "#374151",
                }}
              >
                AE Found
              </th>
              <th
                style={{
                  textAlign: "right",
                  padding: "12px 8px",
                  borderBottom: "TABLE_HEADER_BORDER",
                  fontSize: "12px",
                  fontWeight: "600",
                  color: "#374151",
                }}
              >
                Coverage
              </th>
              <th
                style={{
                  textAlign: "right",
                  padding: "12px 8px",
                  borderBottom: "TABLE_HEADER_BORDER",
                  fontSize: "12px",
                  fontWeight: "600",
                  color: "#374151",
                }}
              >
                Precision
              </th>
              <th
                style={{
                  textAlign: "right",
                  padding: "12px 8px",
                  borderBottom: "TABLE_HEADER_BORDER",
                  fontSize: "12px",
                  fontWeight: "600",
                  color: "#374151",
                }}
              >
                Recall
              </th>
              <th
                style={{
                  textAlign: "right",
                  padding: "12px 8px",
                  borderBottom: "TABLE_HEADER_BORDER",
                  fontSize: "12px",
                  fontWeight: "600",
                  color: "#374151",
                }}
              >
                F1-Score
              </th>
              <th
                style={{
                  textAlign: "right",
                  padding: "12px 8px",
                  borderBottom: "TABLE_HEADER_BORDER",
                  fontSize: "12px",
                  fontWeight: "600",
                  color: "#374151",
                }}
              >
                Additional
              </th>
            </tr>
          </thead>
          <tbody>
            {statisticsData.map((row, index) => (
              <tr
                key={row.name || `row-${String(index)}`}
                style={{
                  backgroundColor:
                    index % 2 === 0 ? COLOR_WHITE : COLOR_GRAY_100,
                }}
              >
                <td
                  style={{
                    padding: "12px 8px",
                    fontSize: "14px",
                    color: "#374151",
                    maxWidth: "150px",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {row.name}
                </td>
                <td
                  style={{
                    textAlign: "right",
                    padding: "12px 8px",
                    fontSize: "14px",
                    color: COLOR_GRAY_500,
                  }}
                >
                  {row.originalPapers.toLocaleString()}
                </td>
                <td
                  style={{
                    textAlign: "right",
                    padding: "12px 8px",
                    fontSize: "14px",
                    color: COLOR_GRAY_500,
                  }}
                >
                  {row.includedPapers.toLocaleString()}
                </td>
                <td
                  style={{
                    textAlign: "right",
                    padding: "12px 8px",
                    fontSize: "14px",
                    color: "#374151",
                    fontWeight: "600",
                  }}
                >
                  {row.academicExplorerFound.toLocaleString()}
                </td>
                <td
                  style={{
                    textAlign: "right",
                    padding: "12px 8px",
                    fontSize: "14px",
                    color: row.coverage > 1 ? COLOR_AMBER_500 : COLOR_GRAY_500,
                  }}
                >
                  {(row.coverage * 100).toFixed(1)}%
                </td>
                <td
                  style={{
                    textAlign: "right",
                    padding: "12px 8px",
                    fontSize: "14px",
                    color: COLOR_BLUE_500,
                    fontWeight: "600",
                  }}
                >
                  {(row.precision * 100).toFixed(1)}%
                </td>
                <td
                  style={{
                    textAlign: "right",
                    padding: "12px 8px",
                    fontSize: "14px",
                    color: COLOR_GREEN_500,
                    fontWeight: "600",
                  }}
                >
                  {(row.recall * 100).toFixed(1)}%
                </td>
                <td
                  style={{
                    textAlign: "right",
                    padding: "12px 8px",
                    fontSize: "14px",
                    color: COLOR_VIOLET_500,
                    fontWeight: "600",
                  }}
                >
                  {(row.f1Score * 100).toFixed(1)}%
                </td>
                <td
                  style={{
                    textAlign: "right",
                    padding: "12px 8px",
                    fontSize: "14px",
                    color: COLOR_AMBER_500,
                    fontWeight: "600",
                  }}
                >
                  +{row.additionalPapers}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div
        style={{
          marginTop: "16px",
          fontSize: "12px",
          color: COLOR_GRAY_500,
          fontStyle: "italic",
        }}
      >
        AE Found = Academic Explorer Found, Coverage = (AE Found / Original) ×
        100%
      </div>
    </div>
  );
}
