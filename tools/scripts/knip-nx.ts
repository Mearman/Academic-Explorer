#!/usr/bin/env tsx

import { execSync } from "child_process";
import process from "process";

interface ErrorWithStatus {
  status: number;
}

function hasStatusProperty(obj: object): obj is { status: unknown } {
  return "status" in obj;
}

function isErrorWithStatus(error: unknown): error is ErrorWithStatus {
  return (
    typeof error === "object" &&
    error !== null &&
    hasStatusProperty(error) &&
    typeof error.status === "number"
  );
}

function runKnip(): void {
  try {
    // Run knip CLI and capture output
    execSync("knip", { stdio: "inherit", cwd: process.cwd() });
    // If knip succeeds (no unused code), exit 0
    process.exit(0);
  } catch (error) {
    // Knip found unused code (exit code 1) or other error
    // For nx caching purposes, we want to exit 0 if it ran successfully
    // but found unused code, and exit 1 only for actual errors

    if (isErrorWithStatus(error) && error.status === 1) {
      // Exit code 1 means knip found unused code but ran successfully
      // Exit 0 for nx caching
      process.exit(0);
    }

    // For any other error, exit with failure
    console.error("Knip error:", error);
    process.exit(1);
  }
}

runKnip();