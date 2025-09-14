/**
 * Reusable collapsible sidebar component
 * Supports pinning and auto-collapse functionality
 */

import React from 'react'
import { useLayoutStore } from '@/stores/layout-store'
import { useThemeColors } from '@/hooks/use-theme-colors'
import { IconPin, IconPinFilled, IconChevronLeft, IconChevronRight } from '@tabler/icons-react'

interface CollapsibleSidebarProps {
  side: 'left' | 'right'
  title: string
  children: React.ReactNode
  className?: string
  minWidth?: number
  maxWidth?: number
}

export const CollapsibleSidebar: React.FC<CollapsibleSidebarProps> = ({
  side,
  title,
  children,
  className = '',
  minWidth = 320,
  maxWidth = 400,
}) => {
  const {
    leftSidebarOpen,
    rightSidebarOpen,
    leftSidebarPinned,
    rightSidebarPinned,
    toggleLeftSidebar,
    toggleRightSidebar,
    pinLeftSidebar,
    pinRightSidebar,
  } = useLayoutStore()
  const { colors } = useThemeColors()

  const isOpen = side === 'left' ? leftSidebarOpen : rightSidebarOpen
  const isPinned = side === 'left' ? leftSidebarPinned : rightSidebarPinned
  const toggle = side === 'left' ? toggleLeftSidebar : toggleRightSidebar
  const setPin = side === 'left' ? pinLeftSidebar : pinRightSidebar

  const handleToggle = () => toggle()
  const handlePin = () => setPin(!isPinned)

  const sidebarStyle: React.CSSProperties = {
    position: 'relative',
    height: '100%',
    backgroundColor: colors.background.primary,
    borderRight: side === 'left' ? `1px solid ${colors.border.primary}` : undefined,
    borderLeft: side === 'right' ? `1px solid ${colors.border.primary}` : undefined,
    transition: 'width 200ms ease-in-out',
    width: isOpen ? `${minWidth}px` : '48px',
    minWidth: isOpen ? `${minWidth}px` : '48px',
    maxWidth: isOpen ? `${maxWidth}px` : '48px',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  }

  const headerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: isOpen ? '12px 16px' : '12px 8px',
    borderBottom: `1px solid ${colors.border.primary}`,
    backgroundColor: colors.background.secondary,
    minHeight: '48px',
  }

  const contentStyle: React.CSSProperties = {
    flex: 1,
    overflow: isOpen ? 'auto' : 'hidden',
    padding: isOpen ? '16px' : '8px',
  }

  const CollapseIcon = side === 'left'
    ? (isOpen ? IconChevronLeft : IconChevronRight)
    : (isOpen ? IconChevronRight : IconChevronLeft)

  return (
    <div className={className} style={sidebarStyle}>
      {/* Header */}
      <div style={headerStyle}>
        {isOpen && (
          <>
            <h3 style={{
              margin: 0,
              fontSize: '14px',
              fontWeight: 600,
              color: colors.text.primary
            }}>
              {title}
            </h3>

            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <button
                onClick={handlePin}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '4px',
                  borderRadius: '4px',
                  color: isPinned ? colors.primary : colors.text.secondary,
                  display: 'flex',
                  alignItems: 'center',
                }}
                title={isPinned ? 'Unpin sidebar' : 'Pin sidebar open'}
              >
                {isPinned ? <IconPinFilled size={16} /> : <IconPin size={16} />}
              </button>
            </div>
          </>
        )}

        <button
          onClick={handleToggle}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '4px',
            borderRadius: '4px',
            color: colors.text.secondary,
            display: 'flex',
            alignItems: 'center',
            marginLeft: isOpen ? '0' : 'auto',
            marginRight: isOpen ? '0' : 'auto',
          }}
          title={isOpen ? 'Collapse sidebar' : 'Expand sidebar'}
        >
          <CollapseIcon size={16} />
        </button>
      </div>

      {/* Content */}
      <div style={contentStyle}>
        {isOpen ? children : (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '8px',
            opacity: 0.5
          }}>
            <div style={{ fontSize: '20px' }}>
              {side === 'left' ? '🔍' : '📄'}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}