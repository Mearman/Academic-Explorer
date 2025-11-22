# Research: CI/CD Pipeline Optimization Best Practices

**Feature**: 023-ci-optimization
**Created**: 2025-11-22
**Purpose**: Research GitHub Actions optimization patterns, Nx caching strategies, and parallel test execution approaches

## Research Questions

1. What are the best practices for GitHub Actions build artifact caching?
2. How should we implement path-based job skipping without false negatives?
3. What are the optimal strategies for parallel test execution in Nx monorepos?
4. How can we safely remove the Nx cache reset without breaking builds?
5. What are the GitHub Actions artifact size and cache limits?

## Decision 1: Build Artifact Caching Strategy

**Chosen**: Single build job with artifact upload → multiple consumer jobs with artifact download

**Rationale**:
- GitHub Actions supports uploading/downloading artifacts between jobs in the same workflow run
- `upload-artifact@v4` and `download-artifact@v6` are the latest stable versions
- Artifact retention can be set as low as 1 day for ephemeral build artifacts (vs 90 days default)
- Downloads are much faster than rebuilds (1-2 min vs 15 min)
- Eliminates redundant compilation across 5 jobs (e2e, performance, deploy, post-deploy-e2e, quality-gates)

**Alternatives Considered**:
- **Docker layer caching**: Rejected because project doesn't use Docker for builds
- **GitHub Container Registry**: Rejected as overkill for simple dist/ folders
- **External artifact storage (S3, etc.)**: Rejected due to added complexity and costs
- **Git-based artifact storage**: Rejected due to repository bloat

**Implementation Pattern**:
```yaml
# In build-and-test job
- name: Upload build artifacts
  uses: actions/upload-artifact@v4
  with:
    name: build-artifacts
    path: |
      apps/web/dist
      apps/cli/dist
      packages/*/dist
    retention-days: 1  # Ephemeral, only needed within workflow run

# In consuming jobs (e2e, performance, deploy)
- name: Download build artifacts
  uses: actions/download-artifact@v6
  with:
    name: build-artifacts
```

**References**:
- GitHub Actions Artifacts: https://docs.github.com/en/actions/using-workflows/storing-workflow-data-as-artifacts
- upload-artifact@v4 docs: https://github.com/actions/upload-artifact
- download-artifact@v6 docs: https://github.com/actions/download-artifact

---

## Decision 2: Path-Based Job Skipping

**Chosen**: `dorny/paths-filter@v3` action with explicit file pattern matching

**Rationale**:
- Mature, well-maintained action (v3 released 2024) with 1.8k+ stars
- Supports glob patterns for fine-grained file change detection
- Returns boolean outputs that can be used in job conditionals
- Handles edge cases: PR base branch comparison, initial commits, force pushes
- Avoids shell script fragility and git diff complexity

**Alternatives Considered**:
- **Manual git diff parsing**: Rejected due to edge case handling complexity (merge commits, force pushes, branch creation)
- **GitHub's built-in path filters**: Only work for workflow triggers, not job-level conditionals
- **Custom action development**: Rejected as reinventing the wheel

**Implementation Pattern**:
```yaml
jobs:
  changes:
    runs-on: ubuntu-latest
    outputs:
      code: ${{ steps.filter.outputs.code }}
      docs: ${{ steps.filter.outputs.docs }}
    steps:
      - uses: actions/checkout@v5
      - uses: dorny/paths-filter@v3
        id: filter
        with:
          filters: |
            code:
              - 'apps/**'
              - 'packages/**'
              - 'pnpm-lock.yaml'
              - 'nx.json'
              - 'tsconfig*.json'
            docs:
              - '**.md'
              - 'specs/**'
              - 'docs/**'

  e2e:
    needs: [build-and-test, changes]
    if: needs.changes.outputs.code == 'true'
    # ... rest of job
```

**Edge Cases Handled**:
- Mixed PRs (code + docs): Both filters match → code jobs run
- New branches: All files considered "changed" → full pipeline runs
- Force pushes: Compares against merge base → accurate detection
- Monorepo packages: Granular patterns prevent false positives

