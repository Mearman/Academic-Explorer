import {
  GeneratorCallback,
  names,
} from '@nx/devkit'
import { join } from 'path'
import { BaseGenerator, NormalizedOptions } from './BaseGenerator'

export interface EntityViewGeneratorOptions extends Record<string, unknown> {
  entity: string
  name?: string
  project?: string
  withMocks?: boolean
  withIntegration?: boolean
  withE2E?: boolean
  withLazyLoading?: boolean
  withErrorHandling?: boolean
  skipTests?: boolean
  skipFormat?: boolean
}

export interface NormalizedEntityViewOptions extends NormalizedOptions {
  entityName: string
  entityNameCapitalized: string
  entityPlural: string
  entityPluralCapitalized: string
  targetProject: string
  componentDirectory: string
  routeDirectory: string
  createMocks: boolean
  createIntegration: boolean
  createE2E: boolean
  useLazyLoading: boolean
  includeErrorHandling: boolean
  skipTests: boolean
}

/**
 * Base class for OpenAlex entity view generators
 * Provides standardized entity view creation patterns
 */
export abstract class EntityViewBase extends BaseGenerator<EntityViewGeneratorOptions> {
  declare protected normalizedOptions: NormalizedEntityViewOptions

  // OpenAlex entity configurations
  private readonly entityConfigs = {
    works: { plural: 'works', icon: '📄' },
    authors: { plural: 'authors', icon: '👤' },
    sources: { plural: 'sources', icon: '📰' },
    institutions: { plural: 'institutions', icon: '🏛️' },
    topics: { plural: 'topics', icon: '🏷️' },
    publishers: { plural: 'publishers', icon: '📚' },
    funders: { plural: 'funders', icon: '💰' },
  }

  /**
   * Normalize entity view generator options
   */
  protected normalizeOptions(): NormalizedEntityViewOptions {
    const entity = this.options.entity.toLowerCase()
    const entityConfig = this.entityConfigs[entity as keyof typeof this.entityConfigs]

    if (!entityConfig) {
      throw new Error(`Unsupported entity type: ${entity}. Supported types: ${Object.keys(this.entityConfigs).join(', ')}`)
    }

    const entityNames = names(entity)
    const entityName = entityNames.fileName
    const entityNameCapitalized = entityNames.className
    const entityPlural = entityConfig.plural
    const entityPluralCapitalized = names(entityPlural).className

    const project = this.options.project || 'web'
    const componentDirectory = `entity-views/${entityName}`
    const routeDirectory = `entity-views/${entityPlural}`

    const projectRoot = `apps/web/src/components/${componentDirectory}`

    return {
      projectName: `${project}-${entityName}-view`,
      projectRoot,
      projectDirectory: componentDirectory,
      parsedTags: ['type:component', 'scope:entity-view', `entity:${entityName}`],
      importPath: `@academic-explorer/web/components/${componentDirectory}`,
      className: entityNameCapitalized,
      fileName: entityName,
      entityName,
      entityNameCapitalized,
      entityPlural,
      entityPluralCapitalized,
      targetProject: project,
      componentDirectory,
      routeDirectory,
      createMocks: this.options.withMocks ?? true,
      createIntegration: this.options.withIntegration ?? true,
      createE2E: this.options.withE2E ?? true,
      useLazyLoading: this.options.withLazyLoading ?? true,
      includeErrorHandling: this.options.withErrorHandling ?? true,
      skipTests: this.options.skipTests ?? false,
    }
  }

  /**
   * Generate main entity view component
   */
  protected abstract generateMainViewComponent(): string

