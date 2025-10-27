import { Tree } from '@nx/devkit'
import { LibraryBase, LibraryGeneratorOptions } from '../base/LibraryBase'
import { NormalizedOptions } from '../base/BaseGenerator'

export interface NormalizedLibraryGeneratorSchema extends NormalizedOptions {
  // Library-specific normalized options
  projectName: string
}

/**
 * Utility library generator
 */
class UtilityLibrary extends LibraryBase {
  protected libraryType = 'utility' as const

  protected normalizeOptions(): NormalizedLibraryGeneratorSchema {
    const name = this.names.fileName
    const projectDirectory = this.options.directory || name
    const projectName = name.replace(/-/g, '')
    const projectRoot = `packages/${projectDirectory}`

    const parsedTags = [
      'type:lib',
      'scope:utility',
      ...(this.options.tags ? this.options.tags.map(tag => typeof tag === 'string' && tag.startsWith('@') ? tag : `@${tag}`) : []),
    ]

    const importPath =
      this.options.importPath || `@academic-explorer/${projectDirectory}`

    const className = this.names.className
    const fileName = this.names.fileName

    return {
      projectName,
      projectRoot,
      projectDirectory,
      parsedTags,
      importPath,
      className,
      fileName,
    }
  }

  protected generateMainLibContent(): string {
    return `/**
 * Utility functions for ${this.normalizedOptions.className}
 */

/**
 * TODO: Add utility functions here
 */
export const ${this.normalizedOptions.fileName} = {
  // Add utility functions as properties
}

/**
 * TODO: Add class-based utilities
 */
export class ${this.normalizedOptions.className} {
  // Add class-based utilities here
}
`
  }
}

/**
 * Feature library generator
 */
class FeatureLibrary extends LibraryBase {
  protected libraryType = 'feature' as const

  protected normalizeOptions(): NormalizedLibraryGeneratorSchema {
    const name = this.names.fileName
    const projectDirectory = this.options.directory || name
    const projectName = name.replace(/-/g, '')
    const projectRoot = `packages/${projectDirectory}`

    const parsedTags = [
      'type:lib',
      'scope:feature',
      ...(this.options.tags ? this.options.tags.map(tag => typeof tag === 'string' && tag.startsWith('@') ? tag : `@${tag}`) : []),
    ]

    const importPath =
      this.options.importPath || `@academic-explorer/${projectDirectory}`

    const className = this.names.className
    const fileName = this.names.fileName

    return {
      projectName,
      projectRoot,
      projectDirectory,
      parsedTags,
      importPath,
      className,
      fileName,
    }
  }

  protected generateMainLibContent(): string {
    return `/**
 * Feature functionality for ${this.normalizedOptions.className}
 */

/**
 * TODO: Add feature functions here
 */
export const ${this.normalizedOptions.fileName} = {
  // Add feature functions as properties
}

/**
 * TODO: Add feature classes
 */
export class ${this.normalizedOptions.className} {
  // Add feature classes here
}
`
  }
}

/**
 * Data library generator
 */
class DataLibrary extends LibraryBase {
  protected libraryType = 'data' as const

  protected normalizeOptions(): NormalizedLibraryGeneratorSchema {
    const name = this.names.fileName
    const projectDirectory = this.options.directory || name
    const projectName = name.replace(/-/g, '')
    const projectRoot = `packages/${projectDirectory}`

    const parsedTags = [
      'type:lib',
      'scope:data',
      ...(this.options.tags ? this.options.tags.map(tag => typeof tag === 'string' && tag.startsWith('@') ? tag : `@${tag}`) : []),
    ]

    const importPath =
      this.options.importPath || `@academic-explorer/${projectDirectory}`

    const className = this.names.className
    const fileName = this.names.fileName

    return {
      projectName,
      projectRoot,
      projectDirectory,
      parsedTags,
      importPath,
      className,
      fileName,
    }
  }

