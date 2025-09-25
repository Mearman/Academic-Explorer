#!/bin/bash
# CI Performance Quick Reference Script
# Provides quick access to CI optimization commands and status

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

print_header() {
    echo "=================================="
    echo "  CI Performance Quick Reference"
    echo "=================================="
}

print_usage() {
    cat << EOF
Usage: $0 <command>

Commands:
  status       - Show current CI status and performance metrics
  cache        - Display cache status and optimization tips
  affected     - Show affected projects for current changes
  parallel     - Test optimal parallelization settings
  benchmark    - Run local performance benchmarks
  validate     - Validate Nx configuration for CI optimization
  clean        - Clean caches and reset for fresh CI test
  monitor      - Monitor current CI run (if any)
  help         - Show this help message

Examples:
  $0 status              # Check CI performance status
  $0 affected            # See what projects are affected
  $0 benchmark           # Run local performance tests
  $0 validate            # Validate configuration
EOF
}

check_affected() {
    echo "🔍 Checking affected projects..."
    cd "$REPO_ROOT"

    if ! command -v pnpm &> /dev/null; then
        echo "❌ pnpm not found. Please install pnpm first."
        exit 1
    fi

    affected=$(pnpm nx show projects --affected --json 2>/dev/null || echo '[]')
    count=$(echo "$affected" | jq 'length')

    echo "📊 Affected projects: $count"
    if [ "$count" -gt 0 ]; then
        echo "$affected" | jq -r '.[]' | while read -r project; do
            echo "  - $project"
        done
    else
        echo "  No affected projects found"
    fi

    # Estimate CI time based on affected projects
    if [ "$count" -gt 0 ]; then
        est_serial=$((count * 3))  # ~3min per project serially
        est_parallel=$((count / 8 + 1))  # 8-way parallelism
        est_parallel=$((est_parallel * 3))

        echo ""
        echo "⏱️  Estimated CI time:"
        echo "   Serial execution: ~${est_serial} minutes"
        echo "   Parallel (8-way): ~${est_parallel} minutes"
    fi
}

show_cache_status() {
    echo "💾 Nx Cache Status..."
    cd "$REPO_ROOT"

    if [ -d ".nx/cache" ]; then
        cache_size=$(du -sh .nx/cache 2>/dev/null | cut -f1)
        cache_files=$(find .nx/cache -type f 2>/dev/null | wc -l | tr -d ' ')
        echo "  Local cache size: $cache_size"
        echo "  Cached operations: $cache_files"
    else
        echo "  No local cache found"
    fi

    # Check if Nx Cloud is configured
    if grep -q "nx-cloud" nx.json 2>/dev/null; then
        echo "✅ Nx Cloud configured (distributed caching enabled)"
    else
        echo "⚠️  Nx Cloud not configured (local caching only)"
    fi

    echo ""
    echo "🚀 Cache optimization tips:"
    echo "  1. Enable Nx Cloud for distributed caching across CI runs"
    echo "  2. Use proper input/output configuration for tasks"
    echo "  3. Avoid cache invalidation with unstable inputs"
    echo "  4. Use 'nx reset' to clear stale cache if needed"
}

run_benchmarks() {
    echo "🏃 Running local performance benchmarks..."
    cd "$REPO_ROOT"

    echo ""
    echo "1. Testing typecheck performance..."
    time pnpm nx run-many -t typecheck --parallel=8 2>/dev/null || echo "  Typecheck benchmark failed"

    echo ""
    echo "2. Testing lint performance..."
    time pnpm nx run-many -t lint --parallel=8 2>/dev/null || echo "  Lint benchmark failed"

    echo ""
    echo "3. Testing build performance..."
    time pnpm nx run-many -t build --parallel=4 2>/dev/null || echo "  Build benchmark failed"

    echo ""
    echo "💡 Benchmark complete. Compare times with CI runs to identify bottlenecks."
}