  /**
   * Generate entity header component
   */
  protected generateHeaderComponent(): string {
    return `import { Card, Group, Stack, Text, Badge } from '@mantine/core'
import type { ${this.normalizedOptions.entityNameCapitalized} } from '@academic-explorer/client'

interface ${this.normalizedOptions.entityNameCapitalized}HeaderProps {
  entity: ${this.normalizedOptions.entityNameCapitalized}
  loading?: boolean
}

export function ${this.normalizedOptions.entityNameCapitalized}Header({ entity, loading }: ${this.normalizedOptions.entityNameCapitalized}HeaderProps) {
  if (loading) {
    return (
      <Card p="md" withBorder>
        <Stack>
          <Text size="lg" fw={500}>Loading...</Text>
        </Stack>
      </Card>
    )
  }

  return (
    <Card p="md" withBorder>
      <Stack gap="sm">
        <Group justify="space-between">
          <Text size="lg" fw={500}>
            {entity.display_name}
          </Text>
          <Badge variant="light">
            ${this.entityConfigs[this.normalizedOptions.entityName as keyof typeof this.entityConfigs]?.icon || '📄'} ${this.normalizedOptions.entityNameCapitalized}
          </Badge>
        </Group>

        {/* TODO: Add entity-specific header information */}
        <Text size="sm" c="dimmed">
          ID: {entity.id}
        </Text>
      </Stack>
    </Card>
  )
}
`
  }

  /**
   * Generate entity content component
   */
  protected generateContentComponent(): string {
    return `import { Tabs, Tab, Card, Stack, Text } from '@mantine/core'
import { IconChartBar, IconInfoCircle } from '@tabler/icons-react'
import { ${this.normalizedOptions.entityNameCapitalized}Header } from './${this.normalizedOptions.fileName}-header'
import type { ${this.normalizedOptions.entityNameCapitalized} } from '@academic-explorer/client'

interface ${this.normalizedOptions.entityNameCapitalized}ContentProps {
  entity: ${this.normalizedOptions.entityNameCapitalized}
  loading?: boolean
}

export function ${this.normalizedOptions.entityNameCapitalized}Content({ entity, loading }: ${this.normalizedOptions.entityNameCapitalized}ContentProps) {
  if (loading) {
    return <div>Loading...</div>
  }

  return (
    <Stack gap="md">
      <${this.normalizedOptions.entityNameCapitalized}Header entity={entity} />

      <Tabs defaultValue="overview">
        <Tab value="overview" leftSection={<IconInfoCircle size={16} />}>
          Overview
        </Tab>
        <Tab value="analytics" leftSection={<IconChartBar size={16} />}>
          Analytics
        </Tab>

        <Tabs.Panel value="overview">
          <Card p="md" withBorder>
            <Stack gap="sm">
              <Text size="lg" fw={500}>Overview</Text>
              <Text>
                {/* TODO: Add overview content for ${this.normalizedOptions.entityName} */}
              </Text>
            </Stack>
          </Card>
        </Tabs.Panel>

        <Tabs.Panel value="analytics">
          <Card p="md" withBorder>
            <Stack gap="sm">
              <Text size="lg" fw={500}>Analytics</Text>
              <Text>
                {/* TODO: Add analytics content for ${this.normalizedOptions.entityName} */}
              </Text>
            </Stack>
          </Card>
        </Tabs.Panel>
      </Tabs>
    </Stack>
  )
}
`
  }

  /**
   * Generate loading skeleton component
   */
  protected generateLoadingSkeletonComponent(): string {
    return `import { Stack, Skeleton, Card } from '@mantine/core'

export function ${this.normalizedOptions.entityNameCapitalized}LoadingSkeleton() {
  return (
    <Stack gap="md">
      <Card p="md" withBorder>
        <Stack gap="sm">
          <Skeleton height={24} width="60%" />
          <Skeleton height={16} width="40%" />
          <Skeleton height={16} width="80%" />
        </Stack>
      </Card>

      <Card p="md" withBorder>
        <Stack gap="sm">
          <Skeleton height={20} width="50%" />
          <Skeleton height={100} />
        </Stack>
      </Card>
    </Stack>
  )
}
`
  }

