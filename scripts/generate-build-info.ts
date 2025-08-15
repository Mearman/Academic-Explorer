import { execSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Generate build information including commit hash and build timestamp
 * This script is run at build time to capture deployment information
 */

interface GitInfo {
  short: string;
  full: string;
  message: string;
  date: string;
  branch: string;
}

interface BuildInfo {
  git: GitInfo;
  buildTimestamp: string;
  buildDate: string;
  nodeVersion: string;
  platform: string;
  env: {
    NODE_ENV: string;
    CI: boolean | string;
    GITHUB_ACTIONS: boolean | string;
    RUNNER_OS?: string;
  };
}

function getGitCommitHash(): GitInfo {
  try {
    // Get the short commit hash (7 characters)
    const shortHash = execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim();
    // Get the full commit hash
    const fullHash = execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
    // Get the commit message
    const commitMessage = execSync('git log -1 --pretty=%B', { encoding: 'utf8' }).trim();
    // Get the commit date
    const commitDate = execSync('git log -1 --pretty=%cI', { encoding: 'utf8' }).trim();
    // Get the branch name
    const branch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' }).trim();
    
    return {
      short: shortHash,
      full: fullHash,
      message: commitMessage,
      date: commitDate,
      branch,
    };
  } catch (error) {
    console.warn('Warning: Could not retrieve git information:', error.message);
    return {
      short: 'unknown',
      full: 'unknown',
      message: 'Git information not available',
      date: new Date().toISOString(),
      branch: 'unknown',
    };
  }
}

function getBuildInfo(): BuildInfo {
  const git = getGitCommitHash();
  const buildTimestamp = new Date().toISOString();
  const nodeVersion = process.version;
  const platform = process.platform;
  
  return {
    git,
    buildTimestamp,
    buildDate: buildTimestamp,
    nodeVersion,
    platform,
    // Environment information
    env: {
      NODE_ENV: process.env.NODE_ENV || 'development',
      CI: process.env.CI || false,
      GITHUB_ACTIONS: process.env.GITHUB_ACTIONS || false,
      RUNNER_OS: process.env.RUNNER_OS || undefined,
    },
  };
}

function generateBuildInfoFile(): string {
  const buildInfo = getBuildInfo();
  
  // Create TypeScript file with build info
  const tsContent = `// This file is auto-generated at build time
// Do not edit manually - it will be overwritten

export interface BuildInfo {
  git: {
    short: string;
    full: string;
    message: string;
    date: string;
    branch: string;
  };
  buildTimestamp: string;
  buildDate: string;
  nodeVersion: string;
  platform: string;
  env: {
    NODE_ENV: string;
    CI: boolean | string;
    GITHUB_ACTIONS: boolean | string;
    RUNNER_OS?: string;
  };
}

export const buildInfo: BuildInfo = ${JSON.stringify(buildInfo, null, 2)};

export default buildInfo;
`;

  // Write to src directory
  const outputPath = join(__dirname, '../src/lib/build-info.ts');
  writeFileSync(outputPath, tsContent, 'utf8');
  
  console.log('✓ Generated build info:', {
    commit: buildInfo.git.short,
    buildTime: buildInfo.buildTimestamp,
    branch: buildInfo.git.branch,
    env: buildInfo.env.NODE_ENV,
  });
  
  return outputPath;
}

// Type guard for Error objects
function isError(error: unknown): error is Error {
  return error instanceof Error;
}

// Always run when this script is executed (for now)
try {
  generateBuildInfoFile();
  console.log('✓ Build info generated successfully');
} catch (error) {
  const errorMessage = isError(error) ? error.message : 'Unknown error occurred';
  console.error('✗ Failed to generate build info:', errorMessage);
  process.exit(1);
}

export { generateBuildInfoFile, getBuildInfo };