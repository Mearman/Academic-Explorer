import { createLazyFileRoute } from "@tanstack/react-router";
/**
 * Main evaluation dashboard for STAR methodology integration
 * Provides PhD thesis evaluation capabilities using systematic literature reviews
 */

import { logger } from "@academic-explorer/utils/logger";
import {
  IconBulb,
  IconChartBar,
  IconSearch,
  IconTrendingUp,
} from "@tabler/icons-react";
import { useNavigate } from "@tanstack/react-router";

// Style constants
const BORDER_COLOR_GRAY = "#e5e7eb";
const BORDER_STYLE = `1px solid ${BORDER_COLOR_GRAY}`;
export const Route = createLazyFileRoute("/evaluation")({
  component: EvaluationDashboard,
});

const BOX_SHADOW =
  "0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)";

function EvaluationDashboard() {
  const navigate = useNavigate();

  return (
    <div style={{ padding: "24px", maxWidth: "1200px", margin: "0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom: "32px" }}>
        <h1
          style={{
            fontSize: "32px",
            fontWeight: "bold",
            color: "#1f2937",
            marginBottom: "8px",
          }}
        >
          STAR Methodology Evaluation
        </h1>
        <p
          style={{
            fontSize: "16px",
            color: "#6b7280",
            lineHeight: "1.6",
            maxWidth: "800px",
          }}
        >
          Evaluate Academic Explorer&apos;s literature discovery capabilities
          against published systematic literature reviews using the STAR
          (Systematic Literature Review) methodology. This provides quantitative
          metrics for precision, recall, and F1-score analysis required for PhD
          thesis evaluation.
        </p>
      </div>

      {/* Dashboard Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
          gap: "24px",
          marginBottom: "32px",
        }}
      >
        {/* Datasets Card */}
        <div
          style={{
            backgroundColor: "white",
            borderRadius: "12px",
            border: BORDER_STYLE,
            padding: "24px",
            boxShadow: BOX_SHADOW,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              marginBottom: "16px",
            }}
          >
            <div
              style={{
                backgroundColor: "#dbeafe",
                borderRadius: "8px",
                padding: "8px",
                marginRight: "12px",
              }}
            >
              <IconChartBar size={20} />
            </div>
            <h3
              style={{
                fontSize: "18px",
                fontWeight: "600",
                color: "#1f2937",
                margin: 0,
              }}
            >
              STAR Datasets
            </h3>
          </div>
          <p
            style={{
              color: "#6b7280",
              marginBottom: "16px",
              lineHeight: "1.5",
            }}
          >
            Upload and manage systematic literature review datasets for ground
            truth comparison
          </p>
          <button
            onClick={() => {
              logger.debug(
                "ui",
                "Navigate to datasets clicked",
                {},
                "EvaluationDashboard",
              );
              void navigate({ to: "/evaluation/datasets" });
            }}
            style={{
              backgroundColor: "#3b82f6",
              color: "white",
              padding: "8px 16px",
              borderRadius: "6px",
              border: "none",
              fontSize: "14px",
              fontWeight: "500",
              cursor: "pointer",
              transition: "background-color 0.2s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "#2563eb";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "#3b82f6";
            }}
          >
            Manage Datasets
          </button>
        </div>

        {/* Comparison Card */}
        <div
          style={{
            backgroundColor: "white",
            borderRadius: "12px",
            border: BORDER_STYLE,
            padding: "24px",
            boxShadow: BOX_SHADOW,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              marginBottom: "16px",
            }}
          >
            <div
              style={{
                backgroundColor: "#dcfce7",
                borderRadius: "8px",
                padding: "8px",
                marginRight: "12px",
              }}
            >
              <IconSearch size={20} />
            </div>
            <h3
              style={{
                fontSize: "18px",
                fontWeight: "600",
                color: "#1f2937",
                margin: 0,
              }}
            >
              Run Comparisons
            </h3>
          </div>
          <p
            style={{
              color: "#6b7280",
              marginBottom: "16px",
              lineHeight: "1.5",
            }}
          >
            Execute Academic Explorer searches against STAR datasets and
            calculate precision/recall metrics
          </p>
          <button
            disabled
            style={{
              backgroundColor: "#9ca3af",
              color: "white",
              padding: "8px 16px",
              borderRadius: "6px",
              border: "none",
              fontSize: "14px",
              fontWeight: "500",
              cursor: "not-allowed",
            }}
          >
            Start Comparison
          </button>
          <p style={{ fontSize: "12px", color: "#9ca3af", marginTop: "8px" }}>
            Requires datasets to be uploaded first
          </p>
        </div>

        {/* Results Card */}
        <div
          style={{
            backgroundColor: "white",
            borderRadius: "12px",
            border: BORDER_STYLE,
            padding: "24px",
            boxShadow: BOX_SHADOW,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              marginBottom: "16px",
            }}
          >
            <div
              style={{
                backgroundColor: "#fef3c7",
                borderRadius: "8px",
                padding: "8px",
                marginRight: "12px",
              }}
            >
              <IconTrendingUp size={20} />
            </div>
            <h3
              style={{
                fontSize: "18px",
                fontWeight: "600",
                color: "#1f2937",
                margin: 0,
              }}
            >
              Results & Analytics
            </h3>
          </div>
          <p
            style={{
              color: "#6b7280",
              marginBottom: "16px",
              lineHeight: "1.5",
            }}
          >
            View detailed comparison results, precision/recall charts, and
            thesis-ready statistics
          </p>
          <button
            disabled
            style={{
              backgroundColor: "#9ca3af",
              color: "white",
              padding: "8px 16px",
              borderRadius: "6px",
              border: "none",
              fontSize: "14px",
              fontWeight: "500",
              cursor: "not-allowed",
            }}
          >
            View Results
          </button>
          <p style={{ fontSize: "12px", color: "#9ca3af", marginTop: "8px" }}>
            No comparison results available yet
          </p>
        </div>
      </div>

      {/* Methodology Information */}
      <div
        style={{
          backgroundColor: "#f9fafb",
          borderRadius: "12px",
          border: BORDER_STYLE,
          padding: "24px",
        }}
      >
        <h2
          style={{
            fontSize: "20px",
            fontWeight: "600",
            color: "#1f2937",
            marginBottom: "16px",
          }}
        >
          STAR Methodology Overview
        </h2>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
            gap: "20px",
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
              1. Dataset Upload
            </h4>
            <p
              style={{
                fontSize: "13px",
                color: "#6b7280",
                lineHeight: "1.4",
                margin: 0,
              }}
            >
              Import existing systematic literature reviews as CSV/JSON with
              included/excluded papers
            </p>
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
              2. Search Replication
            </h4>
            <p
              style={{
                fontSize: "13px",
                color: "#6b7280",
                lineHeight: "1.4",
                margin: 0,
              }}
            >
              Run Academic Explorer searches using original STAR search criteria
              and strategies
            </p>
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
              3. Paper Matching
            </h4>
            <p
              style={{
                fontSize: "13px",
                color: "#6b7280",
                lineHeight: "1.4",
                margin: 0,
              }}
            >
              Match discovered papers to ground truth using DOI, title, and
              OpenAlex ID fuzzy matching
            </p>
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
              4. Metrics Calculation
            </h4>
            <p
              style={{
                fontSize: "13px",
                color: "#6b7280",
                lineHeight: "1.4",
                margin: 0,
              }}
            >
              Calculate precision, recall, F1-score, and identify additional
              papers for innovation metrics
            </p>
          </div>
        </div>

        <div
          style={{
            marginTop: "20px",
            padding: "16px",
            backgroundColor: "white",
            borderRadius: "8px",
            border: BORDER_STYLE,
          }}
        >
          <p
            style={{
              fontSize: "13px",
              color: "#374151",
              margin: 0,
              fontStyle: "italic",
            }}
          >
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
              }}
            >
              <IconBulb size={14} />
              <strong>PhD Evaluation Context:</strong>
            </span>{" "}
            This evaluation demonstrates Academic Explorer&apos;s ability to
            improve upon existing systematic reviews by identifying previously
            missed papers and providing more efficient literature discovery
            pathways. Results provide quantitative evidence for thesis Chapter 6
            evaluation.
          </p>
        </div>
      </div>
    </div>
  );
}

export default EvaluationDashboard;