validate_config() {
    echo "✅ Validating Nx configuration for CI optimization..."
    cd "$REPO_ROOT"

    # Check nx.json configuration
    echo ""
    echo "1. Checking nx.json configuration..."

    if ! jq -e '.tasksRunnerOptions.default.options.parallel' nx.json >/dev/null 2>&1; then
        echo "  ❌ Parallelization not configured"
    else
        parallel=$(jq -r '.tasksRunnerOptions.default.options.parallel' nx.json)
        echo "  ✅ Parallelization set to: $parallel"
        if [ "$parallel" -lt 4 ]; then
            echo "  ⚠️  Consider increasing parallel execution (recommended: 8+)"
        fi
    fi

    # Check for Nx Cloud
    if jq -e '.tasksRunnerOptions.default.runner' nx.json | grep -q "nx-cloud"; then
        echo "  ✅ Nx Cloud runner configured"
    else
        echo "  ⚠️  Consider enabling Nx Cloud for distributed caching"
    fi

    # Check caching configuration
    echo ""
    echo "2. Checking task caching configuration..."

    cacheable=$(jq -r '.tasksRunnerOptions.default.options.cacheableOperations[]?' nx.json 2>/dev/null | wc -l | tr -d ' ')
    echo "  Cacheable operations: $cacheable"

    # Check project configurations
    echo ""
    echo "3. Checking project configurations..."

    projects_with_issues=0
    for project_file in */project.json **/*/project.json; do
        if [ -f "$project_file" ]; then
            project_name=$(dirname "$project_file")

            # Check if build task has proper inputs/outputs
            if jq -e '.targets.build' "$project_file" >/dev/null 2>&1; then
                if ! jq -e '.targets.build.inputs' "$project_file" >/dev/null 2>&1; then
                    echo "  ⚠️  $project_name: build task missing inputs configuration"
                    projects_with_issues=$((projects_with_issues + 1))
                fi

                if ! jq -e '.targets.build.outputs' "$project_file" >/dev/null 2>&1; then
                    echo "  ⚠️  $project_name: build task missing outputs configuration"
                    projects_with_issues=$((projects_with_issues + 1))
                fi
            fi
        fi
    done

    if [ "$projects_with_issues" -eq 0 ]; then
        echo "  ✅ All projects properly configured"
    else
        echo "  ⚠️  $projects_with_issues projects need attention"
    fi

    echo ""
    echo "4. Configuration summary:"
    echo "  - Enable Nx Cloud for maximum performance gains"
    echo "  - Increase parallel execution to 8+ for faster CI"
    echo "  - Ensure all tasks have proper inputs/outputs for caching"
    echo "  - Use affected commands in CI to skip unchanged projects"
}

show_status() {
    echo "📊 Current CI Status & Performance Metrics"
    echo ""

    # Show affected projects
    check_affected

    echo ""
    # Show cache status
    show_cache_status

    echo ""
    echo "🔧 Quick performance improvements:"
    echo "  1. Run 'pnpm nx reset' to clear stale caches"
    echo "  2. Check CI logs for slow operations"
    echo "  3. Consider splitting large tests into smaller chunks"
    echo "  4. Use 'nx affected' commands to skip unchanged projects"
}

clean_caches() {
    echo "🧹 Cleaning caches for fresh CI test..."
    cd "$REPO_ROOT"

    echo "  Cleaning Nx cache..."
    pnpm nx reset 2>/dev/null || echo "  Nx reset failed"

    echo "  Cleaning node_modules..."
    rm -rf node_modules 2>/dev/null || echo "  node_modules cleanup failed"

    echo "  Cleaning project dist folders..."
    find . -name "dist" -type d -not -path "./node_modules/*" -exec rm -rf {} + 2>/dev/null || true

    echo "  Cleaning coverage folders..."
    find . -name "coverage" -type d -not -path "./node_modules/*" -exec rm -rf {} + 2>/dev/null || true

    echo "✅ Cache cleanup complete. Run 'pnpm install' to restore dependencies."
}

monitor_ci() {
    echo "👀 Monitoring current CI run..."
    cd "$REPO_ROOT"

    if command -v gh &> /dev/null; then
        echo "Getting latest workflow run..."
        gh run list --limit 1
        echo ""
        echo "Use 'gh run view' to see details of a specific run"
        echo "Use 'gh run watch' to follow a run in real-time"
    else
        echo "⚠️  GitHub CLI not installed. Install with:"
        echo "  brew install gh"
        echo ""
        echo "Or check CI status at:"
        echo "  https://github.com/$(git config --get remote.origin.url | sed 's/.*github.com[:/]\(.*\)\.git/\1/')/actions"
    fi
}

test_parallelization() {
    echo "🧪 Testing optimal parallelization settings..."
    cd "$REPO_ROOT"

    echo "Running typecheck with different parallel settings..."

    for parallel in 1 4 8 12; do
        echo ""
        echo "Testing with parallel=$parallel..."
        export NX_PARALLEL=$parallel
        time pnpm nx run-many -t typecheck --parallel=$parallel 2>/dev/null || echo "  Failed with parallel=$parallel"
    done

    echo ""
    echo "💡 Compare the times above to find optimal parallelization for your CI environment."
    echo "   Consider CI runner CPU count when setting parallel in nx.json"
}

case "${1:-}" in
    "status")
        print_header
        show_status
        ;;
    "cache")
        print_header
        show_cache_status
        ;;
    "affected")
        print_header
        check_affected
        ;;
    "benchmark")
        print_header
        run_benchmarks
        ;;
    "validate")
        print_header
        validate_config
        ;;
    "clean")
        print_header
        clean_caches
        ;;
    "monitor")
        print_header
        monitor_ci
        ;;
    "parallel")
        print_header
        test_parallelization
        ;;
    "help"|"--help"|"-h")
        print_header
        print_usage
        ;;
    *)
        print_header
        print_usage
        exit 1
        ;;
esac