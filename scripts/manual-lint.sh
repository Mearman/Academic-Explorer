#!/bin/bash

# Manual lint script to bypass Nx hanging issue
# Runs eslint on all packages and apps

set -e

echo "🔍 Starting manual lint process..."

# Lint packages
echo "Linting packages..."
(cd packages/simulation && eslint src)
(cd packages/graph && eslint src)
(cd packages/utils && eslint src)
(cd packages/client && eslint src)
(cd packages/ui && eslint src)

# Lint apps
echo "Linting apps..."
(cd apps/cli && eslint src)
(cd apps/web && eslint src)

echo "✅ All linting completed successfully!"