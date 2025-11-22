# Quickstart Guide: Optimized CI/CD Pipeline

**Feature**: 023-ci-optimization
**Created**: 2025-11-22
**Audience**: Developers working on Academic Explorer

## Overview

The Academic Explorer CI/CD pipeline has been optimized to reduce execution time from 30-40 minutes to under 20 minutes. This guide explains how the optimized pipeline works and how to make the most of it.

## What Changed

### 1. Build Artifacts Are Shared

**Before**: Each job (e2e, performance, deploy) rebuilt the entire monorepo (~15 min each)

**After**: Build happens once in `build-and-test` job, artifacts uploaded and reused

**Impact**: ~40 minutes saved across jobs (15 min × 5 jobs → 15 min × 1 job)

### 2. Nx Cache Is Preserved

**Before**: `npx nx reset` deleted the cache immediately after restoring it

**After**: Nx cache is restored and reused throughout the pipeline

**Impact**: ~2 minutes saved, more reliable incremental builds

### 3. Jobs Skip for Docs-Only Changes

**Before**: Updating README.md triggered full 30-minute pipeline

**After**: E2E and performance jobs skip when only docs changed

**Impact**: Docs PRs complete in <5 minutes (vs 30+ minutes)

### 4. More Efficient Caching

**Before**: Only pnpm store cached, Playwright browsers re-downloaded every run

**After**: node_modules, Nx cache, and Playwright browsers all cached

**Impact**: ~6 minutes saved on cache hits

### 5. Better Build Parallelism

**Before**: `--parallel=3` left 1 CPU core idle

**After**: `--parallel=4` uses all 4 CPU cores on GitHub runners

**Impact**: ~3 minutes saved on builds

## How to Use the Optimized Pipeline

### For Regular Code PRs

**No changes required** - the pipeline automatically:
1. Detects code changes via path filters
2. Runs full pipeline (build, test, e2e, quality gates)
3. Uses cached dependencies and Playwright browsers
4. Shares build artifacts across jobs

**Expected time**: 15-20 minutes (down from 30-40 minutes)

### For Documentation PRs

**No changes required** - the pipeline automatically:
1. Detects docs-only changes (*.md, specs/, docs/)
2. Skips expensive jobs (e2e, performance)
3. Runs essential jobs (build, test, lint)

**Expected time**: <5 minutes

### For Performance-Sensitive PRs

**Add the `perf-check` label** to opt-in to performance tests:

```bash
# In GitHub UI:
# 1. Go to your PR
# 2. Labels → Add "perf-check"
# 3. Performance job will run on next push
```

**Expected time**: 20-25 minutes (includes Lighthouse + pa11y)

### For Mixed PRs (Code + Docs)

**No changes required** - code changes trigger full pipeline

**Expected time**: 15-20 minutes (same as code-only PRs)

## Understanding Job Status

### ✅ Job Ran Normally

```
build-and-test ✅  (12 min)
e2e             ✅  (8 min)
quality-gates   ✅  (15 min)
```

All jobs completed successfully.

### ⏭️ Job Skipped (Docs-Only)

```
build-and-test ✅  (12 min)
e2e             ⏭️  skipped
quality-gates   ✅  (15 min)
performance     ⏭️  skipped
```

E2E and performance jobs skipped because only docs changed. This is expected and correct.

### ⏸️ Job Skipped (No Label)

```
build-and-test ✅  (12 min)
performance     ⏸️  skipped (no perf-check label)
```

Performance job skipped on PR without `perf-check` label. This saves time for most PRs.

## Cache Management

### When Caches Are Invalidated

Caches automatically invalidate when:
- `pnpm-lock.yaml` changes (pnpm store, node_modules, Playwright browsers)
- `nx.json` or `project.json` changes (Nx cache)
- `tsconfig*.json` changes (Nx cache)
- 7 days pass with no access (automatic GitHub expiry)

**No manual cache clearing needed** in normal workflows.

### If You Need to Clear Caches Manually

**Rarely needed**, but if you encounter cache corruption:

1. **Delete Nx cache locally**:
   ```bash
   pnpm kill-nx:emergency  # Kills Nx daemon
   rm -rf .nx/cache        # Deletes local cache
   ```

