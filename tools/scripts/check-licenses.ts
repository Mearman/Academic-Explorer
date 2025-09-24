#!/usr/bin/env npx tsx
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

interface LicenseConfig {
  allowed: string[];
  forbidden: string[];
  notes?: {
    allowed?: string;
    forbidden?: string;
  };
}

interface PackageLicense {
  name: string;
  version: string;
  licenses: string;
  repository?: string;
  publisher?: string;
  email?: string;
  path: string;
  licenseFile?: string;
}

interface LicenseData {
  [key: string]: PackageLicense;
}

function checkLicenses(): void {
  try {
    console.log('🔍 Checking licenses...');

    // Read configuration
    const configPath = join(process.cwd(), '.license-config.json');
    const config: LicenseConfig = JSON.parse(readFileSync(configPath, 'utf-8'));
    console.log(`📋 Configuration loaded: ${config.forbidden.length} forbidden licenses`);

    // Run monorepo-license-checker synchronously
    console.log('📦 Running monorepo-license-checker...');
    const stdout = execSync('monorepo-license-checker --json --exclude-private-packages', {
      encoding: 'utf8',
      timeout: 30000, // 30 second timeout
      maxBuffer: 1024 * 1024 * 10 // 10MB buffer
    });

    const licenseData: LicenseData = JSON.parse(stdout);
    console.log(`📊 Analyzed ${Object.keys(licenseData).length} packages`);

    // Check for forbidden licenses
    const violations: Array<{ name: string; version: string; licenses: string }> = [];

    for (const [packageName, pkg] of Object.entries(licenseData)) {
      if (pkg.licenses && config.forbidden.some(forbidden =>
        pkg.licenses.includes(forbidden)
      )) {
        violations.push({
          name: packageName.split('@')[0] || 'unknown',
          version: pkg.version || 'unknown',
          licenses: pkg.licenses
        });
      }
    }

    // Report results
    if (violations.length > 0) {
      console.error('❌ Forbidden licenses found:');
      violations.forEach(violation => {
        console.error(`  - ${violation.name}@${violation.version} (${violation.licenses})`);
      });
      console.error(`\nForbidden licenses: ${config.forbidden.join(', ')}`);
      process.exit(1);
    } else {
      const totalPackages = Object.keys(licenseData).length;
      console.log(`✅ All ${totalPackages} packages have acceptable licenses`);
      console.log(`📝 Allowed licenses: ${config.allowed.join(', ')}`);
    }
  } catch (error) {
    console.error('❌ Error checking licenses:', error);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  checkLicenses();
}