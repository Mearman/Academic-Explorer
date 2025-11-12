#!/usr/bin/env bash
# Domain Availability Checker for Application Rename Feature
# Checks DNS resolution and WHOIS data for candidate domain names

set -euo pipefail

# Ensure bash 4.0+ for associative arrays
if [ "${BASH_VERSINFO:-0}" -lt 4 ]; then
    echo "Error: This script requires bash 4.0 or higher"
    echo "Current version: $BASH_VERSION"
    exit 1
fi

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Candidate names from research
CANDIDATES=(
    "scholarweave"
    "citationmesh"
    "graphademia"
    "researchlattice"
)

# Extensions to check
EXTENSIONS=("com" "io" "app" "org")

echo "=========================================="
echo "Domain Availability Checker"
echo "=========================================="
echo ""
echo "Checking availability for top 4 candidate names..."
echo ""

# Function to check if a domain resolves (basic availability test)
check_domain() {
    local domain=$1

    # Try DNS lookup
    if host "$domain" &>/dev/null; then
        echo -e "${RED}✗ TAKEN${NC}"
        return 1
    else
        echo -e "${GREEN}✓ LIKELY AVAILABLE${NC}"
        return 0
    fi
}

# Function to check WHOIS (if available)
check_whois() {
    local domain=$1

    if command -v whois &>/dev/null; then
        local whois_output=$(whois "$domain" 2>/dev/null || echo "")

        if echo "$whois_output" | grep -iq "no match\|not found\|no entries\|available"; then
            return 0  # Available
        elif echo "$whois_output" | grep -iq "reserved\|premium"; then
            return 2  # Reserved/Premium
        else
            return 1  # Taken
        fi
    fi

    return 3  # WHOIS not available
}

# Results storage
declare -A results

# Check each candidate with each extension
for candidate in "${CANDIDATES[@]}"; do
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo -e "${BLUE}${candidate}${NC}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

    available_count=0

    for ext in "${EXTENSIONS[@]}"; do
        domain="${candidate}.${ext}"
        printf "  %-30s " "$domain"

        # Check DNS first
        if check_domain "$domain"; then
            available_count=$((available_count + 1))
            results["$domain"]="available"

            # Try WHOIS for additional verification
            whois_result=$(check_whois "$domain")
            case $whois_result in
                0) echo -e "    ${GREEN}WHOIS confirms: Available${NC}" ;;
                2) echo -e "    ${YELLOW}WHOIS: Reserved/Premium${NC}" ;;
            esac
        else
            results["$domain"]="taken"
        fi
    done

    echo ""
    echo "  Summary: $available_count of ${#EXTENSIONS[@]} extensions likely available"
    echo ""
done

# Summary report
echo ""
echo "=========================================="
echo "SUMMARY REPORT"
echo "=========================================="
echo ""

for candidate in "${CANDIDATES[@]}"; do
    echo -e "${BLUE}${candidate}:${NC}"

    available_domains=()
    for ext in "${EXTENSIONS[@]}"; do
        domain="${candidate}.${ext}"
        if [[ "${results[$domain]}" == "available" ]]; then
            available_domains+=("$domain")
        fi
    done

    if [ ${#available_domains[@]} -gt 0 ]; then
        echo -e "  ${GREEN}Available:${NC} ${available_domains[*]}"
    else
        echo -e "  ${RED}No domains available${NC}"
    fi
    echo ""
done

echo "=========================================="
echo "NEXT STEPS"
echo "=========================================="
echo ""
echo "1. Verify availability at a registrar:"
echo "   - Namecheap: https://www.namecheap.com"
echo "   - Cloudflare: https://domains.cloudflare.com"
echo "   - GoDaddy: https://www.godaddy.com"
echo ""
echo "2. Once verified, register immediately to prevent squatting"
echo ""
echo "3. Update spec.md with selected name and proceed to /speckit.plan"
echo ""

echo "NOTE: This script provides a preliminary check."
echo "Always verify with a registrar before making final decisions."
echo ""
