#!/bin/bash

# Test Deployment Script - 2025-10-29
# Tests fixes from commits 10693ea8, 29ed9761, 0500afa1

set -e

BASE_URL="https://mearman.github.io/Academic-Explorer"

echo "=== Testing Academic Explorer Deployment ==="
echo "Base URL: $BASE_URL"
echo ""

# Function to test URL
test_url() {
    local name="$1"
    local url="$2"
    local expected="$3"

    echo "Testing: $name"
    echo "URL: $url"

    response=$(curl -s -o /dev/null -w "%{http_code}" "$url" || echo "000")

    if [ "$response" = "200" ]; then
        echo "✓ HTTP 200 OK"
    else
        echo "✗ HTTP $response (expected 200)"
        return 1
    fi

    echo ""
}

# Test 1: Author A5017898742
test_url \
    "Author A5017898742" \
    "$BASE_URL/#/authors/A5017898742" \
    "Author details page"

# Test 2: Filtered Funders
test_url \
    "Filtered Funders Query" \
    "$BASE_URL/#/funders?filter=country_code:ca" \
    "Canadian funders list"

# Test 3: ORCID Route (will redirect)
test_url \
    "ORCID Route" \
    "$BASE_URL/#/authors/orcid/0000-0002-1298-3089" \
    "Author details via ORCID"

# Test 4: Concepts Deprecation
test_url \
    "Concepts Deprecation Notice" \
    "$BASE_URL/#/concepts" \
    "Concepts list with deprecation alert"

# Test 5: Bioplastics Query (full API URL)
test_url \
    "Bioplastics Query (Full API URL)" \
    "$BASE_URL/#/https://api.openalex.org/works?filter=display_name.search:bioplastics&sort=publication_year:desc,relevance_score:desc" \
    "Works about bioplastics"

# Test 6: Bioplastics Query (relative path)
test_url \
    "Bioplastics Query (Relative Path)" \
    "$BASE_URL/#/works?filter=display_name.search:bioplastics&sort=publication_year:desc,relevance_score:desc" \
    "Works about bioplastics"

echo "=== Deployment Test Complete ==="
echo ""
echo "Next steps:"
echo "1. Manually verify each URL in browser for complete data"
echo "2. Run full E2E test suite: cd apps/web && npx playwright test src/test/e2e/all-urls-load.e2e.test.ts"
echo "3. Compare results to expected ~153/230 URLs passing"
