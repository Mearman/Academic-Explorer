import { readFileSync } from 'fs';

const config = JSON.parse(readFileSync('./config/conventional-commits.json', 'utf8'));
const COMMIT_TYPE_ENUM = Object.keys(config.types);
const COMMIT_SCOPE_ENUM = Object.keys(config.scopes);

export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    // Enforce shared types
    'type-enum': [2, 'always', COMMIT_TYPE_ENUM],

    // Enforce shared scopes for monorepo
    'scope-enum': [2, 'always', COMMIT_SCOPE_ENUM],

    // Require scope for better organization
    'scope-empty': [2, 'never'],

    // Subject formatting - disabled to allow technical terms and function names
    'subject-case': [0],
    'subject-empty': [2, 'never'],
    'subject-max-length': [2, 'always', 72],

    // Header formatting
    'header-max-length': [2, 'always', 100],

    // Body formatting
    'body-leading-blank': [2, 'always'],
    'body-max-line-length': [2, 'always', 100],

    // Footer formatting
    'footer-leading-blank': [2, 'always']
  }
};