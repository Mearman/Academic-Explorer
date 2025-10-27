import { Tree } from '@nx/devkit'
import { ComponentBase, NormalizedComponentOptions, ComponentGeneratorOptions } from '../base/ComponentBase'

interface ReactComponentNormalizedOptions extends NormalizedComponentOptions {
  componentPath: string
  isUiPackage: boolean
  useMantine: boolean
}

/**
 * React component generator
 */
class ReactComponent extends ComponentBase {
  declare protected normalizedOptions: ReactComponentNormalizedOptions

  protected normalizeOptions(): ReactComponentNormalizedOptions {
    const baseOptions = super.normalizeOptions()
    const name = this.names.fileName

    // Determine project root
    const projectRoot =
      this.options.project === "web"
        ? "apps/web"
        : this.options.project?.startsWith("@")
        ? `packages/${this.options.project.replace("@academic-explorer/", "")}`
        : `packages/${this.options.project || "web"}`

    const isUiPackage = this.options.project === "ui" || (this.options.project?.includes("ui") ?? false)

    // Determine component directory
    const baseDirectory = this.options.directory || "components"
    const flat = (this.options as { flat?: boolean }).flat
    const componentDirectory = flat
      ? baseDirectory
      : `${baseDirectory}/${name}`

    const componentPath = `${projectRoot}/src/${componentDirectory}`

    return {
      ...baseOptions,
      componentPath,
      isUiPackage,
      useMantine: this.options.project === "web" || isUiPackage,
    }
  }

  protected generateComponentFile(): string {
    return this.generateComponentContent()
  }

  protected generateComponentContent(): string {
    const props = this.options.story ? 'Props' : ''
    const hookName = `use${this.normalizedOptions.className}`

    if (this.options.withHook) {
      return `import { useState, useEffect } from 'react'

export interface ${this.normalizedOptions.className}Props${props} {
  className?: string
  children?: React.ReactNode
}

/**
 * Hook for ${this.normalizedOptions.className} logic
 */
export function ${hookName}() {
  const [state, setState] = useState(null)

  useEffect(() => {
    // Add hook logic here
  }, [])

  return { state, setState }
}

/**
 * TODO: Add component implementation here
 */
export function ${this.normalizedOptions.className}({
  className,
  children,
  ...props
}: ${this.normalizedOptions.className}Props${props}): JSX.Element {
  const hookData = ${hookName}()

  return (
    <div className={className} {...props}>
      {children}
    </div>
  )
}
`
    } else {
      return `import { type } from 'react'

export interface ${this.normalizedOptions.className}Props${props} {
  className?: string
  children?: React.ReactNode
}

/**
 * TODO: Add component implementation here
 */
export function ${this.normalizedOptions.className}({
  className,
  children,
  ...props
}: ${this.normalizedOptions.className}Props${props}): JSX.Element {
  return (
    <div className={className} {...props}>
      {children}
    </div>
  )
}
`
    }
  }

  protected generateHookContent(): string {
    if (!this.options.withHook) return ''

    const hookName = `use${this.normalizedOptions.className}`

    return `import { useState, useEffect } from 'react'

/**
 * Hook for ${this.normalizedOptions.className} functionality
 */
export function ${hookName}<T = unknown>() {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const execute = async (params?: any) => {
    setLoading(true)
    setError(null)

    try {
      // Add hook logic here
      const result = await Promise.resolve(params)
      setData(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  return {
    data,
    loading,
    error,
    execute,
  }
}
`
  }

  protected generateTestContent(): string {
    const _hasHook = this.options.withHook ? 'hook' : ''

    return `import { render, screen } from '@testing-library/react'
import { ${this.normalizedOptions.className} } from '../${this.normalizedOptions.fileName}'
${this.options.withHook ? `import { use${this.normalizedOptions.className} } from '../${this.normalizedOptions.fileName}.hook'` : ''}

describe('${this.normalizedOptions.className}', () => {
  it('renders correctly', () => {
    render(<${this.normalizedOptions.className}>Test content</${this.normalizedOptions.className}>)
    expect(screen.getByText('Test content')).toBeInTheDocument()
  })

  it('applies className prop correctly', () => {
    render(<${this.normalizedOptions.className} className="test-class">Test</${this.normalizedOptions.className}>)
    const element = screen.getByText('Test')
    expect(element).toHaveClass('test-class')
  })

  ${this.options.withHook ? `it('hook initializes correctly', () => {
    const { result } = renderHook(() => use${this.normalizedOptions.className}())
    expect(result.current.data).toBeNull()
    expect(result.current.loading).toBe(false)
    expect(result.current.error).toBeNull()
  })` : ''}
})
`
  }

  protected generateStoryContent(): string {
    if (!this.options.story) return ''

    return `import type { Meta, StoryObj } from '@storybook/react'
import { ${this.normalizedOptions.className} } from '../${this.normalizedOptions.fileName}'

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
    children: 'Hello, World!',
  },
}

export const WithCustomClass: Story = {
  args: {
    children: 'With custom class',
    className: 'custom-class',
  },
}
`
  }

  protected generateTypeDefinitions(): string {
    return `export interface ${this.normalizedOptions.className}Config {
  // Add component configuration here
}

export interface ${this.normalizedOptions.className}State {
  // Add component state here
}
`
  }

  protected createFiles(): void {
    const { componentPath, fileName } = this.normalizedOptions

    // Main component file
    this.createFile(
      `${componentPath}/${fileName}.tsx`,
      this.generateComponentContent()
    )

    // Hook file (if requested)
    if (this.options.withHook) {
      this.createFile(
        `${componentPath}/${fileName}.hook.ts`,
        this.generateHookContent()
      )
    }

    // Types file
    this.createFile(
      `${componentPath}/${fileName}.types.ts`,
      this.generateTypeDefinitions()
    )

    // Test file
    this.createFile(
      `${componentPath}/${fileName}.test.tsx`,
      this.generateTestContent()
    )

    // Story file (if requested)
    if (this.options.story) {
      this.createFile(
        `${componentPath}/${fileName}.stories.tsx`,
        this.generateStoryContent()
      )
    }

    // Index file
    this.createIndexFile()
  }

  protected createIndexFile(): void {
    const { componentPath, fileName, className } = this.normalizedOptions

    let indexContent = `export { ${className} } from './${fileName}'
export type { ${className}Props } from './${fileName}'
`

    if (this.options.withHook) {
      indexContent += `export { use${className} } from './${fileName}.hook'\n`
    }

    indexContent += `export type { ${className}Config, ${className}State } from './${fileName}.types'\n`

    this.createFile(`${componentPath}/index.ts`, indexContent)
  }
}

/**
 * Component generator factory
 */
export default async function componentGenerator(
  tree: Tree,
  options: ComponentGeneratorOptions
) {
  const generator = new ReactComponent(tree, options)
  return generator.generate()
}