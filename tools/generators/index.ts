/**
 * BibGraph Generators
 *
 * Custom Nx generators for the BibGraph monorepo.
 *
 * Available generators:
 * - library: Create new packages with proper structure
 * - component: Generate React components with testing and Storybook
 * - entity-view: Generate OpenAlex entity views with routing
 * - sync-targets: Sync empty targets to project.json files
 */

// Re-export generators for programmatic use
export { default as syncTargetsGenerator } from "./sync-targets/generator"
