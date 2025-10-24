import { Tree } from '@nx/devkit'

export interface FileBuilderOptions {
  path: string
  content?: string
  template?: string
  templateVars?: Record<string, unknown>
}

/**
 * Builder for creating files with template support
 */
export class FileBuilder {
  private tree: Tree
  private options: FileBuilderOptions

  constructor(tree: Tree, options: FileBuilderOptions) {
    this.tree = tree
    this.options = options
  }

  /**
   * Generate file content from template
   */
  generateContent(): string {
    if (this.options.content) {
      return this.options.content
    }

    if (this.options.template) {
      return this.processTemplate(this.options.template)
    }

    throw new Error('Either content or template must be provided')
  }

  /**
   * Process template with variable substitution
   */
  private processTemplate(template: string): string {
    let content = template

    // Replace template variables
    if (this.options.templateVars) {
      Object.entries(this.options.templateVars).forEach(([key, value]) => {
        const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g')
        content = content.replace(regex, String(value))
      })
    }

    return content
  }

  /**
   * Create the file
   */
  create(): void {
    const content = this.generateContent()
    this.tree.write(this.options.path, content)
  }

  /**
   * Update file content
   */
  update(newContent: string): void {
    this.options.content = newContent
    this.options.template = undefined
    this.create()
  }

  /**
   * Append content to file
   */
  append(content: string): void {
    const existingContent = this.tree.read(this.options.path, 'utf-8') || ''
    this.update(existingContent + content)
  }

  /**
   * Prepend content to file
   */
  prepend(content: string): void {
    const existingContent = this.tree.read(this.options.path, 'utf-8') || ''
    this.update(content + existingContent)
  }

  /**
   * Check if file exists
   */
  exists(): boolean {
    return this.tree.exists(this.options.path)
  }

  /**
   * Read file content
   */
  read(): string | null {
    return this.tree.read(this.options.path, 'utf-8') || null
  }

  /**
   * Delete file
   */
  delete(): void {
    this.tree.delete(this.options.path)
  }
}

/**
 * Factory for creating FileBuilder instances
 */
export class FileBuilderFactory {
  constructor(private tree: Tree) {}

  /**
   * Create a new FileBuilder
   */
  create(options: FileBuilderOptions): FileBuilder {
    return new FileBuilder(this.tree, options)
  }

  /**
   * Create a FileBuilder with simple content
   */
  withContent(path: string, content: string): FileBuilder {
    return this.create({ path, content })
  }

  /**
   * Create a FileBuilder with template
   */
  withTemplate(path: string, template: string, vars: Record<string, unknown> = {}): FileBuilder {
    return this.create({ path, template, templateVars: vars })
  }

  /**
   * Create a TypeScript file
   */
  createTypeScriptFile(path: string, content: string): FileBuilder {
    const fullPath = path.endsWith('.ts') ? path : `${path}.ts`
    return this.withContent(fullPath, content)
  }

  /**
   * Create a React component file
   */
  createComponentFile(path: string, content: string): FileBuilder {
    const fullPath = path.endsWith('.tsx') ? path : `${path}.tsx`
    return this.withContent(fullPath, content)
  }

  /**
   * Create a test file
   */
  createTestFile(path: string, content: string): FileBuilder {
    const fullPath = path.includes('.test.') ? path : `${path}.test.ts`
    return this.withContent(fullPath, content)
  }

  /**
   * Create a configuration file
   */
  createConfigFile(path: string, config: Record<string, unknown>): FileBuilder {
    const content = JSON.stringify(config, null, 2)
    const fullPath = path.endsWith('.json') ? path : `${path}.json`
    return this.withContent(fullPath, content)
  }

  /**
   * Create a README file
   */
  createReadme(path: string, content: string): FileBuilder {
    const fullPath = path.endsWith('.md') ? path : `${path}/README.md`
    return this.withContent(fullPath, content)
  }
}