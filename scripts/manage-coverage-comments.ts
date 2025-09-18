#!/usr/bin/env npx tsx

import { exec } from "child_process";
import { promisify } from "util";
import { Octokit } from "@octokit/rest";

const execAsync = promisify(exec);

async function main(): Promise<void> {
  const token = process.env.GITHUB_TOKEN;
  const prNumber = process.env.PR_NUMBER;
  const owner = process.env.REPO_OWNER;
  const repo = process.env.REPO_NAME;

  if (!token || !prNumber || !owner || !repo) {
    console.error("Missing required environment variables");
    process.exit(1);
  }

  const octokit = new Octokit({ auth: token });

  try {
    // Get new coverage report
    const { stdout } = await execAsync("node scripts/generate-coverage-report.js pr-comment");

    // Find existing coverage comments
    const { data: comments } = await octokit.rest.issues.listComments({
      owner,
      repo,
      issue_number: parseInt(prNumber, 10),
    });

    const coverageComments = comments.filter(comment =>
      comment.body?.includes("## Coverage Report") &&
      comment.user?.type === "Bot"
    );

    // Minimize previous coverage comments
    for (const comment of coverageComments) {
      await octokit.graphql(`
        mutation minimizeComment($commentId: ID!) {
          minimizeComment(input: {subjectId: $commentId, classifier: OUTDATED}) {
            minimizedComment {
              isMinimized
            }
          }
        }
      `, {
        commentId: comment.node_id
      });
    }

    // Add new coverage comment
    await octokit.rest.issues.createComment({
      owner,
      repo,
      issue_number: parseInt(prNumber, 10),
      body: stdout
    });

    console.log("Coverage comment updated successfully");
  } catch (error) {
    console.error("Failed to manage coverage comments:", error);
    process.exit(1);
  }
}

if (require.main === module) {
  void main();
}