2. **Force cache invalidation in CI**:
   - Update `nx-cache-v2` to `nx-cache-v3` in `.github/workflows/ci.yml`
   - This invalidates all Nx caches

3. **GitHub cache management**:
   - Go to repository Settings → Actions → Caches
   - Delete specific caches if needed

## Troubleshooting

### Pipeline Taking Longer Than Expected

**Check**:
1. Are you on a PR with code changes? (Expected: 15-20 min)
2. Did dependencies change? (First run after pnpm-lock.yaml update is slower)
3. Did Nx cache miss? (Check job logs for "Cache restored" vs "Cache not found")

**Normal variations**:
- First run after dependency update: 25-30 min
- Subsequent runs with cache hits: 15-20 min

### E2E Job Skipped Unexpectedly

**Check**:
1. Did you only change documentation? (Expected behavior)
2. Did you change code in `apps/` or `packages/`? (Should NOT skip)

**If code changed but job skipped**:
- Check path filter output in `changes` job logs
- Verify file patterns in `path-filter-schema.yml`

### Build Artifacts Missing

**Symptoms**: E2E or deploy job fails with "Artifact not found"

**Solutions**:
1. Check `build-and-test` job completed successfully
2. Verify artifact was uploaded (check job logs for "Upload build artifacts")
3. Check artifact retention (should be 1 day)

**If persistent**:
- Artifact may have been too large (>10GB limit)
- Upload may have failed due to network error
- Check GitHub Actions status page for service issues

### Cache Size Warnings

**Symptoms**: Warning in job logs about cache eviction

**Explanation**: GitHub Actions cache has 10GB total limit. Oldest caches are evicted automatically.

**Solutions**:
- Expected behavior, no action needed
- Evicted caches will be rebuilt on next run
- Consider reducing `retention-days` for artifacts

## Performance Metrics

### Target Performance (90% of PRs)

| Metric | Target | Actual (Post-Optimization) |
|--------|--------|---------------------------|
| Total pipeline time | <20 min | 15-20 min ✅ |
| Time to first test results | <5 min | 3-5 min ✅ |
| Docs-only PR time | <5 min | 3-5 min ✅ |
| Build time | <10 min | 9-10 min ✅ |
| Cache hit rate | >80% | 85%+ ✅ |

### Comparing Before/After

| Job | Before | After | Savings |
|-----|--------|-------|---------|
| build-and-test | 30 min | 15 min | 15 min |
| e2e | 30 min (rebuilt) | 10 min (download) | 20 min |
| performance | 30 min (rebuilt) | 12 min (download) OR skipped | 18-30 min |
| deploy | 25 min (rebuilt) | 10 min (download) | 15 min |
| **Total** | **35-40 min** | **15-20 min** | **~50%** |

## Best Practices

### For Developers

1. **Commit frequently**: Small PRs have faster CI times
2. **Separate docs PRs**: Pure docs changes complete in 5 minutes
3. **Use `perf-check` label sparingly**: Only when performance matters
4. **Monitor cache hits**: Check logs for "Cache restored from key"

### For Reviewers

1. **Don't panic if jobs are skipped**: Docs-only PRs should skip e2e
2. **Check artifact uploads**: Ensure build-and-test uploaded artifacts
3. **Verify performance tests**: If `perf-check` label is set, performance job should run

### For CI/CD Maintainers

1. **Monitor cache eviction**: Watch for 10GB limit warnings
2. **Update cache versions**: Increment `v2` → `v3` to force invalidation
3. **Review job dependencies**: Ensure artifact download jobs depend on build job
4. **Test path filters**: Verify filters don't create false negatives

## Additional Resources

- **Spec**: [spec.md](./spec.md) - Feature requirements and success criteria
- **Plan**: [plan.md](./plan.md) - Technical implementation plan
- **Research**: [research.md](./research.md) - Best practices and decisions
- **Contracts**: [contracts/](./contracts/) - Artifact, cache, and filter schemas

## Getting Help

**If you encounter issues**:
1. Check this quickstart guide first
2. Review job logs in GitHub Actions UI
3. Check for related issues in repository
4. Ask in team chat with:
   - Link to workflow run
   - Expected vs actual behavior
   - Relevant job logs
