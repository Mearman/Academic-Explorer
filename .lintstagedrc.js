export default {
  // TypeScript and JavaScript files
  '*.{ts,tsx,js,jsx}': [
    // Run ESLint with auto-fix
    'eslint --fix',
    // Type check (without emitting files)
    () => 'pnpm typecheck',
    // Add files back to git staging area after fixes
    'git add'
  ],

  // JSON files
  '*.json': [
    'eslint --fix',
    'git add'
  ],

  // CSS files (if any vanilla extract files need linting)
  '*.{css,scss}': [
    'eslint --fix',
    'git add'
  ]
};