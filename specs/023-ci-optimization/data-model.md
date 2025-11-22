# Data Model: CI/CD Pipeline Optimization

**Feature**: 023-ci-optimization
**Created**: 2025-11-22
**Purpose**: Define data structures for workflow jobs, artifacts, and cache configurations

## Overview

This feature optimizes GitHub Actions workflows through configuration changes only. The "data model" describes the structure of workflow artifacts, cache keys, and path filter outputs rather than application data entities.

## Entity 1: Build Artifact

**Purpose**: Compiled application outputs shared between jobs

**Structure**:
```yaml
BuildArtifact:
  name: string                    # Artifact identifier (e.g., "build-artifacts")
  path:                           # Directory paths to include
    - apps/web/dist              # Web app production bundle
    - apps/cli/dist              # CLI tool compiled outputs
    - packages/*/dist            # All package build outputs
  retention-days: integer         # How long to keep artifact (1-90 days)
  compression-level: integer      # 0-9, default 6 (optional)
```

**Example**:
```yaml
name: build-artifacts
path: |
  apps/web/dist
  apps/cli/dist
  packages/*/dist
retention-days: 1
```

**Validation Rules**:
- `name` must be unique within workflow run
- `path` globs must match at least one file (fail if empty)
- `retention-days` minimum 1, maximum 90
- Total artifact size cannot exceed 10GB (GitHub limit)

**Relationships**:
- Produced by: `build-and-test` job
- Consumed by: `e2e`, `performance`, `deploy` jobs

---

## Entity 2: Cache Key

**Purpose**: Deterministic cache key generation for GitHub Actions cache API

**Structure**:
```yaml
CacheKey:
  primary: string                 # Primary cache key (includes file hashes)
  restore-keys: string[]          # Fallback keys (prefix matching)
  paths: string[]                 # Directories to cache
  version: string                 # Cache schema version (optional)
```

**Cache Types**:

### Nx Computation Cache
```yaml
primary: "${{ runner.os }}-nx-cache-v2-${{ hashFiles('nx.json', '**/project.json', 'pnpm-lock.yaml', 'tsconfig*.json') }}"
restore-keys:
  - "${{ runner.os }}-nx-cache-v2-"
  - "${{ runner.os }}-nx-cache-v1-"
paths:
  - .nx/cache
  - **/node_modules/.cache
  - **/.vite
```

### pnpm Store + Node Modules
```yaml
primary: "pnpm-${{ runner.os }}-${{ hashFiles('pnpm-lock.yaml') }}"
restore-keys:
  - "pnpm-${{ runner.os }}-"
paths:
  - "${{ env.STORE_PATH }}"
  - "**/node_modules"
```

### Playwright Browsers
```yaml
primary: "playwright-${{ runner.os }}-${{ hashFiles('pnpm-lock.yaml') }}"
restore-keys:
  - "playwright-${{ runner.os }}-"
paths:
  - ~/.cache/ms-playwright
```

**Validation Rules**:
- `primary` must be deterministic (same inputs = same key)
- `restore-keys` must be ordered from most specific to least specific
- Cache size per key cannot exceed 10GB
- Total cache size across all keys cannot exceed 10GB

**Cache Invalidation**:
- Automatic when `primary` key changes (file hash mismatch)
- Automatic after 7 days of no access
- Manual via GitHub API (not used in this feature)

---

## Entity 3: Path Filter Output

**Purpose**: Boolean flags indicating which file categories changed

**Structure**:
```yaml
PathFilterOutput:
  code: boolean                   # True if code files changed
  docs: boolean                   # True if documentation files changed
  config: boolean                 # True if CI config files changed
```

**Filter Definitions**:
```yaml
filters:
  code:
    - 'apps/**'                   # Application code
    - 'packages/**'               # Package code
    - 'pnpm-lock.yaml'            # Dependency changes
    - 'nx.json'                   # Nx configuration
    - 'tsconfig*.json'            # TypeScript configuration
  docs:
    - '**.md'                     # Markdown files anywhere
    - 'specs/**'                  # Feature specifications
    - 'docs/**'                   # Documentation directory
  config:
    - '.github/workflows/**'      # Workflow files
    - '.github/actions/**'        # Custom actions
```

**Usage in Job Conditionals**:
```yaml
# Only run e2e if code changed
if: needs.changes.outputs.code == 'true'

# Only skip if ONLY docs changed (code changes still run everything)
if: needs.changes.outputs.code == 'true' || needs.changes.outputs.config == 'true'
```

**Edge Cases**:
- Empty PR (no files changed): All filters = false, no jobs run
- Mixed changes (code + docs): Both filters = true, all jobs run
- New branch (all files "changed"): All filters = true, full pipeline runs
- Force push: Compares against merge base, accurate detection

**Validation Rules**:
- Filter patterns must use valid glob syntax
- At least one filter must be defined
- Filters should be mutually exclusive where possible (avoid overlapping patterns)

---

## Entity 4: Workflow Job

**Purpose**: Individual units of work in the CI/CD pipeline

**Structure**:
```yaml
WorkflowJob:
  id: string                      # Job identifier (e.g., "build-and-test")
  runs-on: string                 # Runner type (e.g., "ubuntu-latest")
  timeout-minutes: integer        # Maximum execution time
  needs: string[]                 # Job dependencies
  if: string                      # Conditional expression (optional)
  outputs:                        # Job outputs for downstream jobs
    [key: string]: string
  steps: Step[]                   # Sequence of actions/commands
```

