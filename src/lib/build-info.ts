// This file is auto-generated at build time
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

export const buildInfo: BuildInfo = {
  "git": {
    "short": "44b6ecc",
    "full": "44b6eccbfc876f56400fb76fae767863e318c340",
    "message": "chore: export new error boundary test component\n\n- Add ErrorBoundaryTest export to components index\n- Organize exports with new Examples & Testing Components section\n- Maintain clean component export structure for development tools",
    "date": "2025-08-15T16:07:37+01:00",
    "branch": "main"
  },
  "buildTimestamp": "2025-08-15T15:45:47.160Z",
  "buildDate": "2025-08-15T15:45:47.160Z",
  "nodeVersion": "v24.5.0",
  "platform": "darwin",
  "env": {
    "NODE_ENV": "production",
    "CI": false,
    "GITHUB_ACTIONS": false
  }
};

export default buildInfo;
