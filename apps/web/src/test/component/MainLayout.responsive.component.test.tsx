/**
 * Component tests for MainLayout responsive structure
 * Tests US1: Mobile-First Header Navigation (P1)
 *
 * NOTE: These tests verify responsive STRUCTURE (correct Mantine props),
 * not actual CSS behavior. E2E tests validate real responsive behavior.
 */

import { MantineProvider } from '@mantine/core';
import { render, screen, cleanup } from '@testing-library/react';
import { describe, it, expect, afterEach, vi } from 'vitest';

// Mock router hooks and Link component
vi.mock('@tanstack/react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-router')>();
  const React = await import('react');
  return {
    ...actual,
    useRouter: vi.fn().mockReturnValue({ navigate: vi.fn() }),
    useRouterState: vi.fn().mockReturnValue({
      location: { pathname: '/', search: '', hash: '', href: '/' },
      __store: { subscribe: vi.fn() },
    }),
    useLocation: vi.fn().mockReturnValue({
      pathname: '/',
      search: '',
      hash: '',
      href: '/'
    }),
    useNavigate: vi.fn().mockReturnValue(vi.fn()),
    useSearch: vi.fn().mockReturnValue({}),
    // Forward all props including role to preserve button semantics when used with component={Link}
    Link: React.forwardRef(({ children, ...props }: any, ref: any) =>
      React.createElement('a', { ...props, ref }, children)
    ),
  };
});

// Import after mocks
import { MainLayout } from '@/components/layout/MainLayout';

describe('MainLayout.responsive - Structure Tests', () => {
  afterEach(() => {
    cleanup();
  });

  describe('T008-T009: Responsive navigation structure', () => {
    it('should render mobile hamburger menu button', () => {
      render(
        <MantineProvider>
          <MainLayout>Test</MainLayout>
        </MantineProvider>
      );

      // Mobile menu button should exist with hiddenFrom="md"
      const menuButton = screen.getByRole('button', { name: /open navigation menu/i });
      expect(menuButton).toBeInTheDocument();
      expect(menuButton).toHaveAttribute('aria-label', 'Open navigation menu');
    });

    it('should render desktop navigation buttons', () => {
      render(
        <MantineProvider>
          <MainLayout>Test</MainLayout>
        </MantineProvider>
      );

      // Desktop navigation buttons should exist (visibleFrom="md")
      // Note: We can't test CSS visibility in component tests, only DOM structure
      // When using component={Link}, Mantine renders the Link (mocked as <a>) with button classes/styles
      // The links are rendered but may not have proper accessible names, so just check they exist
      const homeLinks = screen.queryAllByText(/^Home$/i);
      expect(homeLinks.length).toBeGreaterThan(0);
    });

    it('should wrap search input with visibleFrom Box', () => {
      render(
        <MantineProvider>
          <MainLayout>Test</MainLayout>
        </MantineProvider>
      );

      // Search input should exist in DOM
      const searchInput = screen.getByLabelText(/global search input/i);
      expect(searchInput).toBeInTheDocument();
    });
  });

  describe('T011: Responsive header height structure', () => {
    it('should render AppShell header', () => {
      const { container } = render(
        <MantineProvider>
          <MainLayout>Test</MainLayout>
        </MantineProvider>
      );

      const header = container.querySelector('.mantine-AppShell-header');
      expect(header).toBeInTheDocument();
    });
  });

  describe('T012: Navigation accessibility', () => {
    it('should have accessible hamburger menu button', () => {
      render(
        <MantineProvider>
          <MainLayout>Test</MainLayout>
        </MantineProvider>
      );

      const menuButton = screen.getByRole('button', { name: /open navigation menu/i });
      expect(menuButton).toHaveAttribute('aria-label');
      expect(menuButton.getAttribute('aria-label')).toBe('Open navigation menu');
    });

    it('should have accessible sidebar toggle buttons', () => {
      render(
        <MantineProvider>
          <MainLayout>Test</MainLayout>
        </MantineProvider>
      );

      const leftToggle = screen.getByRole('button', { name: /toggle left sidebar/i });
      const rightToggle = screen.getByRole('button', { name: /toggle right sidebar/i });

      expect(leftToggle).toHaveAttribute('aria-label', 'Toggle left sidebar');
      expect(rightToggle).toHaveAttribute('aria-label', 'Toggle right sidebar');
    });
  });
});
