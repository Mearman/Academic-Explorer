export default {
  // TypeScript and JavaScript files
  '*.{ts,tsx,js,jsx}': [
    // Run ESLint with auto-fix
    'eslint --fix',
    // Type check (without emitting files)
    () => 'pnpm typecheck'
  ],

  // JSON files
  '*.json': [
    'eslint --fix'
  ],

  // CSS files (if any vanilla extract files need linting)
  '*.{css,scss}': [
    'eslint --fix'
  ]
};