#!/usr/bin/env node

/**
 * Test result notifications and failure reporting
 *
 * This script processes test results and sends notifications for:
 * - Test failures and coverage drops
 * - Slack/Discord webhook notifications
 * - GitHub status checks
 * - Email notifications (if configured)
 *
 * Usage:
 *   node scripts/test-notifications.js [test-results.json] [coverage-summary.json]
 */

const fs = require('fs');
const https = require('https');
const { execSync } = require('child_process');

// Configuration (can be overridden by environment variables)
const config = {
  slackWebhook: process.env.SLACK_WEBHOOK_URL,
  discordWebhook: process.env.DISCORD_WEBHOOK_URL,
  emailConfig: {
    enabled: process.env.EMAIL_NOTIFICATIONS === 'true',
    from: process.env.EMAIL_FROM,
    to: process.env.EMAIL_TO,
    smtp: {
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT || 587,
      secure: process.env.SMTP_SECURE === 'true',
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  },
  github: {
    token: process.env.GITHUB_TOKEN,
    repo: process.env.GITHUB_REPOSITORY,
    sha: process.env.GITHUB_SHA
  },
  thresholds: {
    statements: 90,
    branches: 90,
    functions: 90,
    lines: 90
  }
};

// Send HTTP POST request
function sendWebhook(url, payload) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(payload);
    const urlParts = new URL(url);

    const options = {
      hostname: urlParts.hostname,
      port: urlParts.port || 443,
      path: urlParts.pathname + urlParts.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    };

    const req = https.request(options, (res) => {
      let responseBody = '';
      res.on('data', (chunk) => {
        responseBody += chunk;
      });
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(responseBody);
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${responseBody}`));
        }
      });
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

// Send Slack notification
async function sendSlackNotification(message, color = 'good') {
  if (!config.slackWebhook) return;

  const payload = {
    attachments: [
      {
        color: color,
        title: 'Graph Package Test Results',
        text: message,
        footer: 'Academic Explorer CI/CD',
        ts: Math.floor(Date.now() / 1000)
      }
    ]
  };

  try {
    await sendWebhook(config.slackWebhook, payload);
    console.log('✅ Slack notification sent successfully');
  } catch (error) {
    console.error('❌ Failed to send Slack notification:', error.message);
  }
}

// Send Discord notification
async function sendDiscordNotification(message, color = 3066993) {
  if (!config.discordWebhook) return;

  const payload = {
    embeds: [
      {
        title: 'Graph Package Test Results',
        description: message,
        color: color,
        timestamp: new Date().toISOString(),
        footer: {
          text: 'Academic Explorer CI/CD'
        }
      }
    ]
  };

  try {
    await sendWebhook(config.discordWebhook, payload);
    console.log('✅ Discord notification sent successfully');
  } catch (error) {
    console.error('❌ Failed to send Discord notification:', error.message);
  }
}

// Update GitHub status check
async function updateGitHubStatus(state, description, context = 'coverage/graph-package') {
  if (!config.github.token || !config.github.repo || !config.github.sha) return;

  const [owner, repo] = config.github.repo.split('/');
  const url = `https://api.github.com/repos/${owner}/${repo}/statuses/${config.github.sha}`;

  const payload = {
    state: state, // pending, success, error, failure
    description: description,
    context: context
  };

  try {
    await sendWebhook(url, payload, {
      'Authorization': `token ${config.github.token}`,
      'User-Agent': 'Academic-Explorer-CI'
    });
    console.log('✅ GitHub status updated successfully');
  } catch (error) {
    console.error('❌ Failed to update GitHub status:', error.message);
  }
}

// Analyze test results
function analyzeTestResults(testResultsPath) {
  if (!fs.existsSync(testResultsPath)) {
    return {
      exists: false,
      error: 'Test results file not found'
    };
  }

  try {
    const results = JSON.parse(fs.readFileSync(testResultsPath, 'utf8'));

    return {
      exists: true,
      numTotalTests: results.numTotalTests || 0,
      numPassedTests: results.numPassedTests || 0,
      numFailedTests: results.numFailedTests || 0,
      numTotalTestSuites: results.numTotalTestSuites || 0,
      numPassedTestSuites: results.numPassedTestSuites || 0,
      numFailedTestSuites: results.numFailedTestSuites || 0,
      testResults: results.testResults || [],
      success: results.success || false
    };
  } catch (error) {
    return {
      exists: false,
      error: `Failed to parse test results: ${error.message}`
    };
  }
}

// Analyze coverage results
function analyzeCoverage(coveragePath) {
  if (!fs.existsSync(coveragePath)) {
    return {
      exists: false,
      error: 'Coverage file not found'
    };
  }

  try {
    const coverage = JSON.parse(fs.readFileSync(coveragePath, 'utf8'));
    const total = coverage.total;

    const failed = [];
    if (total.statements.pct < config.thresholds.statements) failed.push('statements');
    if (total.branches.pct < config.thresholds.branches) failed.push('branches');
    if (total.functions.pct < config.thresholds.functions) failed.push('functions');
    if (total.lines.pct < config.thresholds.lines) failed.push('lines');

    return {
      exists: true,
      total: total,
      thresholdsFailed: failed,
      passesThresholds: failed.length === 0
    };
  } catch (error) {
    return {
      exists: false,
      error: `Failed to parse coverage data: ${error.message}`
    };
  }
}

// Generate notification message
function generateMessage(testResults, coverage) {
  let message = '🧪 **Graph Package Test Results**\\n\\n';

  // Test results
  if (testResults.exists) {
    if (testResults.success) {
      message += `✅ All tests passed! (${testResults.numPassedTests}/${testResults.numTotalTests})\\n`;
    } else {
      message += `❌ Tests failed: ${testResults.numFailedTests}/${testResults.numTotalTests} tests failed\\n`;
      message += `📊 Test suites: ${testResults.numPassedTestSuites}/${testResults.numTotalTestSuites} passed\\n`;
    }
  } else {
    message += `⚠️ Test results not available: ${testResults.error}\\n`;
  }

  message += '\\n';

  // Coverage results
  if (coverage.exists) {
    if (coverage.passesThresholds) {
      message += '✅ **Coverage thresholds met!**\\n';
    } else {
      message += '❌ **Coverage thresholds not met:**\\n';
      coverage.thresholdsFailed.forEach(metric => {
        const actual = coverage.total[metric].pct;
        const threshold = config.thresholds[metric];
        message += `  • ${metric}: ${actual}% (required: ${threshold}%)\\n`;
      });
    }

    message += '\\n📊 **Coverage Summary:**\\n';
    message += `  • Statements: ${coverage.total.statements.pct}%\\n`;
    message += `  • Branches: ${coverage.total.branches.pct}%\\n`;
    message += `  • Functions: ${coverage.total.functions.pct}%\\n`;
    message += `  • Lines: ${coverage.total.lines.pct}%\\n`;
  } else {
    message += `⚠️ Coverage data not available: ${coverage.error}\\n`;
  }

  return message;
}

// Main function
async function sendNotifications(testResultsPath = './coverage/test-results.json', coveragePath = './coverage/coverage-summary.json') {
  console.log('📢 Processing test notifications...');

  const testResults = analyzeTestResults(testResultsPath);
  const coverage = analyzeCoverage(coveragePath);

  const message = generateMessage(testResults, coverage);
  console.log('\\n' + message.replace(/\\\\n/g, '\\n'));

  // Determine overall status
  const allPassed = (testResults.exists ? testResults.success : false) &&
                   (coverage.exists ? coverage.passesThresholds : false);

  const color = allPassed ? 'good' : 'danger';
  const discordColor = allPassed ? 3066993 : 15158332; // Green : Red

  // Send notifications
  const notifications = [];

  if (config.slackWebhook) {
    notifications.push(sendSlackNotification(message, color));
  }

  if (config.discordWebhook) {
    notifications.push(sendDiscordNotification(message, discordColor));
  }

  if (config.github.token) {
    const state = allPassed ? 'success' : 'failure';
    const description = allPassed
      ? 'All tests passed and coverage thresholds met'
      : 'Tests failed or coverage thresholds not met';
    notifications.push(updateGitHubStatus(state, description));
  }

  // Wait for all notifications
  if (notifications.length > 0) {
    try {
      await Promise.all(notifications);
      console.log('✅ All notifications sent successfully');
    } catch (error) {
      console.error('❌ Some notifications failed:', error.message);
    }
  } else {
    console.log('ℹ️ No notification webhooks configured');
  }

  // Exit with appropriate code
  if (!allPassed) {
    console.log('❌ Tests failed or coverage insufficient');
    process.exit(1);
  } else {
    console.log('✅ All checks passed');
    process.exit(0);
  }
}

// Run if called directly
if (require.main === module) {
  const testResultsPath = process.argv[2] || './coverage/test-results.json';
  const coveragePath = process.argv[3] || './coverage/coverage-summary.json';
  sendNotifications(testResultsPath, coveragePath);
}

module.exports = {
  sendNotifications,
  analyzeTestResults,
  analyzeCoverage,
  generateMessage
};