  /**
   * Generate error component
   */
  protected generateErrorComponent(): string {
    return `import { Alert, Button, Stack } from '@mantine/core'
import { IconAlertCircle, IconRefresh } from '@tabler/icons-react'

interface ${this.normalizedOptions.entityNameCapitalized}ErrorProps {
  error: Error
  onRetry?: () => void
}

export function ${this.normalizedOptions.entityNameCapitalized}Error({ error, onRetry }: ${this.normalizedOptions.entityNameCapitalized}ErrorProps) {
  return (
    <Alert
      icon={<IconAlertCircle size={16} />}
      title="Error Loading ${this.normalizedOptions.entityNameCapitalized}"
      color="red"
      variant="light"
    >
      <Stack gap="md">
        <div>
          <strong>Error:</strong> {error.message}
        </div>

        {onRetry && (
          <Button
            leftSection={<IconRefresh size={16} />}
            onClick={onRetry}
            variant="light"
            color="red"
          >
            Retry
          </Button>
        )}
      </Stack>
    </Alert>
  )
}
`
  }

  /**
   * Generate list view component
   */
  protected generateListViewComponent(): string {
    return `import { Card, Stack, Text, Group, Badge, Button } from '@mantine/core'
import { IconExternalLink } from '@tabler/icons-react'
import { useNavigate } from '@tanstack/react-router'
import type { ${this.normalizedOptions.entityNameCapitalized} } from '@academic-explorer/client'

interface ${this.normalizedOptions.entityNameCapitalized}ListViewProps {
  entities: ${this.normalizedOptions.entityNameCapitalized}[]
  loading?: boolean
}

export function ${this.normalizedOptions.entityNameCapitalized}ListView({ entities, loading }: ${this.normalizedOptions.entityNameCapitalized}ListViewProps) {
  const navigate = useNavigate()

  if (loading) {
    return (
      <Stack gap="sm">
        {Array.from({ length: 5 }).map((_, index) => (
          <Card key={index} p="md" withBorder>
            <Stack gap="sm">
              <div>Loading...</div>
            </Stack>
          </Card>
        ))}
      </Stack>
    )
  }

  return (
    <Stack gap="sm">
      {entities.map((entity) => (
        <Card
          key={entity.id}
          p="md"
          withBorder
          style={{ cursor: 'pointer' }}
          onClick={() => navigate({ to: '/entity-views/${this.normalizedOptions.entityPlural}/$entityId', params: { entityId: entity.id } })}
        >
          <Group justify="space-between">
            <Stack gap="xs">
              <Text size="sm" fw={500}>
                {entity.display_name}
              </Text>
              <Text size="xs" c="dimmed">
                {entity.id}
              </Text>
            </Stack>

            <Group gap="xs">
              <Badge variant="light" size="sm">
                ${this.entityConfigs[this.normalizedOptions.entityName as keyof typeof this.entityConfigs]?.icon || '📄'}
              </Badge>
              <Button
                variant="light"
                size="sm"
                leftSection={<IconExternalLink size={12} />}
              >
                View
              </Button>
            </Group>
          </Group>
        </Card>
      ))}
    </Stack>
  )
}
`
  }

  /**
   * Generate data hook
   */
  protected generateDataHook(): string {
    return `import { useState, useEffect } from 'react'
import { useOpenAlexClient } from '@academic-explorer/client'
import type { ${this.normalizedOptions.entityNameCapitalized} } from '@academic-explorer/client'

interface Use${this.normalizedOptions.entityNameCapitalized}Options {
  id: string
  enabled?: boolean
}

export function use${this.normalizedOptions.entityNameCapitalized}({ id, enabled = true }: Use${this.normalizedOptions.entityNameCapitalized}Options) {
  const [data, setData] = useState<${this.normalizedOptions.entityNameCapitalized} | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const client = useOpenAlexClient()

  useEffect(() => {
    if (!enabled || !id) return

    const fetchData = async () => {
      try {
        setLoading(true)
        setError(null)

        const result = await client.${this.normalizedOptions.entityPlural}.get({ id })
        setData(result)
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Unknown error'))
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [id, enabled, client])

  return {
    data,
    loading,
    error,
    refetch: () => {
      if (id) {
        const fetchData = async () => {
          try {
            setLoading(true)
            setError(null)

            const result = await client.${this.normalizedOptions.entityPlural}.get({ id })
            setData(result)
          } catch (err) {
            setError(err instanceof Error ? err : new Error('Unknown error'))
          } finally {
            setLoading(false)
          }
        }
        fetchData()
      }
    },
  }
}
`
  }