**Job Dependencies (Current Pipeline)**:
```yaml
build-and-test:
  needs: []                       # No dependencies (runs first)

changes:
  needs: []                       # No dependencies (runs in parallel with build)

e2e:
  needs: [build-and-test, changes]

quality-gates:
  needs: [build-and-test]

coverage:
  needs: [build-and-test]

performance:
  needs: [build-and-test, changes]

deploy:
  needs: [build-and-test, e2e, quality-gates]

post-deploy-e2e:
  needs: [deploy]                 # Currently disabled (if: false)

release:
  needs: [build-and-test, e2e, quality-gates, deploy]

rollback:
  needs: [post-deploy-e2e]

results:
  needs: [build-and-test, quality-gates, e2e, coverage, performance, deploy, post-deploy-e2e, release, rollback]
  if: always()                    # Runs even if dependencies fail
```

**Optimization Impact**:
- `build-and-test`: Uploads artifacts (new step)
- `e2e`, `performance`, `deploy`: Download artifacts instead of rebuilding
- `e2e`, `performance`: Conditional execution based on `changes.outputs.code`
- `quality-gates`: No changes (always runs on main/schedule)

---

## Entity 5: Optimization Metrics

**Purpose**: Track performance improvements before/after optimizations

**Structure**:
```yaml
OptimizationMetrics:
  pipeline_duration_seconds: integer   # Total workflow execution time
  build_duration_seconds: integer      # Build job execution time
  test_duration_seconds: integer       # Test job execution time
  cache_hit_rate_percent: float        # Percentage of cache hits
  artifact_size_bytes: integer         # Total artifact storage used
  github_actions_minutes: integer      # Billable compute minutes consumed
```

**Baseline (Pre-Optimization)**:
```yaml
pipeline_duration_seconds: 2100      # 35 minutes
build_duration_seconds: 720          # 12 minutes (runs 5 times)
test_duration_seconds: 900           # 15 minutes
cache_hit_rate_percent: 60.0         # Current pnpm cache hit rate
artifact_size_bytes: 0               # No artifacts currently
github_actions_minutes: 2100         # 35 minutes × 1 runner
```

**Target (Post-Optimization)**:
```yaml
pipeline_duration_seconds: 1200      # 20 minutes (43% reduction)
build_duration_seconds: 540          # 9 minutes (once, parallelized)
test_duration_seconds: 540           # 9 minutes (parallel job split)
cache_hit_rate_percent: 85.0         # Improved with node_modules cache
artifact_size_bytes: 524288000       # ~500MB (dist folders)
github_actions_minutes: 1470         # 20-25 min × 1 runner (30% reduction)
```

**Measurement Method**:
- Workflow run duration: GitHub Actions UI → Workflow run time
- Job duration: Sum of job execution times from workflow run logs
- Cache hit rate: actions/cache output logs → Cache hit/miss ratio
- Artifact size: GitHub Actions artifacts tab → Total size
- Billable minutes: Repository Insights → Actions usage

---

## State Transitions

### Workflow Execution Flow (With Optimizations)

```
┌─────────────────┐
│  Push/PR Event  │
└────────┬────────┘
         │
         ├─────────────────┐
         │                 │
         ▼                 ▼
┌─────────────────┐  ┌──────────┐
│ build-and-test  │  │ changes  │
│ (builds once,   │  │ (filters │
│  uploads        │  │  paths)  │
│  artifacts)     │  │          │
└────────┬────────┘  └─────┬────┘
         │                 │
         └────────┬────────┘
                  │
         ┌────────┴─────────┬──────────────┐
         │                  │              │
         ▼                  ▼              ▼
┌─────────────────┐  ┌──────────┐  ┌──────────────┐
│ e2e             │  │ quality  │  │ performance  │
│ (downloads      │  │ -gates   │  │ (downloads   │
│  artifacts,     │  │          │  │  artifacts,  │
│  if code        │  │          │  │  if code     │
│  changed)       │  │          │  │  changed OR  │
└────────┬────────┘  └─────┬────┘  │  main push)  │
         │                 │        └───────┬──────┘
         └────────┬────────┘                │
                  │                         │
                  ▼                         │
         ┌────────────────┐                 │
         │ deploy         │                 │
         │ (downloads     │                 │
         │  artifacts)    │◀────────────────┘
         └────────┬───────┘
                  │
                  ▼
         ┌────────────────┐
         │ release        │
         └────────────────┘
```

**Key State Changes**:
1. **Build Artifacts**: `not-exists` → `uploaded` → `downloaded-by-consumers` → `expired-after-1-day`
2. **Cache**: `miss` → `restored` → `used` → `saved` (no reset) → `reused-next-run`
3. **Jobs**: `queued` → `running` OR `skipped-by-filter` → `completed`

---

## Validation Rules Summary

| Entity | Validation Rule | Consequence of Violation |
|--------|----------------|-------------------------|
| Build Artifact | Size < 10GB | Upload fails, workflow fails |
| Build Artifact | Path glob matches files | Upload fails with empty artifact error |
| Cache Key | Deterministic primary key | Cache misses on every run |
| Cache Key | Total cache < 10GB | Oldest caches evicted automatically |
| Path Filter | Valid glob syntax | Filter step fails, workflow fails |
| Path Filter | At least one filter defined | All jobs skip (unintended) |
| Workflow Job | timeout-minutes not exceeded | Job cancelled, workflow may fail |
| Workflow Job | needs dependencies exist | Workflow validation error |

---

## References

- GitHub Actions artifacts: https://docs.github.com/en/actions/using-workflows/storing-workflow-data-as-artifacts
- GitHub Actions caching: https://docs.github.com/en/actions/using-workflows/caching-dependencies-to-speed-up-workflows
- dorny/paths-filter: https://github.com/dorny/paths-filter
- Nx caching: https://nx.dev/concepts/how-caching-works
