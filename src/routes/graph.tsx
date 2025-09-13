import { createFileRoute } from '@tanstack/react-router'
import { GraphNavigationSimple } from '@/components/layout/GraphNavigationSimple'

export const Route = createFileRoute('/graph')({
  component: GraphDemo,
})

function GraphDemo() {
  return (
    <div style={{ padding: '20px' }}>
      <h1>Graph Navigation Demo</h1>
      <p>Interactive academic entity graph powered by XYFlow</p>
      <GraphNavigationSimple />
      <div style={{ marginTop: '20px', fontSize: '14px', color: '#666' }}>
        <h3>Instructions:</h3>
        <ul>
          <li>Click and drag nodes to reposition them</li>
          <li>Use mouse wheel to zoom in/out</li>
          <li>Click on nodes to see console output (future: navigate to entity pages)</li>
          <li>Use the controls in the bottom-left corner</li>
        </ul>
      </div>
    </div>
  )
}