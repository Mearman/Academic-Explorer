#!/bin/bash

# DRY Audit Report Generator
# Aggregates JSON outputs from .tmp/dry-audit into a Markdown digest

set -euo pipefail

DRY_AUDIT_DIR=".tmp/dry-audit"
OUTPUT_FILE="$DRY_AUDIT_DIR/README.md"

# Ensure output directory exists
mkdir -p "$DRY_AUDIT_DIR"

# Function to generate relative links to files
generate_file_link() {
    local file_path="$1"
    # Convert absolute paths to relative and create markdown links
    if [[ -f "$file_path" ]]; then
        echo "[$file_path]($file_path)"
    else
        echo "$file_path"
    fi
}

# Function to process knip JSON output
process_knip_report() {
    local json_file="$1"
    if [[ ! -s "$json_file" ]]; then
        echo "## Knip Analysis"
        echo "No unused dependencies or files detected."
        return
    fi

    echo "## Knip Analysis (Unused Dependencies & Files)"
    echo ""

    # Parse JSON and extract issues
    if command -v jq >/dev/null 2>&1; then
        # Count total issues
        local unused_files=$(jq -r '.files // [] | length' "$json_file" 2>/dev/null || echo "0")
        local unused_deps=$(jq -r '.dependencies // [] | length' "$json_file" 2>/dev/null || echo "0")

        echo "**Summary:** $unused_files unused files, $unused_deps unused dependencies"
        echo ""

        # List unused files
        if [[ "$unused_files" -gt 0 ]]; then
            echo "### Unused Files"
            jq -r '.files // [] | .[]' "$json_file" 2>/dev/null | while read -r file; do
                echo "- $(generate_file_link "$file")"
            done
            echo ""
        fi

        # List unused dependencies
        if [[ "$unused_deps" -gt 0 ]]; then
            echo "### Unused Dependencies"
            jq -r '.dependencies // [] | .[]' "$json_file" 2>/dev/null | while read -r dep; do
                echo "- \`$dep\`"
            done
            echo ""
        fi
    else
        echo "⚠️  jq not available - install jq to parse JSON reports"
        echo "Raw content preview:"
        head -20 "$json_file"
        echo ""
    fi
}

# Function to process dependency-cruiser JSON output
process_depcruise_report() {
    local json_file="$1"
    if [[ ! -s "$json_file" ]]; then
        echo "## Dependency Cruiser Analysis"
        echo "No dependency violations detected."
        return
    fi

    echo "## Dependency Cruiser Analysis (Architecture Violations)"
    echo ""

    if command -v jq >/dev/null 2>&1; then
        # Count violations
        local violations=$(jq -r '.summary.violations // [] | length' "$json_file" 2>/dev/null || echo "0")

        echo "**Summary:** $violations architecture violations"
        echo ""

        if [[ "$violations" -gt 0 ]]; then
            echo "### Violations"
            jq -r '.summary.violations // [] | .[] | "- \(.rule.name): \(.from) → \(.to)"' "$json_file" 2>/dev/null || echo "Unable to parse violations"
            echo ""
        fi
    else
        echo "⚠️  jq not available - install jq to parse JSON reports"
        echo "Raw content preview:"
        head -20 "$json_file"
        echo ""
    fi
}

# Function to process JSCPD (code duplication) JSON output
process_jscpd_report() {
    local json_file="$1"
    if [[ ! -s "$json_file" ]]; then
        echo "## Code Duplication Analysis (JSCPD)"
        echo "No code duplication detected."
        return
    fi

    echo "## Code Duplication Analysis (JSCPD)"
    echo ""

    if command -v jq >/dev/null 2>&1; then
        # Count duplicates
        local duplicates=$(jq -r '.duplicates // [] | length' "$json_file" 2>/dev/null || echo "0")

        echo "**Summary:** $duplicates duplicate code blocks found"
        echo ""

        if [[ "$duplicates" -gt 0 ]]; then
            echo "### Duplicate Blocks"
            jq -r '.duplicates // [] | .[] | "- **\(.percentage)%** similarity: \(.firstFile) ↔ \(.secondFile)"' "$json_file" 2>/dev/null | head -10
            if [[ $(jq -r '.duplicates // [] | length' "$json_file" 2>/dev/null) -gt 10 ]]; then
                echo "- ... and more (showing first 10)"
            fi
            echo ""
        fi
    else
        echo "⚠️  jq not available - install jq to parse JSON reports"
        echo "Raw content preview:"
        head -20 "$json_file"
        echo ""
    fi
}

# Function to process coverage JSON
process_coverage_report() {
    local json_file="$1"
    if [[ ! -s "$json_file" ]]; then
        echo "## Test Coverage"
        echo "No coverage data available."
        return
    fi

    echo "## Test Coverage Summary"
    echo ""

    if command -v jq >/dev/null 2>&1; then
        # Extract coverage metrics
        local total_lines=$(jq -r '.total.lines.pct // "N/A"' "$json_file" 2>/dev/null || echo "N/A")
        local total_functions=$(jq -r '.total.functions.pct // "N/A"' "$json_file" 2>/dev/null || echo "N/A")
        local total_branches=$(jq -r '.total.branches.pct // "N/A"' "$json_file" 2>/dev/null || echo "N/A")
        local total_statements=$(jq -r '.total.statements.pct // "N/A"' "$json_file" 2>/dev/null || echo "N/A")

        echo "| Metric | Coverage |"
        echo "|--------|----------|"
        echo "| Lines | $total_lines% |"
        echo "| Functions | $total_functions% |"
        echo "| Branches | $total_branches% |"
        echo "| Statements | $total_statements% |"
        echo ""
    else
        echo "⚠️  jq not available - install jq to parse JSON reports"
        echo "Raw content preview:"
        head -20 "$json_file"
        echo ""
    fi
}

# Generate the report
{
    echo "# DRY Audit Report"
    echo ""
    echo "Generated on: $(date)"
    echo ""
    echo "This report aggregates analysis from various tools to identify duplication and maintainability issues."
    echo ""

    # Process each report type
    if [[ -f "$DRY_AUDIT_DIR/knip-baseline.json" ]]; then
        process_knip_report "$DRY_AUDIT_DIR/knip-baseline.json"
    fi

    if [[ -f "$DRY_AUDIT_DIR/depcruise-baseline.json" ]]; then
        process_depcruise_report "$DRY_AUDIT_DIR/depcruise-baseline.json"
    fi

    if [[ -f "$DRY_AUDIT_DIR/jscpd-report.json" ]]; then
        process_jscpd_report "$DRY_AUDIT_DIR/jscpd-report.json"
    fi

    # Look for coverage files
    for coverage_file in "$DRY_AUDIT_DIR"/coverage*.json; do
        if [[ -f "$coverage_file" ]]; then
            process_coverage_report "$coverage_file"
            break  # Only process the first coverage file found
        fi
    done

    echo "## Recommendations"
    echo ""
    echo "1. **Review unused files** - Consider removing or documenting why they're kept"
    echo "2. **Address architecture violations** - Fix dependency rule violations"
    echo "3. **Reduce code duplication** - Extract common patterns into shared utilities"
    echo "4. **Improve test coverage** - Target areas with low coverage for additional tests"
    echo ""
    echo "---"
    echo "*Report generated by scripts/report-dry.sh*"

} > "$OUTPUT_FILE"

echo "DRY audit report generated: $OUTPUT_FILE"