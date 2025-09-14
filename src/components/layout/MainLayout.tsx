/**
 * Main layout component integrating graph navigation with sidebars
 * Implementation of the decoupled graph navigation plan architecture
 */

import React from 'react';
import { AppShell } from '@mantine/core';
import { useLayoutStore } from '@/stores/layout-store';
import { GraphNavigation } from './GraphNavigation';
import { LeftSidebar } from './LeftSidebar';
import { RightSidebar } from './RightSidebar';

interface MainLayoutProps {
  children?: React.ReactNode;
}

export const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const {
    leftSidebarOpen,
    rightSidebarOpen,
  } = useLayoutStore();

  return (
    <AppShell
      layout="alt"
      navbar={{
        width: { base: 280, sm: 300, md: 350 },
        collapsed: { mobile: !leftSidebarOpen },
        breakpoint: 'sm'
      }}
      aside={{
        width: { base: 280, sm: 300, md: 350 },
        collapsed: { desktop: !rightSidebarOpen, mobile: !rightSidebarOpen },
        breakpoint: 'sm'
      }}
      padding={0}
      style={{ height: '100vh' }}
    >
      {/* Left Sidebar - Search and Filters */}
      <AppShell.Navbar>
        <LeftSidebar />
      </AppShell.Navbar>

      {/* Main Graph Area */}
      <AppShell.Main
        style={{
          display: 'flex',
          flexDirection: 'column',
          height: '100vh',
          overflow: 'hidden',
          position: 'relative'
        }}
      >
        {/* Graph is always visible as background */}
        <GraphNavigation
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            flex: 1,
            width: '100%',
            height: '100%'
          }}
        />

        {/* Route content rendered as overlay if present */}
        {children && (
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              zIndex: 100,
              maxWidth: '90vw',
              maxHeight: '90vh',
              overflow: 'auto',
              pointerEvents: 'auto'
            }}
          >
            {children}
          </div>
        )}
      </AppShell.Main>

      {/* Right Sidebar - Entity Details and Preview */}
      <AppShell.Aside>
        <RightSidebar />
      </AppShell.Aside>
    </AppShell>
  );
};