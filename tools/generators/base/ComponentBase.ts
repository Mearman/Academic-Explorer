import {
  GeneratorCallback,
} from '@nx/devkit'
import { BaseGenerator } from './BaseGenerator'
// Nx component generator available for future use
// import { componentGenerator as nxComponentGenerator } from '@nx/react'

export interface ComponentGeneratorOptions {
  name: string
  project?: string
  directory?: string
  skipTests?: boolean
  skipStorybook?: boolean
  export?: boolean
  styled?: boolean
  withHooks?: boolean
  withTypes?: boolean
}

export interface NormalizedComponentOptions extends NormalizedOptions {
  targetProject: string
  projectRoot: string
  componentDirectory: string
  skipTests: boolean
  skipStorybook: boolean
  shouldExport: boolean
  shouldUseStyledComponents: boolean
  createHooks: boolean
  createTypes: boolean
}

/**
 * Base class for React component generators
 * Provides standardized component creation patterns
 */
export abstract class ComponentBase extends BaseGenerator<ComponentGeneratorOptions> {
  protected normalizedOptions!: NormalizedComponentOptions

  /**
   * Normalize component generator options
   */
  protected normalizeOptions(): NormalizedComponentOptions {
    const project =
      this.options.project ||
      this.getDefaultProject()

    const componentName = names(this.options.name).fileName
    const className = names(this.options.name).className

    const componentDirectory = this.options.directory
      ? `${this.options.directory}/${componentName}`
      : componentName

    const projectRoot = `apps/web/src/components/${componentDirectory}`

    return {
      projectName: `${project}-${componentName}`,
      projectRoot,
      projectDirectory: componentDirectory,
      parsedTags: ['type:component', 'scope:web'],
      importPath: `@academic-explorer/web/components/${componentDirectory}`,
      className,
      fileName: componentName,
      targetProject: project,
      componentDirectory,
      skipTests: this.options.skipTests ?? false,
      skipStorybook: this.options.skipStorybook ?? false,
      shouldExport: this.options.export ?? true,
      shouldUseStyledComponents: this.options.styled ?? true,
      createHooks: this.options.withHooks ?? false,
      createTypes: this.options.withTypes ?? false,
    }
  }

  /**
   * Get default project for components
   */
  protected getDefaultProject(): string {
    return 'web'
  }

  /**
   * Generate React component file
   */
  protected abstract generateComponentFile(): string

  /**
   * Generate component test file
   */
  protected generateTestFile(): string {
    return `import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ${this.normalizedOptions.className} } from './${this.normalizedOptions.fileName}'

describe('${this.normalizedOptions.className}', () => {
  it('should render successfully', () => {
    render(<${this.normalizedOptions.className} />)
    // TODO: Add specific assertions based on component functionality
  })

  it('should handle required props correctly', () => {
    // TODO: Test component with required props
  })
})
`
  }

  /**
   * Generate Storybook stories
   */
  protected generateStorybookFile(): string {
    return `import type { Meta, StoryObj } from '@storybook/react'
import { ${this.normalizedOptions.className} } from './${this.normalizedOptions.fileName}'

const meta = {
  title: 'Components/${this.normalizedOptions.className}',
  component: ${this.normalizedOptions.className},
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof ${this.normalizedOptions.className}>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    // TODO: Add default props for the component
  },
}

export const Interactive: Story = {
  args: {
    // TODO: Add props for interactive state
  },
}
`
  }

  /**
   * Generate hooks file
   */
  protected generateHooksFile(): string {
    return `import { useState, useCallback, useEffect } from 'react'
import type { ${this.normalizedOptions.className}Props } from './types'

export function use${this.normalizedOptions.className}(initialProps: ${this.normalizedOptions.className}Props) {
  const [props, setProps] = useState(initialProps)

  const updateProps = useCallback((newProps: Partial<${this.normalizedOptions.className}Props>) => {
    setProps(prev => ({ ...prev, ...newProps }))
  }, [])

  useEffect(() => {
    // TODO: Add side effects if needed
  }, [props])

  return {
    props,
    updateProps,
    setProps,
  }
}
`
  }

  /**
   * Generate types file
   */
  protected generateTypesFile(): string {
    return `export interface ${this.normalizedOptions.className}Props {
  // TODO: Define component props
  className?: string
  children?: React.ReactNode
}

export interface ${this.normalizedOptions.className}Ref {
  // TODO: Define ref interface if component uses forwardRef
}
`
  }

  /**
   * Generate index file with exports
   */
  protected generateIndexContent(): string {
    let content = `export { ${this.normalizedOptions.className} } from './${this.normalizedOptions.fileName}'\n`

    if (this.normalizedOptions.createHooks) {
      content += `export { use${this.normalizedOptions.className} } from './hooks'\n`
    }

    if (this.normalizedOptions.createTypes) {
      content += `export type { ${this.normalizedOptions.className}Props, ${this.normalizedOptions.className}Ref } from './types'\n`
    }

    return content
  }

  /**
   * Generate component and all related files
   */
  protected async generateComponent(): Promise<void> {
    // Create component directory
    const componentDir = this.normalizedOptions.projectRoot
    this.tree.write(join(componentDir, '.gitkeep'), '')

    // Generate component file
    const componentContent = this.generateComponentFile()
    this.tree.write(
      join(componentDir, `${this.normalizedOptions.fileName}.tsx`),
      componentContent
    )

    // Generate test file
    if (!this.normalizedOptions.skipTests) {
      const testContent = this.generateTestFile()
      this.tree.write(
        join(componentDir, `${this.normalizedOptions.fileName}.test.tsx`),
        testContent
      )
    }

    // Generate Storybook stories
    if (!this.normalizedOptions.skipStorybook) {
      const storyContent = this.generateStorybookFile()
      this.tree.write(
        join(componentDir, `${this.normalizedOptions.fileName}.stories.tsx`),
        storyContent
      )
    }

    // Generate hooks file
    if (this.normalizedOptions.createHooks) {
      const hooksContent = this.generateHooksFile()
      this.tree.write(
        join(componentDir, 'hooks.ts'),
        hooksContent
      )
    }

    // Generate types file
    if (this.normalizedOptions.createTypes) {
      const typesContent = this.generateTypesFile()
      this.tree.write(
        join(componentDir, 'types.ts'),
        typesContent
      )
    }

    // Generate index file
    this.createIndexFile()

    // Format files
    await this.format()
  }

  /**
   * Generate complete component
   */
  async generate(): Promise<GeneratorCallback> {
    await this.generateComponent()
    this.logCompletion('Component')

    return async () => {
      // Post-generation callback if needed
    }
  }
}