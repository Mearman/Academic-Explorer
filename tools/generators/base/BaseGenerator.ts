import {
  GeneratorCallback,
  ProjectConfiguration,
  Tree,
  addProjectConfiguration,
  generateFiles,
  offsetFromRoot,
  formatFiles,
  names,
} from '@nx/devkit'
import { join } from 'path'
// Nx generators available for future use
// import { libraryGenerator as nxLibraryGenerator } from '@nx/js'
// import { componentGenerator as nxComponentGenerator } from '@nx/react'

/**
 * Abstract base class for all Academic Explorer generators
 * Provides common functionality and standardized patterns
 */
export abstract class BaseGenerator<TSchema extends Record<string, unknown>> {
  protected tree: Tree
  protected options: TSchema
  protected normalizedOptions: NormalizedOptions
  protected names: ReturnType<typeof names>

  constructor(tree: Tree, options: TSchema) {
    this.tree = tree
    this.options = options
    // Initialize names from options if 'name' property exists
    const optionsWithName = options as { name?: string }
    this.names = names(optionsWithName.name || 'default')
    this.normalizedOptions = this.normalizeOptions()
  }

  /**
   * Normalize and validate generator options
   */
  protected abstract normalizeOptions(): NormalizedOptions

  /**
   * Main generator execution method
   */
  abstract generate(): Promise<GeneratorCallback>

  /**
   * Add project configuration to workspace
   */
  protected addProject(projectConfig: ProjectConfiguration): void {
    addProjectConfiguration(
      this.tree,
      this.normalizedOptions.projectName,
      projectConfig
    )
  }

  /**
   * Generate files with proper formatting
   */
  protected async generateFiles(
    templatePath: string,
    targetPath: string,
    templateVars: Record<string, unknown> = {}
  ): Promise<void> {
    const templateOptions = {
      ...templateVars,
      ...this.getTemplateVars(),
      offsetFromRoot: offsetFromRoot(this.normalizedOptions.projectRoot),
      template: '',
    }

    generateFiles(
      this.tree,
      join(__dirname, templatePath),
      this.normalizedOptions.projectRoot,
      templateOptions
    )
  }

  /**
   * Get common template variables
   */
  protected getTemplateVars(): Record<string, unknown> {
    return {
      projectName: this.normalizedOptions.projectName,
      className: this.normalizedOptions.className,
      fileName: this.normalizedOptions.fileName,
      projectRoot: this.normalizedOptions.projectRoot,
      projectDirectory: this.normalizedOptions.projectDirectory,
      parsedTags: this.normalizedOptions.parsedTags,
      importPath: this.normalizedOptions.importPath,
    }
  }

  /**
   * Create a file in the tree
   */
  protected createFile(path: string, content: string): void {
    this.tree.write(join(this.normalizedOptions.projectRoot, path), content)
  }

  /**
   * Create standardized package.json
   */
  protected createPackageJson(
    dependencies: Record<string, string> = {},
    devDependencies: Record<string, string> = {}
  ): void {
    const packageJson = {
      name: this.normalizedOptions.importPath,
      version: '1.0.0',
      description: `${this.normalizedOptions.projectName} package`,
      main: './src/index.ts',
      types: './src/index.ts',
      exports: {
        '.': {
          import: './src/index.ts',
          require: './dist/index.cjs',
          types: './src/index.ts',
        },
      },
      files: ['dist', 'src'],
      scripts: {
        build: 'tsc -b',
        clean: 'rm -rf dist coverage .nx/cache',
      },
      dependencies,
      devDependencies: {
        '@nx/js': '^21.5.3',
        '@nx/workspace': '^21.5.3',
        'typescript': '~5.9.2',
        ...devDependencies,
      },
    }

    this.tree.write(
      join(this.normalizedOptions.projectRoot, 'package.json'),
      JSON.stringify(packageJson, null, 2)
    )
  }

