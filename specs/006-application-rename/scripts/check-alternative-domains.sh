#!/usr/bin/env bash
# Domain Availability Checker for Alternative Names (Non-Compound)
# Checks DNS resolution for all 40 alternative name suggestions

echo "=========================================="
echo "Alternative Names Domain Availability"
echo "=========================================="
echo ""

# All 40 candidate names from alternative-names-non-compound.md
candidates=(
    "scholara"
    "akademos"
    "erudia"
    "scholium"
    "epistema"
    "nexus"
    "apex"
    "cognate"
    "lexicon"
    "archive"
    "scientia"
    "sagax"
    "noesis"
    "theseus"
    "gnosis"
    "acadi"
    "scopus"
    "vertex"
    "axion"
    "codex"
    "scholix"
    "citara"
    "graphon"
    "bibliom"
    "conecta"
    "sage"
    "quill"
    "tome"
    "node"
    "link"
    "sapientum"
    "docere"
    "graphos"
    "scriptor"
    "cognitum"
    "helix"
    "prism"
    "lumen"
    "cipher"
    "beacon"
)

extensions=("com" "io")

# Track statistics
total_checked=0
total_available=0
declare -a available_names

echo "Checking ${#candidates[@]} names across ${#extensions[@]} extensions..."
echo ""

for candidate in "${candidates[@]}"; do
    available_count=0

    for ext in "${extensions[@]}"; do
        domain="${candidate}.${ext}"
        total_checked=$((total_checked + 1))

        if ! host "$domain" &>/dev/null; then
            available_count=$((available_count + 1))
            total_available=$((total_available + 1))
        fi
    done

    if [ $available_count -eq ${#extensions[@]} ]; then
        available_names+=("$candidate")
        echo "✓ $candidate - ALL AVAILABLE (${#extensions[@]}/${#extensions[@]})"
    elif [ $available_count -gt 0 ]; then
        echo "~ $candidate - PARTIAL ($available_count/${#extensions[@]} available)"
    else
        echo "✗ $candidate - ALL TAKEN"
    fi
done

echo ""
echo "=========================================="
echo "SUMMARY"
echo "=========================================="
echo ""
echo "Total domains checked: $total_checked"
echo "Available domains: $total_available"
echo "Names with ALL extensions available: ${#available_names[@]}"
echo ""

if [ ${#available_names[@]} -gt 0 ]; then
    echo "Fully Available Names:"
    for name in "${available_names[@]}"; do
        echo "  ✓ $name (.com and .io)"
    done
else
    echo "No names have all extensions available."
fi

echo ""
echo "=========================================="
echo "NEXT STEPS"
echo "=========================================="
echo ""
echo "1. Review fully available names above"
echo "2. Verify at registrar (Namecheap, Cloudflare)"
echo "3. Check trademark databases"
echo "4. Register immediately after selection"
echo ""
