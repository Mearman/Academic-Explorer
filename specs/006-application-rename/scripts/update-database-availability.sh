#!/usr/bin/env bash
# Consolidated Domain Availability Checker and Database Updater
# Checks unverified names in all-names-database.json and updates with availability results

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SPEC_DIR="$(dirname "$SCRIPT_DIR")"
DB_FILE="$SPEC_DIR/all-names-database.json"
TEMP_FILE="$SPEC_DIR/.all-names-database.json.tmp"

# Check if database exists
if [ ! -f "$DB_FILE" ]; then
    echo "Error: Database file not found at $DB_FILE"
    exit 1
fi

# Check if jq is available
if ! command -v jq &>/dev/null; then
    echo "Error: jq is required but not installed."
    echo "Install with: brew install jq"
    exit 1
fi

echo "=========================================="
echo "Domain Availability Database Updater"
echo "=========================================="
echo ""

# Read TLDs from config
echo "Reading configuration..."
tlds_json=$(jq -r '.config.tlds[]' "$DB_FILE")
tlds=()
while IFS= read -r tld; do
    tlds+=("$tld")
done <<< "$tlds_json"

tld_count=${#tlds[@]}
echo "TLDs to check: ${tlds[*]} ($tld_count extensions)"
echo ""

# Extract unverified names from JSON
echo "Finding unverified names..."
unverified_names=$(jq -r '.names[] | select(.availability.verified == false) | .name' "$DB_FILE")

if [ -z "$unverified_names" ]; then
    echo "No unverified names found in database."
    echo "All names have been verified!"
    exit 0
fi

# Count unverified names
unverified_count=$(echo "$unverified_names" | wc -l | tr -d ' ')
echo "Found $unverified_count unverified names"
echo ""

# Arrays to track results
declare -a fully_available=()
declare -a partially_available=()
declare -a all_taken=()

# Check each unverified name
total_checked=0
for name in $unverified_names; do
    name_lower=$(echo "$name" | tr '[:upper:]' '[:lower:]')

    # Check all configured TLDs using both WHOIS and DNS
    declare -A tld_availability
    available_count=0

    for tld in "${tlds[@]}"; do
        domain="${name_lower}.${tld}"

        # Method 1: WHOIS lookup (more reliable)
        whois_available=false
        whois_output=$(whois "$domain" 2>&1)

        # Check for common "not found" patterns in WHOIS output
        if echo "$whois_output" | grep -qiE "(no match|not found|no entries found|no data found|status: free|status: available)"; then
            whois_available=true
        fi

        # Method 2: DNS lookup (faster but less reliable)
        dns_available=false
        if ! host "$domain" &>/dev/null; then
            dns_available=true
        fi

        # Domain is available only if BOTH methods agree it's available
        # If they disagree, assume taken (conservative approach)
        if [ "$whois_available" = true ] && [ "$dns_available" = true ]; then
            tld_availability[$tld]=true
            available_count=$((available_count + 1))
        else
            tld_availability[$tld]=false
        fi

        # Small delay to avoid rate limiting on WHOIS servers
        sleep 0.5
    done

    # Determine status
    if [ $available_count -eq ${#tlds[@]} ]; then
        status="fully-available"
        fully_available+=("$name")
        echo "✓ $name - FULLY AVAILABLE (${tlds[*]})"
    elif [ $available_count -gt 0 ]; then
        status="partial"
        partially_available+=("$name")
        echo "~ $name - PARTIAL ($available_count/${#tlds[@]} available)"
    else
        status="all-taken"
        all_taken+=("$name")
        echo "✗ $name - ALL TAKEN"
    fi

    # Build jq update command dynamically based on configured TLDs
    jq_update='(.names[] | select(.name == $name) | .availability) |= {status: $status, verified: true'
    jq_args=(--arg name "$name" --arg status "$status")

    for tld in "${tlds[@]}"; do
        # Sanitize TLD for use as jq variable (replace dots with underscores)
        tld_var=$(echo "$tld" | tr '.' '_')
        jq_update+=", \"${tld}\": \$${tld_var}"
        jq_args+=(--argjson "$tld_var" "${tld_availability[$tld]}")
    done

    jq_update+='}'

    # Update JSON database using jq
    jq "${jq_args[@]}" "$jq_update" "$DB_FILE" > "$TEMP_FILE" && mv "$TEMP_FILE" "$DB_FILE"

    total_checked=$((total_checked + 1))
    unset tld_availability
done

echo ""
echo "=========================================="
echo "UPDATE SUMMARY"
echo "=========================================="
echo ""
echo "Total names checked: $total_checked"
echo "Fully available (.com + .io): ${#fully_available[@]}"
echo "Partially available: ${#partially_available[@]}"
echo "All taken: ${#all_taken[@]}"
echo ""

if [ ${#fully_available[@]} -gt 0 ]; then
    echo "✓ Fully Available Names:"
    for name in "${fully_available[@]}"; do
        echo "  - $name"
    done
    echo ""
fi

if [ ${#partially_available[@]} -gt 0 ]; then
    echo "~ Partially Available Names:"
    for name in "${partially_available[@]}"; do
        echo "  - $name"
    done
    echo ""
fi

# Update metadata in JSON
total_names=$(jq '.names | length' "$DB_FILE")
verified_count=$(jq '[.names[] | select(.availability.verified == true)] | length' "$DB_FILE")
fully_available_count=$(jq '[.names[] | select(.availability.status == "fully-available")] | length' "$DB_FILE")
partial_count=$(jq '[.names[] | select(.availability.status == "partial")] | length' "$DB_FILE")
taken_count=$(jq '[.names[] | select(.availability.status == "all-taken")] | length' "$DB_FILE")

jq --argjson total "$total_names" \
   --argjson verified "$verified_count" \
   --argjson available "$fully_available_count" \
   --argjson partial "$partial_count" \
   --argjson taken "$taken_count" \
   '.metadata.totalNames = $total |
    .metadata.fullyAvailable = $available |
    .metadata.partiallyAvailable = $partial |
    .metadata.allTaken = $taken' \
   "$DB_FILE" > "$TEMP_FILE" && mv "$TEMP_FILE" "$DB_FILE"

echo "=========================================="
echo "DATABASE UPDATED"
echo "=========================================="
echo ""
echo "Updated: $DB_FILE"
echo ""
echo "Current database statistics:"
echo "  Total names: $total_names"
echo "  Verified: $verified_count"
echo "  Fully available: $fully_available_count"
echo "  Partially available: $partial_count"
echo "  All taken: $taken_count"
echo "  Unverified: $((total_names - verified_count))"
echo ""

if [ $((total_names - verified_count)) -eq 0 ]; then
    echo "✓ All names in database have been verified!"
else
    echo "⚠ $(( total_names - verified_count )) names still need verification"
    echo "Run this script again to verify remaining names."
fi

echo ""