**References**:
- dorny/paths-filter: https://github.com/dorny/paths-filter
- GitHub Actions conditional execution: https://docs.github.com/en/actions/using-jobs/using-conditions-to-control-job-execution

---

## Decision 3: Nx Cache Reset Removal

**Chosen**: Remove `npx nx reset` step entirely

**Rationale**:
- Nx cache is already being restored from GitHub Actions cache (@actions/cache@v4)
- Resetting the cache immediately after restoration defeats the purpose of caching
- Nx cache stores task outputs (build, test, lint) for incremental builds
- Current pipeline has 8GB node heap limit, sufficient for Nx daemon
- NX_DAEMON=false is set in CI to prevent daemon hanging issues

**Alternatives Considered**:
- **Selective cache reset**: Rejected as unnecessary complexity
- **Cache versioning**: Already implemented via cache key (includes lockfile hash)
- **Larger cache expiry**: Not needed if reset is removed

**Risk Mitigation**:
- Nx cache key includes `hashFiles('nx.json', '**/project.json', 'pnpm-lock.yaml', 'tsconfig*.json')`
- Cache is automatically invalidated when dependencies or configurations change
- Can manually clear with `nx reset` locally if needed during development
- CI cache has 7-day expiry and 10GB size limit (automatic eviction)

**References**:
- Nx caching guide: https://nx.dev/concepts/how-caching-works
- GitHub Actions cache docs: https://docs.github.com/en/actions/using-workflows/caching-dependencies-to-speed-up-workflows

---

## Decision 4: Parallel Test Execution Strategy

**Chosen**: Keep serial execution within jobs, add optional parallel job splitting for future optimization

**Rationale**:
- Current memory constraint (8GB heap) prevents parallel test execution within a single job
- OOM errors occur when running tests in parallel (documented in CLAUDE.md)
- Splitting tests across multiple jobs requires careful memory management per job
- GitHub-hosted runners provide 16GB RAM, but Nx + Vitest consume significant memory
- Serial execution is slower but reliable (no OOM failures)

**Deferred Optimization** (not in current scope):
```yaml
# Future enhancement: Split tests by package
test-apps:
  run: npx nx test apps/web apps/cli --parallel=false

test-packages:
  run: npx nx test packages/client packages/graph --parallel=false
```

**Current Approach**:
- Keep `maxConcurrency: 1` and `singleThread: true` in vitest.config.ts
- Focus on other optimizations (build artifact caching, job skipping) first
- Monitor memory usage in CI runs to determine if job splitting is feasible

**References**:
- Vitest configuration: https://vitest.dev/config/
- GitHub runner specs: https://docs.github.com/en/actions/using-github-hosted-runners/about-github-hosted-runners

---

## Decision 5: Build Parallelism Increase

**Chosen**: Increase `--parallel` from 3 to 4 to utilize all available CPU cores

**Rationale**:
- GitHub-hosted ubuntu-latest runners have 4 CPU cores (as of 2024)
- Current build uses `--parallel=3`, leaving 1 core idle
- Nx intelligently distributes tasks across workers
- Build timeout is 20 minutes, plenty of headroom for 4-core parallelism
- No memory issues with 4 parallel builds (builds are CPU-bound, not memory-bound)

**Implementation**:
```yaml
- name: Build
  timeout-minutes: 20
  run: npx nx run-many -t build --parallel=4 --max-workers=4
```

