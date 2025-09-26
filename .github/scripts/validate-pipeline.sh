#!/bin/bash

#
# CI Pipeline Validation Script
# Ensures all components are working before committing changes
#

set -e

echo "🔍 =========================================="
echo "🔧    CI PIPELINE VALIDATION SCRIPT      "
echo "🔍 =========================================="
echo ""

# Initialize success tracking
validation_success=true
errors=()
warnings=()

# Function to add error
add_error() {
    errors+=("$1")
    validation_success=false
}

# Function to add warning
add_warning() {
    warnings+=("$1")
}

# Check Node.js and pnpm versions
echo "📋 Environment Validation:"
node_version=$(node --version 2>/dev/null || echo "Not found")
pnpm_version=$(pnpm --version 2>/dev/null || echo "Not found")

if [[ "$node_version" == "Not found" ]]; then
    add_error "Node.js not found"
else
    echo "   ✅ Node.js: $node_version"
fi

if [[ "$pnpm_version" == "Not found" ]]; then
    add_error "pnpm not found"
else
    echo "   ✅ pnpm: $pnpm_version"
fi

# Check if dependencies are installed
echo ""
echo "📦 Dependencies Check:"
if [ ! -d "node_modules" ]; then
    add_error "node_modules not found - run 'pnpm install'"
else
    echo "   ✅ Dependencies installed"
fi

# Quick lint check on critical packages
echo ""
echo "🔧 Lint Validation (Critical Packages):"
for package in "utils" "client"; do
    if [ -d "packages/$package" ]; then
        echo "   🔍 Linting $package..."
        if cd "packages/$package" && timeout 30s pnpm eslint . --max-warnings=0 --quiet >/dev/null 2>&1; then
            echo "   ✅ $package lint passed"
        else
            add_error "$package lint failed"
        fi
        cd - >/dev/null
    fi
done

# Quick typecheck validation
echo ""
echo "🔍 TypeScript Validation:"
if timeout 60s pnpm typecheck:fast >/dev/null 2>&1; then
    echo "   ✅ TypeScript type checking passed"
else
    add_error "TypeScript type checking failed"
fi

# Quick build test
echo ""
echo "🏗️ Build Validation:"
if timeout 120s pnpm nx affected -t build --parallel=2 >/dev/null 2>&1; then
    echo "   ✅ Build test passed"
else
    add_error "Build test failed"
fi

# Test validation
echo ""
echo "🧪 Test Validation:"
test_packages=("utils" "client")
for package in "${test_packages[@]}"; do
    if [ -d "packages/$package" ] && grep -q '"test"' "packages/$package/package.json" 2>/dev/null; then
        echo "   🧪 Testing $package..."
        if timeout 60s pnpm --filter="$package" test >/dev/null 2>&1; then
            echo "   ✅ $package tests passed"
        else
            add_error "$package tests failed"
        fi
    fi
done

# Report results
echo ""
echo "📊 =========================================="
echo "📈          VALIDATION SUMMARY            "
echo "📊 =========================================="

if [ ${#errors[@]} -gt 0 ]; then
    echo "❌ ERRORS FOUND:"
    for error in "${errors[@]}"; do
        echo "   • $error"
    done
    echo ""
fi

if [ ${#warnings[@]} -gt 0 ]; then
    echo "⚠️  WARNINGS:"
    for warning in "${warnings[@]}"; do
        echo "   • $warning"
    done
    echo ""
fi

if [ "$validation_success" = true ]; then
    echo "🎉 =========================================="
    echo "✅        VALIDATION SUCCESSFUL           "
    echo "🎉 =========================================="
    echo "🚀 Pipeline is ready for CI execution!"
    echo ""
    exit 0
else
    echo "💥 =========================================="
    echo "❌        VALIDATION FAILED               "
    echo "💥 =========================================="
    echo "🔧 Fix the errors above before committing"
    echo ""
    exit 1
fi