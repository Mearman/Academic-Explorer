# Baseline Performance Metrics

**Feature**: 023-ci-optimization
**Created**: 2025-11-22
**Purpose**: Document current CI/CD pipeline performance before optimizations

## Current Pipeline Configuration

**Workflow File**: `.github/workflows/ci.yml`
**Total Jobs**: 10 (build, changes, quality-gates, e2e, coverage, performance, deploy, post-deploy-e2e, release, rollback, results)

### Job Structure (Pre-Optimization)

| Job | Depends On | Builds? | Timeout | Estimated Duration |
|-----|------------|---------|---------|-------------------|
| build | none | Yes | 30 min | 12-15 min |
| quality-gates | build | Yes (rebuilds) | 40 min | 25-30 min |
| e2e | build | Yes (rebuilds) | 30 min | 20-25 min |
| coverage | build | No | 15 min | 8-10 min |
| performance | build | Yes (rebuilds) | 20 min | 15-20 min |
| deploy | build, e2e, quality-gates | Yes (rebuilds) | 15 min | 10-12 min |
| post-deploy-e2e | deploy | No | 25 min | Disabled |
| release | build, e2e, quality-gates, deploy | No | 20 min | 5-8 min |
| rollback | post-deploy-e2e | No | 10 min | N/A (conditional) |
| results | all | No | 10 min | 2-3 min |

### Current Issues

**Build Redundancy**:
- Build happens 5 times per pipeline run:
  - build job
  - quality-gates job (rebuilds)
  - e2e job (rebuilds)
  - performance job (rebuilds)
  - deploy job (rebuilds)
- Each build: ~12-15 minutes
- Total redundant build time: 48-60 minutes (4 unnecessary builds)

**Nx Cache Reset**:
- Line 88 of ci.yml: `npx nx reset`
- Resets cache immediately after restoration (lines 72-82)
- Defeats purpose of caching
- Estimated impact: ~2 minutes per run + degraded cache efficiency

**Build Parallelism**:
- Current: `--parallel=3` (line 92)
- Available: 4 CPU cores on GitHub ubuntu-latest runners
- Waste: 1 core idle during builds
- Estimated impact: ~20-25% slower builds

**Cache Efficiency**:
- pnpm store: Cached ✅
- node_modules: NOT cached ❌
- Nx cache: Cached then reset ❌
- Playwright browsers: NOT cached ❌ (5 min download every run)

**Job Skipping**:
- Docs-only PRs: Run full 30-40 min pipeline ❌
- Performance tests: Always run on PRs ❌ (even when not needed)

## Baseline Performance (Estimated)

### Typical Code PR

**Wall Clock Time**: 35-40 minutes (longest job wins due to parallelism)

**Critical Path**:
1. build: 15 min
2. e2e OR quality-gates (parallel): 25-30 min
3. deploy (waits for both): 12 min
4. release: 8 min

**Total Compute Minutes** (sum of all jobs):
- build: 15 min
- quality-gates: 30 min
- e2e: 25 min
- coverage: 10 min
- performance: 20 min
- deploy: 12 min
- release: 8 min
- **Total**: ~120 compute minutes per PR

### Docs-Only PR

**Current Behavior**: Same as code PR (30-40 min)
**Should Be**: <5 min (only essential checks)

### Cache Hit Rate

**pnpm store**: ~60% hit rate (invalidates on lockfile changes)
**Playwright**: 0% (not cached)
**Nx**: Unknown (reset defeats caching)

## Target Performance (Post-Optimization)

### Typical Code PR

**Wall Clock Time**: <20 minutes (43% reduction)

**Critical Path** (optimized):
1. build: 9-10 min (faster parallelism)
2. e2e (downloads artifacts): 10 min
3. deploy (downloads artifacts): 10 min
4. release: 8 min

**Total Compute Minutes** (optimized):
- build: 10 min (once, not 5x)
- quality-gates: 15 min (no rebuild)
- e2e: 10 min (no rebuild)
- coverage: 10 min (unchanged)
- performance: SKIPPED on most PRs
- deploy: 10 min (no rebuild)
- release: 8 min (unchanged)
- **Total**: ~63 compute minutes per PR (47% reduction)

### Docs-Only PR

**Target**: <5 minutes
**Optimizations**: Skip e2e, performance jobs

### Cache Hit Rate

**pnpm store + node_modules**: >80%
**Playwright**: >80%
**Nx**: >70% (no reset)

## Success Metrics

| Metric | Baseline | Target | Measurement |
|--------|----------|--------|-------------|
| Code PR time | 35-40 min | <20 min | Workflow run duration |
| Docs PR time | 35-40 min | <5 min | Workflow run duration |
| First test results | 15+ min | <5 min | build completion |
| Build redundancy | 5x builds | 1x build | Count from logs |
| Compute minutes | ~120 min | ~60-80 min | Sum of job durations |
| GitHub Actions cost | Baseline | -30% | Monthly usage report |
| Cache hit rate (pnpm) | 60% | >80% | Cache hit logs |
| Cache hit rate (Playwright) | 0% | >80% | Cache hit logs |