  /**
   * Generate mock data
   */
  protected generateMockData(): string {
    return `import type { ${this.normalizedOptions.entityNameCapitalized} } from '@academic-explorer/client'

export const mock${this.normalizedOptions.entityNameCapitalized}: ${this.normalizedOptions.entityNameCapitalized} = {
  id: 'W1234567890',
  display_name: 'Sample ${this.normalizedOptions.entityNameCapitalized}',
  // TODO: Add mock properties specific to ${this.normalizedOptions.entityName}
} as ${this.normalizedOptions.entityNameCapitalized}

export const mock${this.normalizedOptions.entityPluralCapitalized}: ${this.normalizedOptions.entityNameCapitalized}[] = [
  mock${this.normalizedOptions.entityNameCapitalized},
  // TODO: Add more mock ${this.normalizedOptions.entityPlural}
]
`
  }

  /**
   * Generate route files
   */
  protected async generateRoutes(): Promise<void> {
    const routesDir = `apps/web/src/routes/${this.normalizedOptions.routeDirectory}`

    // Create main index route
    const indexRoute = this.generateIndexRoute()
    this.tree.write(
      join(routesDir, 'index.tsx'),
      indexRoute
    )

    // Create detail route
    const detailRoute = this.generateDetailRoute()
    this.tree.write(
      join(routesDir, '$entityId.tsx'),
      detailRoute
    )

    // Create lazy-loaded components if enabled
    if (this.normalizedOptions.useLazyLoading) {
      const lazyIndex = this.generateLazyIndexRoute()
      this.tree.write(
        join(routesDir, 'index.lazy.tsx'),
        lazyIndex
      )

      const lazyDetail = this.generateLazyDetailRoute()
      this.tree.write(
        join(routesDir, '$entityId.lazy.tsx'),
        lazyDetail
      )
    }
  }

  /**
   * Generate index route
   */
  protected generateIndexRoute(): string {
    return `import { createFileRoute } from '@tanstack/react-router'
import { ${this.normalizedOptions.entityNameCapitalized}ListView } from '@academic-explorer/web/components/${this.normalizedOptions.componentDirectory}'

export const Route = createFileRoute('/entity-views/${this.normalizedOptions.routeDirectory}/')({
  component: ${this.normalizedOptions.entityNameCapitalized}ListView,
})
`
  }

  /**
   * Generate detail route
   */
  protected generateDetailRoute(): string {
    return `import { createFileRoute } from '@tanstack/react-router'
import { ${this.normalizedOptions.entityNameCapitalized}View } from '@academic-explorer/web/components/${this.normalizedOptions.componentDirectory}'

export const Route = createFileRoute('/entity-views/${this.normalizedOptions.routeDirectory}/$entityId')({
  component: ${this.normalizedOptions.entityNameCapitalized}View,
})
`
  }

  /**
   * Generate lazy index route
   */
  protected generateLazyIndexRoute(): string {
    return `import { createLazyFileRoute } from '@tanstack/react-router'
import { ${this.normalizedOptions.entityNameCapitalized}ListView } from '@academic-explorer/web/components/${this.normalizedOptions.componentDirectory}'

export const Route = createLazyFileRoute('/entity-views/${this.normalizedOptions.routeDirectory}/')({
  component: () => import('./index').then(m => <m.Route />),
})
`
  }

