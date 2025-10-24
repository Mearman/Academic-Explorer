// Path join available for future use
// import { join } from 'path'

export interface ConfigBuilderOptions {
  extends?: string[]
  compilerOptions?: Record<string, any>
  include?: string[]
  exclude?: string[]
  references?: Array<{ path: string }>
  files?: string[]
}

/**
 * Builder for creating TypeScript configurations
 */
export class ConfigBuilder {
  private options: ConfigBuilderOptions

  constructor(options: ConfigBuilderOptions = {}) {
    this.options = {
      extends: ['../../tsconfig.base.json'],
      compilerOptions: {
        target: 'es2022',
        module: 'esnext',
        moduleResolution: 'bundler',
        allowSyntheticDefaultImports: true,
        esModuleInterop: true,
        skipLibCheck: true,
        strict: true,
        ...options.compilerOptions,
      },
      include: ['src/**/*.ts'],
      exclude: ['**/*.test.ts', '**/*.spec.ts'],
      ...options,
    }
  }

  /**
   * Build TypeScript configuration
   */
  build(): Record<string, any> {
    const config: Record<string, any> = {}

    if (this.options.extends) {
      config.extends = this.options.extends
    }

    if (this.options.compilerOptions) {
      config.compilerOptions = this.options.compilerOptions
    }

    if (this.options.include) {
      config.include = this.options.include
    }

    if (this.options.exclude) {
      config.exclude = this.options.exclude
    }

    if (this.options.references) {
      config.references = this.options.references
    }

    if (this.options.files) {
      config.files = this.options.files
    }

    return config
  }

  /**
   * Set extends
   */
  setExtends(extendsValue: string[]): this {
    this.options.extends = extendsValue
    return this
  }

  /**
   * Add extend
   */
  addExtend(extend: string): this {
    this.options.extends = [...(this.options.extends || []), extend]
    return this
  }

  /**
   * Set compiler options
   */
  setCompilerOptions(options: Record<string, any>): this {
    this.options.compilerOptions = { ...this.options.compilerOptions, ...options }
    return this
  }

  /**
   * Add compiler option
   */
  addCompilerOption(key: string, value: any): this {
    this.options.compilerOptions = {
      ...this.options.compilerOptions,
      [key]: value,
    }
    return this
  }

  /**
   * Set include patterns
   */
  setInclude(include: string[]): this {
    this.options.include = include
    return this
  }

  /**
   * Add include pattern
   */
  addInclude(pattern: string): this {
    this.options.include = [...(this.options.include || []), pattern]
    return this
  }

  /**
   * Set exclude patterns
   */
  setExclude(exclude: string[]): this {
    this.options.exclude = exclude
    return this
  }

  /**
   * Add exclude pattern
   */
  addExclude(pattern: string): this {
    this.options.exclude = [...(this.options.exclude || []), pattern]
    return this
  }

  /**
   * Add project reference
   */
  addReference(path: string): this {
    this.options.references = [
      ...(this.options.references || []),
      { path },
    ]
    return this
  }

  /**
   * Create library configuration
   */
  static library(options?: ConfigBuilderOptions): ConfigBuilder {
    return new ConfigBuilder({
      ...options,
      compilerOptions: {
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
        declaration: true,
        declarationMap: true,
        sourceMap: true,
        rootDir: './src',
        outDir: './dist',
        ...options?.compilerOptions,
      },
    })
  }

  /**
   * Create React component configuration
   */
  static reactComponent(options?: ConfigBuilderOptions): ConfigBuilder {
    return new ConfigBuilder({
      ...options,
      compilerOptions: {
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
        jsx: 'react-jsx',
        lib: ['dom', 'dom.iterable', 'esnext'],
        ...options?.compilerOptions,
      },
    })
  }

  /**
   * Create Node.js configuration
   */
  static nodejs(options?: ConfigBuilderOptions): ConfigBuilder {
    return new ConfigBuilder({
      ...options,
      compilerOptions: {
        target: 'es2022',
        module: 'esnext',
        moduleResolution: 'node',
        allowSyntheticDefaultImports: true,
        esModuleInterop: true,
        skipLibCheck: true,
        strict: true,
        noUnusedLocals: true,
        noUnusedParameters: true,
        noImplicitReturns: true,
        noFallthroughCasesInSwitch: true,
        declaration: true,
        declarationMap: true,
        sourceMap: true,
        rootDir: './src',
        outDir: './dist',
        ...options?.compilerOptions,
      },
    })
  }
}

/**
 * Builder for creating Vitest configurations
 */
export class VitestConfigBuilder {
  private testEnvironment: 'node' | 'jsdom' | 'happy-dom'
  private globals: boolean = true
  private watch: boolean = false
  private setupFiles: string[] = []
  private testTimeout: number = 10000
  private hookTimeout: number = 10000
  private coverageOptions: Record<string, any>

