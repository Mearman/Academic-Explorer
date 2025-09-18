export default {
  ci: {
    collect: {
      url: [
        'http://localhost:4173/',
        'http://localhost:4173/search',
        'http://localhost:4173/about'
      ],
      startServerCommand: 'pnpm preview',
      startServerReadyPattern: 'Local:.*:4173',
      startServerReadyTimeout: 30000,
      numberOfRuns: 3,
      settings: {
        chromeFlags: '--no-sandbox --disable-setuid-sandbox --disable-dev-shm-usage'
      }
    },
    assert: {
      assertions: {
        'categories:accessibility': ['error', { minScore: 0.9 }],
        'categories:best-practices': ['warn', { minScore: 0.6 }],
        'categories:performance': ['warn', { minScore: 0.5 }],
        'categories:seo': ['warn', { minScore: 0.6 }],

        // Core Accessibility assertions (errors)
        'aria-allowed-attr': 'error',
        'aria-hidden-body': 'error',
        'aria-hidden-focus': 'error',
        'aria-required-attr': 'error',
        'aria-required-children': 'error',
        'aria-required-parent': 'error',
        'aria-roles': 'error',
        'aria-valid-attr-value': 'error',
        'aria-valid-attr': 'error',
        'color-contrast': 'error',
        'duplicate-id-active': 'error',
        'duplicate-id-aria': 'error',
        'html-has-lang': 'error',
        'html-lang-valid': 'error',
        'image-alt': 'error',
        'label': 'error',

        // Secondary accessibility (warnings)
        'button-name': 'warn',
        'link-name': 'warn',
        'document-title': 'warn',
        'meta-viewport': 'warn',

        // Performance-related (warnings, not errors)
        'unminified-javascript': 'warn',
        'unused-css-rules': 'warn',
        'unused-javascript': 'warn',
        'valid-source-maps': 'warn',
        'uses-passive-event-listeners': 'warn',
        'target-size': 'warn'
      }
    },
    upload: {
      target: 'temporary-public-storage'
    },
    server: {
      port: 9001,
      storage: '.lighthouseci'
    }
  }
};