  /**
   * Generate lazy detail route
   */
  protected generateLazyDetailRoute(): string {
    return `import { createLazyFileRoute } from '@tanstack/react-router'
import { ${this.normalizedOptions.entityNameCapitalized}View } from '@academic-explorer/web/components/${this.normalizedOptions.componentDirectory}'

export const Route = createLazyFileRoute('/entity-views/${this.normalizedOptions.routeDirectory}/$entityId')({
  component: () => import('./$entityId').then(m => <m.Route />),
})
`
  }

  /**
   * Generate complete entity view
   */
  protected async generateEntityView(): Promise<void> {
    // Create component directory
    const componentDir = this.normalizedOptions.projectRoot
    this.tree.write(join(componentDir, '.gitkeep'), '')

    // Generate main view component
    const mainViewContent = this.generateMainViewComponent()
    this.tree.write(
      join(componentDir, `${this.normalizedOptions.fileName}-view.tsx`),
      mainViewContent
    )

    // Generate sub-components
    const headerContent = this.generateHeaderComponent()
    this.tree.write(
      join(componentDir, `${this.normalizedOptions.fileName}-header.tsx`),
      headerContent
    )

    const contentContent = this.generateContentComponent()
    this.tree.write(
      join(componentDir, `${this.normalizedOptions.fileName}-content.tsx`),
      contentContent
    )

    const loadingContent = this.generateLoadingSkeletonComponent()
    this.tree.write(
      join(componentDir, `${this.normalizedOptions.fileName}-loading-skeleton.tsx`),
      loadingContent
    )

    if (this.normalizedOptions.includeErrorHandling) {
      const errorContent = this.generateErrorComponent()
      this.tree.write(
        join(componentDir, `${this.normalizedOptions.fileName}-error.tsx`),
        errorContent
      )
    }

    const listContent = this.generateListViewComponent()
    this.tree.write(
      join(componentDir, `${this.normalizedOptions.fileName}-list-view.tsx`),
      listContent
    )

    // Generate hooks
    const hookContent = this.generateDataHook()
    this.tree.write(
      join(componentDir, `use-${this.normalizedOptions.fileName}.ts`),
      hookContent
    )

    // Generate mock data
    if (this.normalizedOptions.createMocks) {
      const mockContent = this.generateMockData()
      this.tree.write(
        join(componentDir, `${this.normalizedOptions.fileName}-mocks.ts`),
        mockContent
      )
    }

    // Generate routes
    await this.generateRoutes()

    // Generate tests
    if (!this.normalizedOptions.skipTests) {
      await this.generateTests()
    }

    // Generate index file
    this.createIndexFile([
      `./${this.normalizedOptions.fileName}-view`,
      `./${this.normalizedOptions.fileName}-header`,
      `./${this.normalizedOptions.fileName}-content`,
      `./${this.normalizedOptions.fileName}-loading-skeleton`,
      `./${this.normalizedOptions.fileName}-list-view`,
      `use-${this.normalizedOptions.fileName}`,
    ])

    // Format files
    await this.format()
  }

  /**
   * Generate tests
   */
  protected async generateTests(): Promise<void> {
    // Unit test
    const unitTest = this.generateUnitTest()
    this.tree.write(
      join(this.normalizedOptions.projectRoot, `${this.normalizedOptions.fileName}-view.unit.test.tsx`),
      unitTest
    )

    // Integration test
    if (this.normalizedOptions.createIntegration) {
      const integrationTest = this.generateIntegrationTest()
      this.tree.write(
        join(this.normalizedOptions.projectRoot, `${this.normalizedOptions.fileName}-view.integration.test.tsx`),
        integrationTest
      )
    }

    // E2E test
    if (this.normalizedOptions.createE2E) {
      const e2eTest = this.generateE2ETest()
      this.tree.write(
        join(`apps/web`, `e2e/${this.normalizedOptions.entityPlural}.e2e.test.ts`),
        e2eTest
      )
    }
  }

