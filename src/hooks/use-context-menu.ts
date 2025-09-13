/**
 * Hook for managing graph node context menu state
 */

import { useState, useCallback } from 'react'
import type { GraphNode } from '@/lib/graph/types'

interface ContextMenuState {
  node: GraphNode | null
  x: number
  y: number
  visible: boolean
}

export function useContextMenu() {
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    node: null,
    x: 0,
    y: 0,
    visible: false
  })

  const showContextMenu = useCallback((node: GraphNode, event: React.MouseEvent | MouseEvent) => {
    event.preventDefault()
    event.stopPropagation()

    // Calculate position ensuring menu stays within viewport
    const x = Math.min(event.clientX, window.innerWidth - 200)
    const y = Math.min(event.clientY, window.innerHeight - 300)

    setContextMenu({
      node,
      x,
      y,
      visible: true
    })
  }, [])

  const hideContextMenu = useCallback(() => {
    setContextMenu(prev => ({
      ...prev,
      visible: false
    }))
  }, [])

  return {
    contextMenu,
    showContextMenu,
    hideContextMenu
  }
}