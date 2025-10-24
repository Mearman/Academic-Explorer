import {
  addProjectConfiguration,
  ProjectConfiguration,
  Tree,
} from '@nx/devkit'
import { join } from 'path'

export interface ProjectBuilderOptions {
  name: string
  root: string
  type: 'application' | 'library'
  sourceRoot?: string
  tags?: string[]
  targets?: Record<string, unknown>
}

/**
 * Builder for creating Nx project configurations
 */
export class ProjectBuilder {
  private tree: Tree
  private options: ProjectBuilderOptions

  constructor(tree: Tree, options: ProjectBuilderOptions) {
    this.tree = tree
    this.options = options
  }

  /**
   * Build project configuration with sensible defaults
   */
  build(): ProjectConfiguration {
    const config: ProjectConfiguration = {
      name: this.options.name,
      root: this.options.root,
      projectType: this.options.type,
      sourceRoot: this.options.sourceRoot || `${this.options.root}/src`,
      tags: this.options.tags || [],
      targets: this.options.targets || this.getDefaultTargets(),
    }

    return config
  }

  /**
   * Add project to workspace
   */
  addProject(config?: ProjectConfiguration): void {
    const projectConfig = config || this.build()
    addProjectConfiguration(this.tree, this.options.name, projectConfig)
  }

  /**
   * Get default targets based on project type
   */
  private getDefaultTargets(): Record<string, unknown> {
    if (this.options.type === 'library') {
      return this.getLibraryTargets()
    } else {
      return this.getApplicationTargets()
    }
  }

  /**
   * Get default library targets
   */
  private getLibraryTargets(): Record<string, unknown> {
    return {
      build: {
        executor: 'nx:run-commands',
        options: {
          command: 'tsc -b',
          cwd: this.options.root,
        },
        inputs: ['production', '^production'],
        outputs: [`${this.options.root}/dist`],
      },
      test: {
        executor: '@nx/vite:test',
        options: {
          passWithNoTests: true,
        },
        inputs: ['default', '^production'],
        outputs: [`${this.options.root}/coverage`],
      },
      lint: {
        executor: '@nx/eslint:lint',
        options: {
          lintFilePatterns: [`${this.options.root}/**/*.{ts,tsx}`],
        },
        inputs: ['default', '^production'],
        outputs: [`${this.options.root}/**/*.{js,jsx,ts,tsx}`],
      },
      clean: {
        executor: 'nx:run-commands',
        options: {
          command: 'rm -rf dist coverage .nx/cache',
          cwd: this.options.root,
        },
      },
    }
  }

  /**
   * Get default application targets
   */
  private getApplicationTargets(): Record<string, unknown> {
    return {
      build: {
        executor: '@nx/vite:build',
        options: {
          configFile: join(this.options.root, 'vite.config.ts'),
        },
        inputs: ['production', '^production'],
        outputs: [`${this.options.root}/dist`],
      },
      serve: {
        executor: '@nx/vite:dev-server',
        options: {
          configFile: join(this.options.root, 'vite.config.ts'),
        },
        inputs: ['default', '^production'],
        cache: false,
      },
      preview: {
        executor: '@nx/vite:preview',
        options: {
          configFile: join(this.options.root, 'vite.config.ts'),
        },
        inputs: ['default', '^production'],
        dependsOn: ['build'],
      },
      test: {
        executor: '@nx/vite:test',
        options: {
          configFile: join(this.options.root, 'vitest.config.ts'),
          passWithNoTests: true,
        },
        inputs: ['default', '^production'],
        outputs: [`${this.options.root}/coverage`],
      },
      lint: {
        executor: '@nx/eslint:lint',
        options: {
          lintFilePatterns: [`${this.options.root}/**/*.{ts,tsx}`],
        },
        inputs: ['default', '^production'],
        outputs: [`${this.options.root}/**/*.{js,jsx,ts,tsx}`],
      },
    }
  }

  /**
   * Add custom target
   */
  addTarget(name: string, config: unknown): void {
    this.options.targets = this.options.targets || {}
    this.options.targets[name] = config
  }

  /**
   * Add tags
   */
  addTags(...tags: string[]): void {
    this.options.tags = [...(this.options.tags || []), ...tags]
  }

  /**
   * Set source root
   */
  setSourceRoot(sourceRoot: string): void {
    this.options.sourceRoot = sourceRoot
  }
}