  /**
   * Generate unit test
   */
  protected generateUnitTest(): string {
    return `import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { ${this.normalizedOptions.entityNameCapitalized}View } from './${this.normalizedOptions.fileName}-view'
import { mock${this.normalizedOptions.entityNameCapitalized} } from './${this.normalizedOptions.fileName}-mocks'

vi.mock('@academic-explorer/client', () => ({
  useOpenAlexClient: () => ({
    ${this.normalizedOptions.entityPlural}: {
      get: vi.fn().mockResolvedValue(mock${this.normalizedOptions.entityNameCapitalized}),
    },
  }),
}))

describe('${this.normalizedOptions.entityNameCapitalized}View', () => {
  it('should render entity view correctly', async () => {
    render(<${this.normalizedOptions.entityNameCapitalized}View id="W1234567890" />)

    await waitFor(() => {
      expect(screen.getByText(mock${this.normalizedOptions.entityNameCapitalized}.display_name)).toBeInTheDocument()
    })
  })

  it('should show loading state initially', () => {
    render(<${this.normalizedOptions.entityNameCapitalized}View id="W1234567890" />)

    expect(screen.getByText('Loading...')).toBeInTheDocument()
  })

  it('should handle errors gracefully', async () => {
    vi.mocked(useOpenAlexClient()).${this.normalizedOptions.entityPlural}.get.mockRejectedValueOnce(new Error('Network error'))

    render(<${this.normalizedOptions.entityNameCapitalized}View id="invalid-id" />)

    await waitFor(() => {
      expect(screen.getByText(/Error Loading/)).toBeInTheDocument()
    })
  })
})
`
  }

  /**
   * Generate integration test
   */
  protected generateIntegrationTest(): string {
    return `import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from '@tanstack/react-router'
import { createRoute } from '@tanstack/react-router'
import { ${this.normalizedOptions.entityNameCapitalized}View } from './${this.normalizedOptions.fileName}-view'

describe('${this.normalizedOptions.entityNameCapitalized}View Integration', () => {
  it('should integrate with router correctly', () => {
    const route = createRoute({
      path: '/test',
      component: () => <${this.normalizedOptions.entityNameCapitalized}View id="test-id" />,
    })

    render(
      <MemoryRouter initialEntries={['/test']}>
        <route.Component />
      </MemoryRouter>
    )

    // TODO: Add integration-specific assertions
  })
})
`
  }

  /**
   * Generate E2E test
   */
  protected generateE2ETest(): string {
    return `import { test, expect } from '@playwright/test'

test.describe('${this.normalizedOptions.entityPlural} E2E', () => {
  test('should navigate to ${this.normalizedOptions.entityName} view', async ({ page }) => {
    await page.goto('/')

    // Navigate to ${this.normalizedOptions.entityPlural} list
    await page.click('text=${this.normalizedOptions.entityPlural}')

    // Should see ${this.normalizedOptions.entityPlural} list
    await expect(page.locator('text=${this.normalizedOptions.entityPlural}')).toBeVisible()
  })

  test('should view ${this.normalizedOptions.entityName} details', async ({ page }) => {
    await page.goto('/entity-views/${this.normalizedOptions.routeDirectory}/W1234567890')

    // Should see ${this.normalizedOptions.entityName} details
    await expect(page.locator('text=Sample ${this.normalizedOptions.entityNameCapitalized}')).toBeVisible()
  })
})
`
  }

  /**
   * Generate complete entity view
   */
  async generate(): Promise<GeneratorCallback> {
    await this.generateEntityView()
    this.logCompletion('Entity View')

    return async () => {
      // Post-generation callback if needed
    }
  }
}