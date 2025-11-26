export default {
  // Package.json files - run syncpack to fix versions and formatting
  // Use function form to prevent lint-staged from passing filenames as args
  '**/package.json': [
    () => 'syncpack fix-mismatches',
    () => 'syncpack format'
  ],

  // TypeScript and JavaScript files in packages and apps
  '{packages,apps}/**/*.{ts,tsx,js,jsx}': [
    // Run cached lint:fix for affected projects using Nx
    'nx affected --target=lint:fix'
  ],

  // Type check all affected projects
  '*.{ts,tsx}': [
    () => 'nx affected --target=typecheck'
  ],

  // GitHub workflow files
  '.github/**/*.yml': [
    // Validate GitHub workflows with actionlint
    'actionlint'
  ],

  '.github/**/*.yaml': [
    // Validate GitHub workflows with actionlint
    'actionlint'
  ]
};