  /**
   * Create TypeScript configuration
   */
  protected createTsConfig(
    extendsConfig: string[] = ['../../tsconfig.base.json'],
    compilerOptions: Record<string, unknown> = {}
  ): void {
    const tsConfig = {
      extends: extendsConfig,
      compilerOptions: {
        rootDir: './src',
        outDir: './dist',
        declaration: true,
        declarationMap: true,
        sourceMap: true,
        ...compilerOptions,
      },
      include: ['src/**/*.ts'],
      exclude: ['**/*.test.ts', '**/*.spec.ts'],
    }

    this.tree.write(
      join(this.normalizedOptions.projectRoot, 'tsconfig.json'),
      JSON.stringify(tsConfig, null, 2)
    )
  }

  /**
   * Create Vitest configuration
   */
  protected createVitestConfig(testEnvironment: 'node' | 'jsdom' = 'node'): void {
    const vitestConfig = `/// <reference types="vitest" />
import { defineConfig } from "vitest/config"
import path from "node:path"

export default defineConfig({
  test: {
    globals: true,
    environment: "${testEnvironment}",
    setupFiles: [],
    watch: false,
    testTimeout: 10000,
    hookTimeout: 10000,
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      exclude: [
        "node_modules/",
        "coverage/",
        "dist/",
        "**/*.d.ts",
        "**/*.config.{js,ts}",
        "**/test-setup.{js,ts}",
        "**/__tests__/**",
        "**/*.test.{js,ts}",
        "**/*.spec.{js,ts}",
      ],
      thresholds: {
        global: {
          branches: 70,
          functions: 70,
          lines: 70,
          statements: 70,
        },
      },
    },
  },
})
`

    this.tree.write(
      join(this.normalizedOptions.projectRoot, 'vitest.config.ts'),
      vitestConfig
    )
  }

  /**
   * Create ESLint configuration
   */
  protected createEslintConfig(
    _rules: Record<string, unknown> = {}
  ): void {
    const eslintConfig = `import tseslint from 'typescript-eslint'
import { config } from 'nx/eslint/plugin'

export default tseslint.config(
  { ignores: ['dist/**/*'] },
  {
    files: ['**/*.ts', '**/*.tsx'],
    extends: [...config.tsconfigs, ...tseslint.configs.recommended],
    plugins: {
      '@typescript-eslint': tseslint.plugin,
    },
    rules: {
      // Custom rules can be added here
      ..._rules,
    },
  },
)
`

    this.tree.write(
      join(this.normalizedOptions.projectRoot, 'eslint.config.ts'),
      eslintConfig
    )
  }

  /**
   * Create index file with exports
   */
  protected createIndexFile(exports: string[] = []): void {
    const content = this.generateIndexContent(exports)
    this.tree.write(
      join(this.normalizedOptions.projectRoot, 'src/index.ts'),
      content
    )
  }

  /**
   * Generate index file content
   */
  protected generateIndexContent(exports: string[]): string {
    if (exports.length === 0) {
      return `// Export main functionality
export * from './lib'
`
    }

    return exports
      .map(exp => `export * from '${exp}'`)
      .join('\n') + '\n'
  }

  /**
   * Format all generated files
   */
  protected async format(): Promise<void> {
    await formatFiles(this.tree)
  }

  /**
   * Log generation completion
   */
  protected logCompletion(generatorType: string): void {
    console.log(`✅ ${generatorType} '${this.normalizedOptions.projectName}' created successfully!`)
    console.log(`📁 Location: ${this.normalizedOptions.projectRoot}`)
  }
}

/**
 * Normalized options interface used by all generators
 */
export interface NormalizedOptions {
  projectName: string
  projectRoot: string
  projectDirectory: string
  parsedTags: string[]
  importPath: string
  className: string
  fileName: string
}

/**
 * Base options interface for all generators
 */
export interface BaseGeneratorOptions {
  name: string
  tags?: string[]
  directory?: string
}