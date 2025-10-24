#!/usr/bin/env node

/**
 * Fix package.json paths in dist for npm publishing
 *
 * Converts paths from workspace format (./dist/...) to publish format (./...)
 * This allows the package to work correctly both in the monorepo and when published to npm.
 *
 * Workspace (from package root): ./dist/index.esm.js
 * Publishing (from dist/):        ./index.esm.js
 */

const fs = require('fs');
const path = require('path');

const distPackageJsonPath = path.join(__dirname, '../dist/package.json');

try {
  const pkg = JSON.parse(fs.readFileSync(distPackageJsonPath, 'utf8'));

  // Function to remove './dist/' prefix from paths
  const fixPath = (p) => {
    if (typeof p !== 'string') return p;
    return p.replace(/^\.\/dist\//, './');
  };

  // Fix top-level fields
  if (pkg.main) pkg.main = fixPath(pkg.main);
  if (pkg.module) pkg.module = fixPath(pkg.module);
  if (pkg.types) pkg.types = fixPath(pkg.types);

  // Fix exports field
  if (pkg.exports && typeof pkg.exports === 'object') {
    const fixExports = (obj) => {
      if (typeof obj === 'string') return fixPath(obj);
      if (typeof obj !== 'object' || obj === null) return obj;

      const fixed = {};
      for (const [key, value] of Object.entries(obj)) {
        if (typeof value === 'string') {
          fixed[key] = fixPath(value);
        } else if (typeof value === 'object') {
          fixed[key] = fixExports(value);
        } else {
          fixed[key] = value;
        }
      }
      return fixed;
    };

    pkg.exports = fixExports(pkg.exports);
  }

  // Write back to dist
  fs.writeFileSync(distPackageJsonPath, JSON.stringify(pkg, null, 2) + '\n', 'utf8');

  console.log('✅ Fixed dist/package.json paths for publishing');
} catch (error) {
  console.error('❌ Error fixing dist package.json:', error.message);
  process.exit(1);
}
