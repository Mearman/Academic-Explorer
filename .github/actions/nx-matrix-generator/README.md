# Nx Dependency Matrix Generator

A reusable GitHub Action that dynamically generates matrix jobs from your Nx workspace dependency graph. This action analyzes your Nx monorepo and creates optimized matrix strategies for parallel CI/CD execution.

## Features

- 🔍 **Dynamic Project Discovery**: Automatically discovers all projects in your Nx workspace
- 🎯 **Smart Filtering**: Filter by project type (app, lib, e2e) or run only affected projects
- 📊 **Dependency-Aware**: Optionally includes dependency information for each project
- ⚡ **Optimized Parallelization**: Control max parallel jobs to balance speed and resource usage
- 🛠️ **Flexible Configuration**: Multiple input options for fine-tuned control
- 📦 **Multiple Output Formats**: Simple names or detailed metadata

## Usage

### Basic Example

```yaml
name: CI

on: [push, pull_request]

jobs:
  # Generate matrix from all projects
  setup:
    runs-on: ubuntu-latest
    outputs:
      matrix: ${{ steps.matrix.outputs.matrix }}
    steps:
      - uses: actions/checkout@v4
      - uses: ./.github/actions/nx-matrix-generator
        id: matrix

  # Use the matrix for parallel testing
  test:
    needs: setup
    runs-on: ubuntu-latest
    strategy:
      matrix:
        project: ${{ fromJson(needs.setup.outputs.matrix) }}
    steps:
      - uses: actions/checkout@v4
      - name: Test ${{ matrix.project }}
        run: npx nx test ${{ matrix.project }}
```

### Filter by Project Type

```yaml
- uses: ./.github/actions/nx-matrix-generator
  id: matrix
  with:
    project-type: 'lib'  # Only libraries
```

### Affected Projects Only

```yaml
- uses: ./.github/actions/nx-matrix-generator
  id: matrix
  with:
    affected-only: 'true'
    base: 'origin/main'
    head: 'HEAD'
```

### Multiple Project Types

```yaml
- uses: ./.github/actions/nx-matrix-generator
  id: matrix
  with:
    project-type: 'app,lib'  # Apps and libraries only
```

### Exclude Specific Projects

```yaml
- uses: ./.github/actions/nx-matrix-generator
  id: matrix
  with:
    exclude: 'e2e,legacy-app'
```

### Include Only Specific Projects

```yaml
- uses: ./.github/actions/nx-matrix-generator
  id: matrix
  with:
    include: 'web,cli,api'  # Only these projects
```

### Full Metadata Output

```yaml
- uses: ./.github/actions/nx-matrix-generator
  id: matrix
  with:
    output-format: 'full'
    with-dependencies: 'true'

- name: Display project info
  run: |
    echo "Project: ${{ matrix.project.name }}"
    echo "Type: ${{ matrix.project.type }}"
    echo "Root: ${{ matrix.project.root }}"
```

### Limit Parallel Jobs

```yaml
- uses: ./.github/actions/nx-matrix-generator
  id: matrix
  with:
    max-parallel: 4  # Only run 4 jobs in parallel
```

## Inputs

| Input | Description | Required | Default |
|-------|-------------|----------|---------|
| `project-type` | Filter by project type: `all`, `app`, `lib`, `e2e`. Comma-separated for multiple. | No | `all` |
| `affected-only` | Only include affected projects based on git changes | No | `false` |
| `base` | Base branch for affected comparison | No | `origin/main` |
| `head` | Head branch for affected comparison | No | `HEAD` |
| `exclude` | Comma-separated list of project names to exclude | No | `''` |
| `include` | Comma-separated list of project names to include (overrides filters) | No | `''` |
| `output-format` | Output format: `names-only` or `full` | No | `names-only` |
| `max-parallel` | Maximum parallel jobs (0 for unlimited) | No | `0` |
| `with-dependencies` | Include project dependencies in metadata | No | `false` |

## Outputs

| Output | Description |
|--------|-------------|
| `matrix` | JSON matrix for GitHub Actions matrix strategy |
| `projects` | Array of project names included in the matrix |
| `count` | Number of projects in the matrix |

## Advanced Examples

### Dependency-Aware Testing

Test projects in dependency order by running multiple matrix jobs:

