import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

interface CoverageReport {
  projects: {
    name: string;
    coverage: {
      lines: { total: number; covered: number; percentage: number };
      functions: { total: number; covered: number; percentage: number };
      branches: { total: number; covered: number; percentage: number };
      statements: { total: number; covered: number; percentage: number };
    };
    summary: string;
  }[];
  totals: {
    lines: { total: number; covered: number; percentage: number };
    functions: { total: number; covered: number; percentage: number };
    branches: { total: number; covered: number; percentage: number };
    statements: { total: number; covered: number; percentage: number };
  };
  overall: number;
  timestamp: string;
}

/**
 * Generate a consolidated workspace coverage report
 */
function generateWorkspaceCoverage(): void {
  const workspaceRoot = process.cwd();
  const coverageDir = join(workspaceRoot, 'coverage');
  const projectsDir = join(workspaceRoot, 'coverage');

  // Ensure coverage directory exists
  if (!existsSync(coverageDir)) {
    mkdirSync(coverageDir, { recursive: true });
  }

  const projects: CoverageReport['projects'] = [];
  const totalLines = { total: 0, covered: 0, percentage: 0 };
  const totalFunctions = { total: 0, covered: 0, percentage: 0 };
  const totalBranches = { total: 0, covered: 0, percentage: 0 };
  const totalStatements = { total: 0, covered: 0, percentage: 0 };

  // List of projects to include in workspace coverage
  const projectList = [
    { name: 'utils', path: 'packages/utils' },
    { name: 'ui', path: 'packages/ui' },
    { name: 'client', path: 'packages/client' },
    { name: 'graph', path: 'packages/graph' },
    { name: 'simulation', path: 'packages/simulation' },
    { name: 'types', path: 'packages/types' },
    { name: 'cli', path: 'apps/cli' },
    { name: 'web', path: 'apps/web' },
  ];

  for (const project of projectList) {
    const projectCoveragePath = join(projectsDir, project.path, 'coverage-final.json');

    if (existsSync(projectCoveragePath)) {
      try {
        const coverageData = JSON.parse(readFileSync(projectCoveragePath, 'utf8'));

        const projectCoverage = {
          name: project.name,
          coverage: {
            lines: coverageData.total?.lines || { total: 0, covered: 0, pct: 0 },
            functions: coverageData.total?.functions || { total: 0, covered: 0, pct: 0 },
            branches: coverageData.total?.branches || { total: 0, covered: 0, pct: 0 },
            statements: coverageData.total?.statements || { total: 0, covered: 0, pct: 0 },
          },
          summary: getStatus(coverageData.total?.lines?.pct || 0),
        };

        projects.push(projectCoverage);

        // Accumulate totals
        totalLines.total += projectCoverage.coverage.lines.total;
        totalLines.covered += projectCoverage.coverage.lines.covered;

        totalFunctions.total += projectCoverage.coverage.functions.total;
        totalFunctions.covered += projectCoverage.coverage.functions.covered;

        totalBranches.total += projectCoverage.coverage.branches.total;
        totalBranches.covered += projectCoverage.coverage.branches.covered;

        totalStatements.total += projectCoverage.coverage.statements.total;
        totalStatements.covered += projectCoverage.coverage.statements.covered;

      } catch (error) {
        console.warn(`Failed to read coverage for ${project.name}:`, error);
      }
    } else {
      // Add project with zero coverage if no coverage file exists
      projects.push({
        name: project.name,
        coverage: {
          lines: { total: 0, covered: 0, percentage: 0 },
          functions: { total: 0, covered: 0, percentage: 0 },
          branches: { total: 0, covered: 0, percentage: 0 },
          statements: { total: 0, covered: 0, percentage: 0 },
        },
        summary: 'No coverage data',
      });
    }
  }

  // Calculate percentages for totals
  totalLines.percentage = totalLines.total > 0 ? Math.round((totalLines.covered / totalLines.total) * 100) : 0;
  totalFunctions.percentage = totalFunctions.total > 0 ? Math.round((totalFunctions.covered / totalFunctions.total) * 100) : 0;
  totalBranches.percentage = totalBranches.total > 0 ? Math.round((totalBranches.covered / totalBranches.total) * 100) : 0;
  totalStatements.percentage = totalStatements.total > 0 ? Math.round((totalStatements.covered / totalStatements.total) * 100) : 0;

  // Calculate overall percentage (average of all metrics)
  const overall = Math.round((
    totalLines.percentage +
    totalFunctions.percentage +
    totalBranches.percentage +
    totalStatements.percentage
  ) / 4);

  const report: CoverageReport = {
    projects,
    totals: {
      lines: {
        total: totalLines.total,
        covered: totalLines.covered,
        percentage: totalLines.percentage,
      },
      functions: {
        total: totalFunctions.total,
        covered: totalFunctions.covered,
        percentage: totalFunctions.percentage,
      },
      branches: {
        total: totalBranches.total,
        covered: totalBranches.covered,
        percentage: totalBranches.percentage,
      },
      statements: {
        total: totalStatements.total,
        covered: totalStatements.covered,
        percentage: totalStatements.percentage,
      },
    },
    overall,
    timestamp: new Date().toISOString(),
  };

  // Write the workspace coverage report
  const reportPath = join(coverageDir, 'workspace-coverage.json');
  writeFileSync(reportPath, JSON.stringify(report, null, 2));

  // Generate HTML report
  generateHtmlReport(report, join(coverageDir, 'workspace-coverage.html'));

  // Generate markdown report
  generateMarkdownReport(report, join(coverageDir, 'workspace-coverage.md'));

  console.log(`\n📊 Workspace Coverage Report Generated`);
  console.log(`📁 JSON: ${reportPath}`);
  console.log(`🌐 HTML: ${join(coverageDir, 'workspace-coverage.html')}`);
  console.log(`📝 Markdown: ${join(coverageDir, 'workspace-coverage.md')}`);
  console.log(`\n📈 Overall Coverage: ${overall}%`);

  // Check if coverage meets threshold
  const coverageThreshold = 70;
  if (overall < coverageThreshold) {
    console.warn(`⚠️  Coverage (${overall}%) is below threshold (${coverageThreshold}%)`);
    process.exit(1);
  } else {
    console.log(`✅ Coverage (${overall}%) meets threshold (${coverageThreshold}%)`);
  }
}

