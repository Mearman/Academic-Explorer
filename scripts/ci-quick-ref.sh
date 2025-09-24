#!/bin/bash

# CI Monitoring Quick Reference Script
# This script provides easy commands to monitor GitHub Actions CI status

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Ensure we're in the right directory
cd "$(dirname "$0")/.."

echo -e "${BLUE}🔧 Academic Explorer CI Monitoring${NC}"
echo "================================================"

# Function to check if gh CLI is installed
check_gh_cli() {
    if ! command -v gh &> /dev/null; then
        echo -e "${RED}❌ GitHub CLI (gh) is not installed${NC}"
        echo "Install it with: brew install gh"
        echo "Then authenticate with: gh auth login"
        exit 1
    fi

    if ! gh auth status &> /dev/null; then
        echo -e "${YELLOW}⚠️ GitHub CLI not authenticated${NC}"
        echo "Please run: gh auth login"
        exit 1
    fi
}

# Function to show usage
show_usage() {
    echo -e "${GREEN}Quick Commands:${NC}"
    echo "  ./scripts/ci-quick-ref.sh status      - Show latest CI status"
    echo "  ./scripts/ci-quick-ref.sh watch       - Watch CI in real-time"
    echo "  ./scripts/ci-quick-ref.sh list        - List recent runs"
    echo "  ./scripts/ci-quick-ref.sh latest-logs - Extract logs from latest failed run"
    echo "  ./scripts/ci-quick-ref.sh help        - Show all available commands"
    echo ""
    echo -e "${GREEN}Direct pnpm commands:${NC}"
    echo "  pnpm ci:status                        - Quick status check"
    echo "  pnpm ci:watch                         - Watch CI progress"
    echo "  pnpm monitor-ci jobs <run-id>         - Show job details"
    echo "  pnpm ci:logs <run-id>                 - Extract error logs"
    echo ""
    echo -e "${GREEN}GitHub CLI commands:${NC}"
    echo "  gh run list --workflow=nx-ci.yml      - List workflow runs"
    echo "  gh run view <run-id>                  - View run details"
    echo "  gh run view <run-id> --log            - View run logs"
    echo "  gh workflow list                      - List all workflows"
}

# Function to get latest run status
latest_status() {
    echo -e "${BLUE}🎯 Latest CI Status:${NC}"
    pnpm ci:status
}

# Function to watch CI
watch_ci() {
    echo -e "${BLUE}👀 Watching CI (Ctrl+C to stop):${NC}"
    pnpm ci:watch
}

# Function to list recent runs
list_runs() {
    echo -e "${BLUE}📋 Recent Workflow Runs:${NC}"
    pnpm monitor-ci list nx-ci.yml 5
}

# Function to extract logs from latest failed run
latest_logs() {
    echo -e "${BLUE}📝 Checking for failed runs to extract logs...${NC}"

    # Get latest failed run
    latest_failed=$(gh run list --workflow=nx-ci.yml --status=failure --limit=1 --json=id --jq='.[0].id')

    if [ -z "$latest_failed" ] || [ "$latest_failed" = "null" ]; then
        echo -e "${GREEN}✅ No recent failed runs found${NC}"
        return
    fi

    echo -e "${YELLOW}Found failed run: $latest_failed${NC}"
    echo "Extracting error logs..."
    pnpm ci:logs "$latest_failed"
}

# Function to show comprehensive help
show_help() {
    pnpm monitor-ci help
}

# Check prerequisites
check_gh_cli

# Handle command line arguments
case "${1:-help}" in
    "status")
        latest_status
        ;;
    "watch")
        watch_ci
        ;;
    "list")
        list_runs
        ;;
    "latest-logs")
        latest_logs
        ;;
    "help")
        show_help
        ;;
    *)
        show_usage
        ;;
esac

echo ""
echo -e "${BLUE}💡 Tip: Run './scripts/ci-quick-ref.sh help' for all available commands${NC}"