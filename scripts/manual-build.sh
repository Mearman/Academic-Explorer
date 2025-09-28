#!/bin/bash

# Manual build script to bypass Nx hanging issue
# Builds packages in dependency order

set -e

echo "🔧 Starting manual build process..."

echo "📦 Building packages in dependency order..."

# Build foundation packages (no dependencies)
echo "Building simulation..."
(cd packages/simulation && tsc -b)

echo "Building graph..."
(cd packages/graph && tsc -b)

echo "Building utils..."
(cd packages/utils && tsc -b)

# Build core packages (depend on foundation)
echo "Building client..."
(cd packages/client && tsc -b && pnpm tsup)

echo "Building ui..."
(cd packages/ui && tsc -b && vite build)

# Build applications (depend on packages)
echo "Building cli..."
(cd apps/cli && tsc -b)

echo "Building web..."
(cd apps/web && tsc -b && vite build)

echo "✅ All builds completed successfully!"