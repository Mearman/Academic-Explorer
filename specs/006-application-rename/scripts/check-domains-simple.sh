#!/usr/bin/env bash
# Simple Domain Availability Checker
# Uses DNS lookup to check if domains resolve (basic availability test)

echo "=========================================="
echo "Domain Availability Checker"
echo "=========================================="
echo ""

# Candidates and extensions
candidates=("scholarweave" "citationmesh" "graphademia" "researchlattice")
extensions=("com" "io" "app" "org")

echo "Checking DNS resolution for candidate domains..."
echo ""

for candidate in "${candidates[@]}"; do
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "$candidate"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

    available=0

    for ext in "${extensions[@]}"; do
        domain="${candidate}.${ext}"
        printf "  %-30s " "$domain"

        if host "$domain" &>/dev/null; then
            echo "✗ TAKEN (resolves)"
        else
            echo "✓ LIKELY AVAILABLE"
            available=$((available + 1))
        fi
    done

    echo ""
    echo "  Available: $available / ${#extensions[@]} extensions"
    echo ""
done

echo "=========================================="
echo "SUMMARY"
echo "=========================================="
echo ""
echo "ScholarWeave:"
for ext in "${extensions[@]}"; do
    domain="scholarweave.${ext}"
    if ! host "$domain" &>/dev/null; then
        echo "  ✓ $domain"
    fi
done
echo ""

echo "CitationMesh:"
for ext in "${extensions[@]}"; do
    domain="citationmesh.${ext}"
    if ! host "$domain" &>/dev/null; then
        echo "  ✓ $domain"
    fi
done
echo ""

echo "Graphademia:"
for ext in "${extensions[@]}"; do
    domain="graphademia.${ext}"
    if ! host "$domain" &>/dev/null; then
        echo "  ✓ $domain"
    fi
done
echo ""

echo "ResearchLattice:"
for ext in "${extensions[@]}"; do
    domain="researchlattice.${ext}"
    if ! host "$domain" &>/dev/null; then
        echo "  ✓ $domain"
    fi
done
echo ""

echo "=========================================="
echo "NEXT STEPS"
echo "=========================================="
echo ""
echo "Verify at a registrar before making final decision:"
echo "  • Namecheap: https://www.namecheap.com"
echo "  • Cloudflare: https://domains.cloudflare.com"
echo ""
