export interface RouteBuilderOptions {
  path: string
  component: string
  lazy?: boolean
  loader?: string
  errorComponent?: string
  pendingComponent?: string
}

/**
 * Builder for creating TanStack Router route configurations
 */
export class RouteBuilder {
  private options: RouteBuilderOptions

  constructor(options: RouteBuilderOptions) {
    this.options = options
  }

  /**
   * Generate regular route
   */
  generateRegularRoute(): string {
    return `import { createFileRoute } from '@tanstack/react-router'
import { ${this.options.component} } from '${this.options.component}'

export const Route = createFileRoute('${this.options.path}')({
  component: ${this.options.component},
})
`
  }

  /**
   * Generate lazy route
   */
  generateLazyRoute(): string {
    const componentName = this.getComponentName()
    return `import { createLazyFileRoute } from '@tanstack/react-router'

export const Route = createLazyFileRoute('${this.options.path}')({
  component: () => import('${this.options.component}').then(m => <m.${componentName} />),
${this.options.loader ? `loader: () => import('${this.options.loader}').then(m => m.loader()),` : ''}
})
`
  }

  /**
   * Extract component name from import path
   */
  private getComponentName(): string {
    const parts = this.options.component.split('/')
    const lastPart = parts[parts.length - 1]
    return lastPart.replace(/[^0-9A-Z]/gi, '')
  }

  /**
   * Generate route with error handling
   */
  generateRouteWithErrorHandling(): string {
    const baseRoute = this.options.lazy ? this.generateLazyRoute() : this.generateRegularRoute()

    if (this.options.errorComponent) {
      return `${baseRoute.replace(
        'component: {',
        `errorComponent: '${this.options.errorComponent}',\n  component: {`
      )}`
    }

    if (this.options.pendingComponent) {
      return `${baseRoute.replace(
        'component: {',
        `pendingComponent: '${this.options.pendingComponent}',\n  component: {`
      )}`
    }

    return baseRoute
  }

  /**
   * Generate index route for entity views
   * @param componentPath
   * @param routePath
   */
  static generateIndexRoute(componentPath: string, routePath: string): RouteBuilder {
    return new RouteBuilder({
      path: routePath,
      component: componentPath,
    })
  }

  /**
   * Generate detail route with parameter
   * @param componentPath
   * @param routePath
   * @param parameter
   * @param lazy
   */
  static generateDetailRoute(
    componentPath: string,
    routePath: string,
    parameter: string = 'id',
    lazy = true
  ): RouteBuilder {
    return new RouteBuilder({
      path: `${routePath}/$${parameter}`,
      component: componentPath,
      lazy,
    })
  }

  /**
   * Generate route with data loading
   * @param componentPath
   * @param routePath
   * @param loaderPath
   * @param lazy
   */
  static generateRouteWithLoader(
    componentPath: string,
    routePath: string,
    loaderPath: string,
    lazy = true
  ): RouteBuilder {
    return new RouteBuilder({
      path: routePath,
      component: componentPath,
      loader: loaderPath,
      lazy,
    })
  }

  /**
   * Generate route with error handling
   * @param componentPath
   * @param routePath
   * @param errorComponentPath
   */
  static generateRouteWithErrorHandling(
    componentPath: string,
    routePath: string,
    errorComponentPath: string
  ): RouteBuilder {
    return new RouteBuilder({
      path: routePath,
      component: componentPath,
      errorComponent: errorComponentPath,
    })
  }

  /**
   * Build route configuration
   */
  build(): string {
    if (this.options.errorComponent || this.options.pendingComponent) {
      return this.generateRouteWithErrorHandling()
    }

    if (this.options.lazy) {
      return this.generateLazyRoute()
    }

    return this.generateRegularRoute()
  }
}

/**
 * Builder for creating route trees
 */
export class RouteTreeBuilder {
  private routes: RouteBuilder[] = []

  /**
   * Add route
   * @param route
   */
  addRoute(route: RouteBuilder): this {
    this.routes.push(route)
    return this
  }

  /**
   * Add regular route
   * @param path
   * @param component
   */
  addRegularRoute(path: string, component: string): this {
    return this.addRoute(new RouteBuilder({ path, component }))
  }

  /**
   * Add lazy route
   * @param path
   * @param component
   */
  addLazyRoute(path: string, component: string): this {
    return this.addRoute(new RouteBuilder({ path, component, lazy: true }))
  }

  /**
   * Add route with loader
   * @param path
   * @param component
   * @param loader
   */
  addRouteWithLoader(path: string, component: string, loader: string): this {
    return this.addRoute(new RouteBuilder({ path, component, loader }))
  }

  /**
   * Generate all routes
   */
  build(): string {
    return this.routes
      .map(route => route.build())
      .join('\n\n')
  }

  /**
   * Create entity view routes
   * @param entityName
   * @param entityPlural
   * @param componentPath
   */
  static createEntityViewRoutes(
    entityName: string,
    entityPlural: string,
    componentPath: string
  ): RouteTreeBuilder {
    const builder = new RouteTreeBuilder()

    // Index route for listing
    builder.addRoute(
      RouteBuilder.generateIndexRoute(
        `${componentPath}/${entityPlural}-view`,
        `/entity-views/${entityPlural}`
      )
    )

    // Detail route for individual entities
    builder.addRoute(
      RouteBuilder.generateDetailRoute(
        `${componentPath}/${entityName}-view`,
        `/entity-views/${entityPlural}`,
        'entityId',
        true
      )
    )

    return builder
  }
}