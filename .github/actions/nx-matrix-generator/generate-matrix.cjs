#!/usr/bin/env node

/**
 * Nx Dependency Matrix Generator
 *
 * Dynamically generates GitHub Actions matrix jobs from Nx dependency graph.
 * This script analyzes the Nx workspace and creates a matrix strategy for parallel CI/CD jobs.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Parse command-line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    projectType: 'all',
    affectedOnly: false,
    base: 'origin/main',
    head: 'HEAD',
    exclude: [],
    include: [],
    outputFormat: 'names-only',
    maxParallel: 0,
    withDependencies: false,
  };

  args.forEach((arg) => {
    const [key, value] = arg.split('=');
    const cleanKey = key.replace('--', '');

    switch (cleanKey) {
      case 'project-type':
        options.projectType = value;
        break;
      case 'affected-only':
        options.affectedOnly = value === 'true';
        break;
      case 'base':
        options.base = value;
        break;
      case 'head':
        options.head = value;
        break;
      case 'exclude':
        options.exclude = value ? value.split(',').map(s => s.trim()).filter(Boolean) : [];
        break;
      case 'include':
        options.include = value ? value.split(',').map(s => s.trim()).filter(Boolean) : [];
        break;
      case 'output-format':
        options.outputFormat = value;
        break;
      case 'max-parallel':
        options.maxParallel = parseInt(value, 10);
        break;
      case 'with-dependencies':
        options.withDependencies = value === 'true';
        break;
    }
  });

  return options;
}

// Execute shell command and return output
function exec(command, options = {}) {
  try {
    const result = execSync(command, {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
      ...options,
    });
    return result.trim();
  } catch (error) {
    console.error(`Error executing command: ${command}`);
    console.error(error.message);
    if (error.stderr) {
      console.error('STDERR:', error.stderr.toString());
    }
    throw error;
  }
}

// Get all Nx projects
function getAllProjects() {
  try {
    const output = exec('npx nx show projects --json');
    return JSON.parse(output);
  } catch (error) {
    console.error('Failed to get Nx projects');
    throw error;
  }
}

// Get affected projects
function getAffectedProjects(base, head) {
  try {
    // Get affected projects using Nx
    const output = exec(`npx nx show projects --affected --base=${base} --head=${head} --json`);
    return JSON.parse(output);
  } catch (error) {
    console.warn('Failed to get affected projects, falling back to all projects');
    console.error(error.message);
    return getAllProjects();
  }
}

// Get project details
function getProjectDetails(projectName) {
  try {
    const output = exec(`npx nx show project ${projectName} --json`);
    const project = JSON.parse(output);
    return {
      name: project.name || projectName,
      type: project.projectType || 'unknown',
      root: project.root || '',
      sourceRoot: project.sourceRoot || '',
      targets: project.targets ? Object.keys(project.targets) : [],
      tags: project.tags || [],
      implicitDependencies: project.implicitDependencies || [],
    };
  } catch (error) {
    console.warn(`Failed to get details for project: ${projectName}`);
    return {
      name: projectName,
      type: 'unknown',
      root: '',
      sourceRoot: '',
      targets: [],
      tags: [],
      implicitDependencies: [],
    };
  }
}

// Get project dependencies from the dependency graph
function getProjectDependencies(projectName) {
  try {
    const output = exec(`npx nx show project ${projectName} --json`);
    const project = JSON.parse(output);

    // Extract dependencies from implicitDependencies and targets
    const dependencies = new Set();

    if (project.implicitDependencies) {
      project.implicitDependencies.forEach(dep => dependencies.add(dep));
    }

    return Array.from(dependencies);
  } catch (error) {
    console.warn(`Failed to get dependencies for project: ${projectName}`);
    return [];
  }
}

// Filter projects by type
function filterByType(projects, projectType) {
  if (projectType === 'all') {
    return projects;
  }

  const types = projectType.split(',').map(t => t.trim().toLowerCase());
  const projectDetails = projects.map(name => ({
    name,
    ...getProjectDetails(name),
  }));

  return projectDetails
    .filter(project => {
      // Map common type names
      const normalizedType = project.type.toLowerCase();
      return types.some(type => {
        if (type === 'app' || type === 'application') {
          return normalizedType === 'application' || normalizedType === 'app';
        }
        if (type === 'lib' || type === 'library') {
          return normalizedType === 'library' || normalizedType === 'lib';
        }
        return normalizedType === type;
      });
    })
    .map(project => project.name);
}

// Generate matrix
function generateMatrix(options) {
  console.log('Configuration:', JSON.stringify(options, null, 2));

  // Step 1: Get projects
  let projects = [];

  if (options.include.length > 0) {
    // If specific projects are included, use only those
    projects = options.include;
    console.log(`Using explicitly included projects: ${projects.join(', ')}`);
  } else if (options.affectedOnly) {
    // Get affected projects
    console.log(`Getting affected projects (base: ${options.base}, head: ${options.head})...`);
    projects = getAffectedProjects(options.base, options.head);
    console.log(`Found ${projects.length} affected projects`);
  } else {
    // Get all projects
    console.log('Getting all projects...');
    projects = getAllProjects();
    console.log(`Found ${projects.length} total projects`);
  }

  // Step 2: Filter by type
  if (options.projectType !== 'all') {
    console.log(`Filtering by project type: ${options.projectType}...`);
    const beforeCount = projects.length;
    projects = filterByType(projects, options.projectType);
    console.log(`Filtered from ${beforeCount} to ${projects.length} projects`);
  }

  // Step 3: Apply exclusions
  if (options.exclude.length > 0) {
    console.log(`Excluding projects: ${options.exclude.join(', ')}...`);
    const beforeCount = projects.length;
    projects = projects.filter(p => !options.exclude.includes(p));
    console.log(`Filtered from ${beforeCount} to ${projects.length} projects`);
  }

  // Step 4: Build matrix based on output format
  let matrix;

  if (options.outputFormat === 'names-only') {
    // Simple array of project names
    matrix = projects;
  } else {
    // Full format with metadata
    matrix = projects.map(projectName => {
      const details = getProjectDetails(projectName);
      const item = {
        name: projectName,
        type: details.type,
        root: details.root,
        targets: details.targets,
      };

      if (options.withDependencies) {
        item.dependencies = getProjectDependencies(projectName);
      }

      return item;
    });
  }

  // Step 5: Apply max parallel limit
  if (options.maxParallel > 0 && matrix.length > options.maxParallel) {
    console.log(`Limiting matrix to ${options.maxParallel} projects (from ${matrix.length})...`);
    matrix = matrix.slice(0, options.maxParallel);
  }

  return {
    matrix: matrix,
    projects: projects.slice(0, options.maxParallel > 0 ? options.maxParallel : projects.length),
    count: matrix.length,
  };
}

// Set GitHub Actions output
function setOutput(name, value) {
  const githubOutput = process.env.GITHUB_OUTPUT;

  if (githubOutput) {
    const output = typeof value === 'string' ? value : JSON.stringify(value);
    fs.appendFileSync(githubOutput, `${name}=${output}\n`);
  } else {
    // For local testing
    console.log(`::set-output name=${name}::${typeof value === 'string' ? value : JSON.stringify(value)}`);
  }
}

// Main execution
function main() {
  try {
    console.log('🚀 Nx Dependency Matrix Generator');
    console.log('='.repeat(60));

    const options = parseArgs();
    const result = generateMatrix(options);

    console.log('='.repeat(60));
    console.log(`✅ Generated matrix with ${result.count} projects`);
    console.log('Projects:', result.projects.join(', '));

    // Set GitHub Actions outputs
    setOutput('matrix', result.matrix);
    setOutput('projects', result.projects);
    setOutput('count', result.count);

    console.log('='.repeat(60));
    console.log('Matrix JSON:');
    console.log(JSON.stringify(result.matrix, null, 2));

    process.exit(0);
  } catch (error) {
    console.error('❌ Failed to generate matrix');
    console.error(error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

module.exports = { generateMatrix, parseArgs };
