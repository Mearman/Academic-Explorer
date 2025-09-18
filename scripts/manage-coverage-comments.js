#!/usr/bin/env node

const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

async function manageCoverageComments(github, context) {
  try {
    // Get new coverage report
    const { stdout } = await execAsync('node scripts/generate-coverage-report.js pr-comment');

    // Find existing coverage comments
    const comments = await github.rest.issues.listComments({
      owner: context.repo.owner,
      repo: context.repo.repo,
      issue_number: context.issue.number,
    });

    const coverageComments = comments.data.filter(comment =>
      comment.body.includes('## Coverage Report') &&
      comment.user.type === 'Bot'
    );

    // Minimize previous coverage comments
    for (const comment of coverageComments) {
      await github.graphql(`
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
    await github.rest.issues.createComment({
      issue_number: context.issue.number,
      owner: context.repo.owner,
      repo: context.repo.repo,
      body: stdout
    });
  } catch (error) {
    console.error('Failed to manage coverage comments:', error);
  }
}

module.exports = { manageCoverageComments };