  protected generateMainLibContent(): string {
    return `/**
 * Data handling for ${this.normalizedOptions.className}
 */

import { z } from 'zod'

/**
 * TODO: Add data schemas using Zod
 */
export const ${this.normalizedOptions.className}Schema = z.object({
  // Define data schema here
})

export type ${this.normalizedOptions.className} = z.infer<typeof ${this.normalizedOptions.className}Schema>

/**
 * TODO: Add data validation functions
 */
export const validate${this.normalizedOptions.className} = (data: unknown): ${this.normalizedOptions.className} => {
  return ${this.normalizedOptions.className}Schema.parse(data)
}

/**
 * TODO: Add data transformation functions
 */
export const transform${this.normalizedOptions.className} = (data: unknown): ${this.normalizedOptions.className} => {
  // Add transformation logic here
  return validate${this.normalizedOptions.className}(data)
}
`
  }

  protected createPackageJson(): void {
    super.createPackageJson(
      {
        'zod': '^4.1.11',
      },
      {
        'vitest': '^3.2.4',
        '@vitest/coverage-v8': '^3.2.4',
        'typescript-eslint': '^8.44.1',
      }
    )
  }
}

/**
 * UI library generator
 */
class UILibrary extends LibraryBase {
  protected libraryType = 'ui' as const

  protected normalizeOptions(): NormalizedLibraryGeneratorSchema {
    const name = this.names.fileName
    const projectDirectory = this.options.directory || name
    const projectName = name.replace(/-/g, '')
    const projectRoot = `packages/${projectDirectory}`

    const parsedTags = [
      'type:lib',
      'scope:ui',
      ...(this.options.tags ? this.options.tags.map(tag => typeof tag === 'string' && tag.startsWith('@') ? tag : `@${tag}`) : []),
    ]

    const importPath =
      this.options.importPath || `@academic-explorer/${projectDirectory}`

    const className = this.names.className
    const fileName = this.names.fileName

    return {
      projectName,
      projectRoot,
      projectDirectory,
      parsedTags,
      importPath,
      className,
      fileName,
    }
  }

  protected generateMainLibContent(): string {
    return `import { type } from 'react'

export interface ${this.normalizedOptions.className}Props {
  className?: string
  children?: React.ReactNode
}

/**
 * TODO: Add UI component here
 */
export function ${this.normalizedOptions.className}({
  className,
  children,
  ...props
}: ${this.normalizedOptions.className}Props): JSX.Element {
  return (
    <div className={className} {...props}>
      {children}
    </div>
  )
}
`
  }

  protected createPackageJson(): void {
    super.createPackageJson(
      {
        'react': '^18.2.0',
        'react-dom': '^18.2.0',
        '@mantine/core': '^7.0.0',
        '@mantine/hooks': '^7.0.0',
        '@tabler/icons-react': '^2.0.0',
      },
      {
        'vitest': '^3.2.4',
        '@vitest/coverage-v8': '^3.2.4',
        'typescript-eslint': '^8.44.1',
        '@testing-library/react': '^16.3.0',
        '@testing-library/jest-dom': '^6.8.0',
      }
    )
  }

  protected createTsConfig(): void {
    const compilerOptions: Record<string, string | boolean | number | string[]> = {
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
      declaration: true,
      declarationMap: true,
      sourceMap: true,
      rootDir: './src',
      outDir: './dist',
    }

    super.createTsConfig(['../../tsconfig.base.json'], compilerOptions)
  }

  protected createVitestConfig(): void {
    super.createVitestConfig('jsdom')
  }
}

/**
 * Library generator factory
 */
export default async function libraryGenerator(
  tree: Tree,
  options: LibraryGeneratorOptions
) {
  // Select appropriate generator class based on type
  let generator: LibraryBase

  switch (options.type) {
    case 'utility':
      generator = new UtilityLibrary(tree, options)
      break
    case 'feature':
      generator = new FeatureLibrary(tree, options)
      break
    case 'data':
      generator = new DataLibrary(tree, options)
      break
    case 'ui':
      generator = new UILibrary(tree, options)
      break
    default:
      // Default to utility library
      generator = new UtilityLibrary(tree, options)
      break
  }

  return generator.generate()
}