```yaml
jobs:
  # First, test libraries with no dependencies
  test-foundational:
    uses: ./.github/actions/nx-matrix-generator
    with:
      project-type: 'lib'
      include: 'types,utils'  # Foundational libraries

  # Then test libraries that depend on foundational ones
  test-dependent-libs:
    needs: test-foundational
    uses: ./.github/actions/nx-matrix-generator
    with:
      project-type: 'lib'
      exclude: 'types,utils'

  # Finally test applications
  test-apps:
    needs: test-dependent-libs
    uses: ./.github/actions/nx-matrix-generator
    with:
      project-type: 'app'
```

### Conditional Matrix Based on Changes

```yaml
jobs:
  detect-changes:
    runs-on: ubuntu-latest
    outputs:
      has-changes: ${{ steps.changes.outputs.has-changes }}
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - id: changes
        run: |
          if git diff --quiet origin/main...HEAD; then
            echo "has-changes=false" >> $GITHUB_OUTPUT
          else
            echo "has-changes=true" >> $GITHUB_OUTPUT
          fi

  setup-matrix:
    needs: detect-changes
    runs-on: ubuntu-latest
    outputs:
      matrix: ${{ steps.matrix.outputs.matrix }}
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - uses: ./.github/actions/nx-matrix-generator
        id: matrix
        with:
          affected-only: ${{ needs.detect-changes.outputs.has-changes }}
          base: 'origin/main'
          head: 'HEAD'

  test:
    needs: setup-matrix
    if: needs.setup-matrix.outputs.count > 0
    strategy:
      matrix:
        project: ${{ fromJson(needs.setup-matrix.outputs.matrix) }}
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npx nx test ${{ matrix.project }}
```

### Different Test Strategies per Project Type

```yaml
jobs:
  setup-apps:
    runs-on: ubuntu-latest
    outputs:
      matrix: ${{ steps.matrix.outputs.matrix }}
    steps:
      - uses: actions/checkout@v4
      - uses: ./.github/actions/nx-matrix-generator
        id: matrix
        with:
          project-type: 'app'

  setup-libs:
    runs-on: ubuntu-latest
    outputs:
      matrix: ${{ steps.matrix.outputs.matrix }}
    steps:
      - uses: actions/checkout@v4
      - uses: ./.github/actions/nx-matrix-generator
        id: matrix
        with:
          project-type: 'lib'

  test-apps:
    needs: setup-apps
    strategy:
      matrix:
        project: ${{ fromJson(needs.setup-apps.outputs.matrix) }}
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run E2E tests for ${{ matrix.project }}
        run: npx nx e2e ${{ matrix.project }}

  test-libs:
    needs: setup-libs
    strategy:
      matrix:
        project: ${{ fromJson(needs.setup-libs.outputs.matrix) }}
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run unit tests for ${{ matrix.project }}
        run: npx nx test ${{ matrix.project }}
```

## How It Works

1. **Project Discovery**: Uses `nx show projects` to discover all projects in your workspace
2. **Filtering**: Applies filters based on project type, affected status, and inclusion/exclusion lists
3. **Metadata Enrichment**: Optionally fetches project details and dependencies using `nx show project`
4. **Matrix Generation**: Formats the output as a JSON array suitable for GitHub Actions matrix strategy
5. **Output**: Sets GitHub Actions outputs that can be consumed by other jobs

## Requirements

- Nx workspace with projects configured
- Node.js available in the workflow (for running Nx commands)
- Git checkout with appropriate fetch depth for affected projects

## Local Testing

You can test the matrix generator locally:

```bash
# Test with all projects
npx tsx .github/actions/nx-matrix-generator/generate-matrix.ts

# Test with specific filters
npx tsx .github/actions/nx-matrix-generator/generate-matrix.ts \
  --project-type=lib \
  --affected-only=false \
  --output-format=full

# Test affected projects
npx tsx .github/actions/nx-matrix-generator/generate-matrix.ts \
  --affected-only=true \
  --base=origin/main \
  --head=HEAD
```

## Troubleshooting

### No projects found

- Ensure you've checked out the repository with `actions/checkout@v4`
- Verify your Nx workspace is properly configured
- Check that `nx show projects` works locally

### Affected detection not working

- Ensure you've fetched enough git history with `fetch-depth: 0`
- Verify the base and head references are correct
- Check that the base branch exists in the repository

### Matrix is empty

- Check your filter settings (project-type, exclude, include)
- Verify that projects match your filter criteria
- Use `output-format: full` to see more details

## Contributing

This action is part of the Academic Explorer project. Contributions are welcome!

## License

MIT License - see the project root for details.
