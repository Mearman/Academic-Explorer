/// <reference types="vite/client" />

interface BuildInfo {
  buildTimestamp: string;
  commitHash: string;
  shortCommitHash: string;
  commitTimestamp: string;
  branchName: string;
  version: string;
  repositoryUrl: string;
}

declare const __BUILD_INFO__: BuildInfo;
declare const __DEV__: boolean;
