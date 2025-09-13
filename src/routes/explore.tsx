import { createFileRoute } from '@tanstack/react-router'
import { LeftSidebar } from '@/components/layout/LeftSidebar'
import { RightSidebar } from '@/components/layout/RightSidebar'
import { GraphNavigationSimple } from '@/components/layout/GraphNavigationSimple'

export const Route = createFileRoute('/explore')({
  component: GraphExplorer,
})

function GraphExplorer() {
  return (
    <div style={{
      display: 'flex',
      height: '100vh',
      background: '#f8fafc'
    }}>
      {/* Left Sidebar */}
      <LeftSidebar />

      {/* Main Graph Area */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        minWidth: 0 // Prevents flex item from overflowing
      }}>
        {/* Header */}
        <div style={{
          padding: '16px 24px',
          borderBottom: '1px solid #e5e7eb',
          background: 'white'
        }}>
          <h1 style={{
            margin: 0,
            fontSize: '24px',
            fontWeight: 600,
            color: '#111827'
          }}>
            Academic Explorer
          </h1>
          <p style={{
            margin: '4px 0 0 0',
            fontSize: '14px',
            color: '#6b7280'
          }}>
            Interactive exploration of academic literature through OpenAlex
          </p>
        </div>

        {/* Graph Visualization */}
        <div style={{
          flex: 1,
          position: 'relative',
          background: 'white'
        }}>
          <GraphNavigationSimple />
        </div>
      </div>

      {/* Right Sidebar */}
      <RightSidebar />
    </div>
  )
}