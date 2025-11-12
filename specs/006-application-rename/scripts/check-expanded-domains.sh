#!/usr/bin/env bash
# Domain Availability Checker for Expanded Alternative Names
# Checks DNS resolution for all 65 expanded alternative name suggestions

echo "=========================================="
echo "Expanded Names Domain Availability"
echo "=========================================="
echo ""

# All 65 candidate names from alternative-names-expanded.md
candidates=(
    # Category 1: Ultra-Short Invented Words
    "vero"
    "kyra"
    "rezi"
    "liro"
    "noda"
    "kynos"
    "zeta"
    "vyx"
    # Category 2: Modified Academic Terms
    "dokma"
    "texis"
    "paedia"
    "logos"
    "ethos"
    "telos"
    # Category 3: Scientific/Mathematical Neologisms
    "quanta"
    "sigma"
    "delta"
    "graphia"
    "metrix"
    # Category 4: Elegant Latin-Derived Terms
    "ratio"
    "veritas"
    "lucida"
    "clarion"
    "meridian"
    "virtus"
    "orbis"
    "nexum"
    # Category 5: Crystalline/Material Metaphors
    "quartz"
    "obsidian"
    "mica"
    "beryl"
    "opal"
    # Category 6: Abstract Conceptual Names
    "aether"
    "quintus"
    "zenith"
    "aurora"
    "lumina"
    "radius"
    "axis"
    # Category 7: Phonetically Appealing Inventions
    "vela"
    "reva"
    "koda"
    "lyra"
    "ora"
    "neva"
    "kairo"
    "zora"
    # Category 8: Tech-Forward Minimal Names
    "zynth"
    "flux"
    "qore"
    "kore"
    "vyse"
    "xylo"
    # Category 9: Single-Syllable Power Words
    "flint"
    "crest"
    "pulse"
    "forge"
    "spark"
    # Category 10: Mythology-Inspired
    "thoth"
    "mimir"
    "saga"
    "muse"
    "atlas"
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