function getStatus(percentage: number): string {
  if (percentage >= 90) return '🟢 Excellent';
  if (percentage >= 80) return '🟡 Good';
  if (percentage >= 70) return '🟠 Acceptable';
  return '🔴 Needs Improvement';
}

function generateHtmlReport(report: CoverageReport, outputPath: string): void {
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Academic Explorer - Workspace Coverage Report</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        h1 { color: #2c3e50; border-bottom: 3px solid #3498db; padding-bottom: 10px; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 30px 0; }
        .metric { text-align: center; padding: 20px; border-radius: 8px; }
        .metric-value { font-size: 2em; font-weight: bold; margin-bottom: 5px; }
        .metric-label { color: #666; font-size: 0.9em; }
        .projects-table { width: 100%; border-collapse: collapse; margin-top: 30px; }
        .projects-table th, .projects-table td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
        .projects-table th { background: #f8f9fa; font-weight: 600; }
        .status-excellent { color: #27ae60; }
        .status-good { color: #f39c12; }
        .status-acceptable { color: #e67e22; }
        .status-poor { color: #e74c3c; }
        .timestamp { text-align: center; color: #666; margin-top: 30px; font-size: 0.9em; }
    </style>
</head>
<body>
    <div class="container">
        <h1>📊 Academic Explorer - Workspace Coverage Report</h1>

        <div class="summary">
            <div class="metric">
                <div class="metric-value">${report.overall}%</div>
                <div class="metric-label">Overall Coverage</div>
            </div>
            <div class="metric">
                <div class="metric-value">${report.totals.lines.percentage}%</div>
                <div class="metric-label">Lines</div>
            </div>
            <div class="metric">
                <div class="metric-value">${report.totals.functions.percentage}%</div>
                <div class="metric-label">Functions</div>
            </div>
            <div class="metric">
                <div class="metric-value">${report.totals.branches.percentage}%</div>
                <div class="metric-label">Branches</div>
            </div>
            <div class="metric">
                <div class="metric-value">${report.totals.statements.percentage}%</div>
                <div class="metric-label">Statements</div>
            </div>
        </div>

        <table class="projects-table">
            <thead>
                <tr>
                    <th>Project</th>
                    <th>Lines</th>
                    <th>Functions</th>
                    <th>Branches</th>
                    <th>Statements</th>
                    <th>Status</th>
                </tr>
            </thead>
            <tbody>
                ${report.projects.map(project => `
                    <tr>
                        <td><strong>${project.name}</strong></td>
                        <td>${project.coverage.lines.percentage}% (${project.coverage.lines.covered}/${project.coverage.lines.total})</td>
                        <td>${project.coverage.functions.percentage}% (${project.coverage.functions.covered}/${project.coverage.functions.total})</td>
                        <td>${project.coverage.branches.percentage}% (${project.coverage.branches.covered}/${project.coverage.branches.total})</td>
                        <td>${project.coverage.statements.percentage}% (${project.coverage.statements.covered}/${project.coverage.statements.total})</td>
                        <td><span class="status-${getStatusClass(project.coverage.lines.percentage)}">${project.summary}</span></td>
                    </tr>
                `).join('')}
            </tbody>
        </table>

        <div class="timestamp">
            Generated on ${new Date(report.timestamp).toLocaleString()}
        </div>
    </div>
</body>
</html>`;

  writeFileSync(outputPath, html);
}

function getStatusClass(percentage: number): string {
  if (percentage >= 90) return 'excellent';
  if (percentage >= 80) return 'good';
  if (percentage >= 70) return 'acceptable';
  return 'poor';
}

function generateMarkdownReport(report: CoverageReport, outputPath: string): void {
  const markdown = `# 📊 Academic Explorer - Workspace Coverage Report

Generated on ${new Date(report.timestamp).toLocaleString()}

## 📈 Overall Coverage: **${report.overall}%**

## 📋 Summary by Project

| Project | Lines | Functions | Branches | Statements | Status |
|---------|-------|-----------|----------|------------|--------|
${report.projects.map(project =>
  `| ${project.name} | ${project.coverage.lines.percentage}% (${project.coverage.lines.covered}/${project.coverage.lines.total}) | ${project.coverage.functions.percentage}% (${project.coverage.functions.covered}/${project.coverage.functions.total}) | ${project.coverage.branches.percentage}% (${project.coverage.branches.covered}/${project.coverage.branches.total}) | ${project.coverage.statements.percentage}% (${project.coverage.statements.covered}/${project.coverage.statements.total}) | ${project.summary} |`
).join('\n')}

## 📊 Detailed Metrics

### Lines Coverage
- **Total:** ${report.totals.lines.total}
- **Covered:** ${report.totals.lines.covered}
- **Percentage:** ${report.totals.lines.percentage}%

### Functions Coverage
- **Total:** ${report.totals.functions.total}
- **Covered:** ${report.totals.functions.covered}
- **Percentage:** ${report.totals.functions.percentage}%

### Branches Coverage
- **Total:** ${report.totals.branches.total}
- **Covered:** ${report.totals.branches.covered}
- **Percentage:** ${report.totals.branches.percentage}%

### Statements Coverage
- **Total:** ${report.totals.statements.total}
- **Covered:** ${report.totals.statements.covered}
- **Percentage:** ${report.totals.statements.percentage}%

---

*This report was generated by the workspace coverage aggregation tool.*`;

  writeFileSync(outputPath, markdown);
}

// Run the coverage generation
generateWorkspaceCoverage();

export { generateWorkspaceCoverage };