**Expected Impact**:
- Build time reduction: ~20-25% (from ~12 min to ~9-10 min)
- No additional memory pressure (builds don't hold state like tests do)
- Better CPU utilization on CI runners

**References**:
- Nx parallelization: https://nx.dev/recipes/running-tasks/run-tasks-in-parallel
- GitHub runner hardware: https://docs.github.com/en/actions/using-github-hosted-runners/about-github-hosted-runners#supported-runners-and-hardware-resources

---

## Decision 6: Playwright Browser Caching

**Chosen**: Cache `~/.cache/ms-playwright` directory with lockfile-based cache key

**Rationale**:
- Playwright browsers are 300-400MB and take 2-3 minutes to download
- Browsers only change when Playwright version in pnpm-lock.yaml changes
- GitHub Actions cache supports caching arbitrary directories
- `playwright install --with-deps` checks for existing browsers before downloading

**Implementation Pattern**:
```yaml
- name: Cache Playwright browsers
  uses: actions/cache@v4
  with:
    path: ~/.cache/ms-playwright
    key: playwright-${{ runner.os }}-${{ hashFiles('pnpm-lock.yaml') }}
    restore-keys: |
      playwright-${{ runner.os }}-

- name: Install Playwright browsers
  run: pnpm exec playwright install --with-deps
```

**Expected Impact**:
- First run: Same time (no cache hit)
- Subsequent runs: 5 min → 2 min (3 min saved)
- Cache invalidates automatically when Playwright version updates

**References**:
- Playwright CI docs: https://playwright.dev/docs/ci-intro
- actions/cache: https://github.com/actions/cache

---

## Decision 7: Node Modules Caching Enhancement

**Chosen**: Add `**/node_modules` to cache paths alongside pnpm store

**Rationale**:
- Current cache only saves pnpm store (`pnpm store path`)
- Restoring node_modules directly skips symlinking overhead
- pnpm creates node_modules with hard links to store, but linking takes time
- Cache key based on pnpm-lock.yaml ensures consistency

**Implementation**:
```yaml
- name: Setup pnpm cache
  uses: actions/cache@v4
  with:
    path: |
      ${{ env.STORE_PATH }}
      **/node_modules
    key: pnpm-${{ runner.os }}-${{ hashFiles('pnpm-lock.yaml') }}
    restore-keys: |
      pnpm-${{ runner.os }}-
```

**Expected Impact**:
- Install time: 5 min → 2 min on cache hits (3 min saved)
- Disk space: ~500MB cached (well within 10GB limit)

**References**:
- pnpm caching docs: https://pnpm.io/continuous-integration#github-actions

---

## Decision 8: Performance Job Conditionality

**Chosen**: Make performance job conditional on main branch pushes or explicit PR label

**Rationale**:
- Performance tests (Lighthouse + pa11y) take 20 minutes
- Most PRs don't need performance validation (feature development)
- Main branch deployments always get performance checks
- Developers can opt-in with `perf-check` label when needed

**Implementation**:
```yaml
performance:
  if: |
    github.event_name == 'push' && github.ref == 'refs/heads/main' ||
    contains(github.event.pull_request.labels.*.name, 'perf-check')
```

**Expected Impact**:
- Typical PR: 20 min saved
- Main branch: No change (still runs)
- Performance-sensitive PRs: Opt-in with label

**References**:
- GitHub Actions expressions: https://docs.github.com/en/actions/learn-github-actions/expressions

---

## Summary of Decisions

| Decision | Time Saved | Risk | Priority |
|----------|-----------|------|----------|
| Build artifact caching | ~15 min | Low | P1 (HIGH) |
| Remove Nx cache reset | ~2 min | Low | P1 (HIGH) |
| Path-based job skipping | 0-50 min* | Medium | P1 (HIGH) |
| Build parallelism (3→4) | ~3 min | Low | P1 (HIGH) |
| Playwright browser cache | ~3 min | Low | P2 (MEDIUM) |
| Node modules cache | ~3 min | Low | P2 (MEDIUM) |
| Performance job optional | 20 min* | Low | P2 (MEDIUM) |
| Parallel test execution | ~8 min | High | P3 (DEFERRED) |

\* Conditional savings based on change type

**Total Expected Savings**: 35-70 minutes per pipeline run (context-dependent)

**Implementation Order**:
1. Build artifact caching + Nx reset removal (P1 - biggest wins)
2. Build parallelism increase (P1 - easy, low risk)
3. Path-based job skipping (P1 - high value for docs PRs)
4. Playwright + node_modules caching (P2 - incremental improvements)
5. Performance job conditionality (P2 - workflow optimization)
6. Parallel tests (P3 - deferred due to memory constraints)
