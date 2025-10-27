import {
  GeneratorCallback,
  ProjectConfiguration,
} from '@nx/devkit'
import { join } from 'path'
import { BaseGenerator } from './BaseGenerator'
// Nx library generator available for future use
// import { libraryGenerator as nxLibraryGenerator } from '@nx/js'

export interface LibraryGeneratorOptions extends Record<string, unknown> {
  name: string
  type?: 'utility' | 'feature' | 'data' | 'ui' | 'shared'
  directory?: string
  tags?: string[]
  importPath?: string
  description?: string
  unitTestRunner?: 'vitest' | 'none'
  bundler?: 'tsc' | 'vite' | 'esbuild'
  skipFormat?: boolean
}

/**
 * Base class for library generators
 * Provides standardized library creation patterns
 */
export abstract class LibraryBase extends BaseGenerator<LibraryGeneratorOptions> {
  protected abstract libraryType: 'utility' | 'feature' | 'data' | 'ui'

  /**
   * Get library-specific project configuration
   */
  protected getProjectConfiguration(): ProjectConfiguration {
    const tags = [
      'type:lib',
      `scope:${this.libraryType}`,
      ...this.normalizedOptions.parsedTags,
    ]

    return {
      name: this.normalizedOptions.projectName,
      root: this.normalizedOptions.projectRoot,
      projectType: 'library',
      sourceRoot: `${this.normalizedOptions.projectRoot}/src`,
      targets: {
        build: {
          executor: 'nx:run-commands',
          options: {
            command: 'tsc -b',
            cwd: this.normalizedOptions.projectRoot,
          },
          inputs: ['production', '^production'],
          outputs: [`${this.normalizedOptions.projectRoot}/dist`],
        },
        test: {
          executor: '@nx/vite:test',
          options: {
            passWithNoTests: true,
          },
          inputs: ['default', '^production'],
          outputs: [`${this.normalizedOptions.projectRoot}/coverage`],
        },
        lint: {
          executor: '@nx/eslint:lint',
          options: {
            lintFilePatterns: [`${this.normalizedOptions.projectRoot}/**/*.{ts,tsx}`],
          },
          inputs: ['default', '^production'],
          outputs: [`${this.normalizedOptions.projectRoot}/**/*.{js,jsx,ts,tsx}`],
        },
        clean: {
          executor: 'nx:run-commands',
          options: {
            command: 'rm -rf dist coverage .nx/cache',
            cwd: this.normalizedOptions.projectRoot,
          },
        },
      },
      tags,
    }
  }

  /**
   * Create library-specific package.json
   */
  protected createPackageJson(
    additionalDependencies?: Record<string, string>,
    additionalDevDependencies?: Record<string, string>
  ): void {
    const baseDependencies: Record<string, string> = {}

    // Add specific dependencies based on library type
    switch (this.libraryType) {
      case 'utility':
        baseDependencies['lodash-es'] = '^4.17.21'
        break
      case 'data':
        baseDependencies['zod'] = '^4.1.11'
        break
      case 'ui':
        baseDependencies['react'] = '^18.2.0'
        baseDependencies['react-dom'] = '^18.2.0'
        break
    }

    super.createPackageJson(
      { ...baseDependencies, ...additionalDependencies },
      {
        vitest: '^3.2.4',
        '@vitest/coverage-v8': '^3.2.4',
        'typescript-eslint': '^8.44.1',
        ...additionalDevDependencies,
      }
    )
  }

  /**
   * Create library-specific TypeScript configuration
   */
  protected createTsConfig(
    extendsConfig?: string[],
    additionalCompilerOptions?: Record<string, unknown>
  ): void {
    const compilerOptions: Record<string, unknown> = {
      target: 'es2022',
      module: 'esnext',
      moduleResolution: 'bundler',
      allowSyntheticDefaultImports: true,
      esModuleInterop: true,
      skipLibCheck: true,
      strict: true,
      noUnusedLocals: true,
      noUnusedParameters: true,
      noImplicitReturns: true,
      noFallthroughCasesInSwitch: true,
    }

    // Add specific compiler options based on library type
    if (this.libraryType === 'ui') {
      compilerOptions.jsx = 'react-jsx'
      compilerOptions.lib = ['dom', 'dom.iterable', 'esnext']
    }

    super.createTsConfig(
      extendsConfig || ['../../tsconfig.base.json'],
      { ...compilerOptions, ...additionalCompilerOptions }
    )
  }

  /**
   * Create library-specific Vitest configuration
   */
  protected createVitestConfig(testEnvironment?: 'node' | 'jsdom'): void {
    const env = testEnvironment || (this.libraryType === 'ui' ? 'jsdom' : 'node')
    super.createVitestConfig(env)
  }

  /**
   * Create main library file
   */
  protected createMainLibFile(): void {
    const content = this.generateMainLibContent()
    this.tree.write(
      join(this.normalizedOptions.projectRoot, 'src/lib.ts'),
      content
    )
  }

  /**
   * Generate main library file content
   */
  protected abstract generateMainLibContent(): string

  /**
   * Create library-specific test file
   */
  protected createTestFile(): void {
    const content = this.generateTestContent()
    this.tree.write(
      join(this.normalizedOptions.projectRoot, 'src/lib.unit.test.ts'),
      content
    )
  }

  /**
   * Generate test file content
   */
  protected generateTestContent(): string {
    return `import { describe, it, expect } from 'vitest'

describe('${this.normalizedOptions.className}', () => {
  it('should be defined', () => {
    // TODO: Add actual tests
    expect(true).toBe(true)
  })
})
`
  }

  /**
   * Create README for the library
   */
  protected createReadme(): void {
    const content = `# ${this.normalizedOptions.className}

${this.libraryType.charAt(0).toUpperCase() + this.libraryType.slice(1)} library for Academic Explorer.

## Installation

\`\`\`bash
pnpm add ${this.normalizedOptions.importPath}
\`\`\`

## Usage

\`\`\`typescript
import { ${this.normalizedOptions.className} } from '${this.normalizedOptions.importPath}'

// TODO: Add usage examples
\`\`\`

## API

TODO: Document the public API

## Development

\`\`\`bash
# Build
pnpm build

# Test
pnpm test

# Lint
pnpm lint

# Clean
pnpm clean
\`\`\`
`

    this.tree.write(
      join(this.normalizedOptions.projectRoot, 'README.md'),
      content
    )
  }

  /**
   * Generate library
   */
  protected async generateLibrary(): Promise<void> {
    // Add project configuration
    this.addProject(this.getProjectConfiguration())

    // Create configuration files
    this.createPackageJson()
    this.createTsConfig()
    this.createVitestConfig()
    this.createEslintConfig()

    // Create source files
    this.createMainLibFile()
    this.createTestFile()
    this.createIndexFile(['./lib'])

    // Create documentation
    this.createReadme()

    // Format files
    await this.format()
  }

  /**
   * Generate complete library
   */
  async generate(): Promise<GeneratorCallback> {
    await this.generateLibrary()
    this.logCompletion('Library')

    return async () => {
      // Post-generation callback if needed
    }
  }
}