  constructor(testEnvironment: 'node' | 'jsdom' | 'happy-dom' = 'node') {
    this.testEnvironment = testEnvironment
    this.coverageOptions = {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'coverage/',
        'dist/',
        '**/*.d.ts',
        '**/*.config.{js,ts}',
        '**/test-setup.{js,ts}',
        '**/__tests__/**',
        '**/*.test.{js,ts}',
        '**/*.spec.{js,ts}',
      ],
      thresholds: {
        global: {
          branches: 70,
          functions: 70,
          lines: 70,
          statements: 70,
        },
      },
    }
  }

  /**
   * Build Vitest configuration
   */
  build(): string {
    return `/// <reference types="vitest" />
import { defineConfig } from "vitest/config"
${this.setupFiles.length > 0 ? `import path from "node:path"` : ''}

export default defineConfig({
  test: {
    ${this.globals ? 'globals: true,' : ''}
    environment: "${this.testEnvironment}",
    ${this.setupFiles.length > 0 ? `setupFiles: [${this.setupFiles.map(f => `path.resolve(__dirname, ${f})`).join(', ')}],` : ''}
    watch: ${this.watch},
    testTimeout: ${this.testTimeout},
    hookTimeout: ${this.hookTimeout},
    coverage: ${JSON.stringify(this.coverageOptions, null, 2)},
  },
})
`
  }

  /**
   * Set test environment
   */
  setTestEnvironment(env: 'node' | 'jsdom' | 'happy-dom'): this {
    this.testEnvironment = env
    return this
  }

  /**
   * Enable/disable globals
   */
  setGlobals(enabled: boolean): this {
    this.globals = enabled
    return this
  }

  /**
   * Enable/disable watch mode
   */
  setWatch(enabled: boolean): this {
    this.watch = enabled
    return this
  }

  /**
   * Add setup file
   */
  addSetupFile(file: string): this {
    this.setupFiles.push(file)
    return this
  }

  /**
   * Set test timeout
   */
  setTestTimeout(timeout: number): this {
    this.testTimeout = timeout
    return this
  }

  /**
   * Set hook timeout
   */
  setHookTimeout(timeout: number): this {
    this.hookTimeout = timeout
    return this
  }

  /**
   * Set coverage options
   */
  setCoverage(options: Record<string, any>): this {
    this.coverageOptions = { ...this.coverageOptions, ...options }
    return this
  }

  /**
   * Create for Node.js environment
   */
  static nodejs(options?: { testTimeout?: number; hookTimeout?: number }): VitestConfigBuilder {
    const builder = new VitestConfigBuilder('node')
    if (options?.testTimeout) builder.setTestTimeout(options.testTimeout)
    if (options?.hookTimeout) builder.setHookTimeout(options.hookTimeout)
    return builder
  }

  /**
   * Create for React/JSDOM environment
   */
  static react(options?: { testTimeout?: number; hookTimeout?: number }): VitestConfigBuilder {
    const builder = new VitestConfigBuilder('jsdom')
    if (options?.testTimeout) builder.setTestTimeout(options.testTimeout)
    if (options?.hookTimeout) builder.setHookTimeout(options.hookTimeout)
    return builder
  }
}

/**
 * Builder for creating ESLint configurations
 */
export class EslintConfigBuilder {
  private rules: Record<string, any> = {}
  private ignores: string[] = ['dist/**/*']

  constructor(rules: Record<string, any> = {}) {
    this.rules = rules
  }

  /**
   * Build ESLint configuration
   */
  build(): string {
    return `import tseslint from 'typescript-eslint'
import { config } from 'nx/eslint/plugin'

export default tseslint.config(
  { ignores: [${this.ignores.map(i => `'${i}'`).join(', ')}] },
  {
    files: ['**/*.ts', '**/*.tsx'],
    extends: [...config.tsconfigs, ...tseslint.configs.recommended],
    plugins: {
      '@typescript-eslint': tseslint.plugin,
    },
    rules: {
      ${Object.entries(this.rules).map(([key, value]) => `'${key}': ${JSON.stringify(value)}`).join(',\n      ')}
    },
  },
)
`
  }

  /**
   * Add rule
   */
  addRule(rule: string, value: any): this {
    this.rules[rule] = value
    return this
  }

  /**
   * Add rules
   */
  addRules(rules: Record<string, any>): this {
    this.rules = { ...this.rules, ...rules }
    return this
  }

  /**
   * Add ignore pattern
   */
  addIgnore(pattern: string): this {
    this.ignores.push(pattern)
    return this
  }

  /**
   * Create with strict TypeScript rules
   */
  static strict(): EslintConfigBuilder {
    return new EslintConfigBuilder({
      '@typescript-eslint/no-unused-vars': 'error',
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/prefer-const': 'error',
      '@typescript-eslint/no-non-null-assertion': 'error',
    })
  }

  /**
   * Create with React-specific rules
   */
  static react(): EslintConfigBuilder {
    return new EslintConfigBuilder({
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      '@typescript-eslint/no-unused-vars': 'error',
      '@typescript-eslint/no-explicit-any': 'warn',
    })
  }
}