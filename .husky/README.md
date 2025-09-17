# Git Hooks Setup

This directory contains git hooks managed by [Husky](https://github.com/typicode/husky) that automatically apply linting fixes before commits.

## Installed Hooks

### Pre-commit Hook (`.husky/pre-commit`)

Automatically runs before each git commit and:

1. **Runs ESLint with auto-fix** on all staged TypeScript, JavaScript, and JSON files
2. **Performs TypeScript type checking** to ensure no type errors
3. **Automatically stages fixed files** back to the commit

The hook uses [lint-staged](https://github.com/lint-staged/lint-staged) to only process files that are staged for commit, making it fast and efficient.

## Configuration Files

- **`.lintstagedrc.js`** - Configuration for lint-staged, defines which tools run on which file types
- **`.husky/pre-commit`** - The actual git hook that runs `npx lint-staged`

## Manual Commands

You can manually run these operations:

```bash
# Fix all linting issues in the project
pnpm lint:fix

# Run lint-staged on currently staged files
pnpm lint:staged

# Install/reinstall git hooks
pnpm hooks:install

# Test what lint-staged would do (dry run)
pnpm hooks:test
```

## File Type Handling

| File Pattern | Actions |
|--------------|---------|
| `*.{ts,tsx,js,jsx}` | ESLint auto-fix + TypeScript type checking |
| `*.json` | ESLint auto-fix |
| `*.{css,scss}` | ESLint auto-fix |

## How It Works

1. **Developer runs `git commit`**
2. **Pre-commit hook triggers** automatically
3. **lint-staged identifies** staged files matching configured patterns
4. **ESLint runs with `--fix`** to automatically fix code style issues
5. **TypeScript compiler checks** for type errors (fails commit if errors found)
6. **Fixed files are automatically** added back to the commit
7. **Commit proceeds** if all checks pass

## Benefits

- **Consistent code style** across all commits
- **Prevents commits with linting errors**
- **Automatic fixes** for common style issues
- **Type safety** ensured before commit
- **Fast execution** - only processes staged files
- **No manual intervention** required

## Troubleshooting

### Hook Not Running

If the pre-commit hook isn't running:

```bash
# Reinstall hooks
pnpm hooks:install

# Check hook exists and is executable
ls -la .husky/pre-commit
```

### TypeScript Errors Blocking Commit

If TypeScript errors prevent committing:

```bash
# Check TypeScript errors
pnpm typecheck

# Fix errors and try commit again
```

### Bypassing Hooks (Use Sparingly)

Only for emergency commits when hooks are broken:

```bash
git commit --no-verify -m "emergency: bypass hooks"
```

## Installation for New Contributors

The hooks are automatically installed when running:

```bash
pnpm install
```

This happens via the `prepare` script in `package.json` which runs `husky` after package installation.