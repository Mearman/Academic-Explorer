#!/bin/bash

# E2E Test Runner Script
# Starts the development server and runs E2E tests to diagnose the loading issue

set -e

echo "🚀 Starting E2E Test Suite for Academic Explorer"
echo "================================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to cleanup background processes
cleanup() {
    echo -e "\n${YELLOW}Cleaning up background processes...${NC}"
    if [ ! -z "$SERVER_PID" ]; then
        kill $SERVER_PID 2>/dev/null || true
    fi
    exit 0
}

# Set up cleanup trap
trap cleanup EXIT INT TERM

# Create test results directory
mkdir -p test-results

# Start the development server in the background
echo -e "${YELLOW}Starting development server...${NC}"
pnpm dev &
SERVER_PID=$!

# Wait for the server to be ready
echo -e "${YELLOW}Waiting for server to be ready...${NC}"
sleep 5

# Check if server is running
if ! curl -s http://localhost:3001 > /dev/null; then
    echo -e "${RED}❌ Server failed to start${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Server is running on http://localhost:3001${NC}"

# Set environment variables for tests
export TEST_BASE_URL="http://localhost:3001"
export NODE_OPTIONS="--max-old-space-size=8192"

# Run the E2E tests
echo -e "\n${YELLOW}Running E2E tests...${NC}"
echo "=============================="

# Run the specific loading diagnosis tests
echo -e "${YELLOW}Running entity loading diagnosis tests...${NC}"
pnpm test:e2e src/test/entity-loading-diagnosis.e2e.test.ts

# Run the works page specific tests
echo -e "\n${YELLOW}Running works page loading tests...${NC}"
pnpm test:e2e src/test/works-page-loading.e2e.test.ts

echo -e "\n${GREEN}✅ E2E tests completed${NC}"
echo -e "${YELLOW}Check test-results/ directory for screenshots and logs${NC}"