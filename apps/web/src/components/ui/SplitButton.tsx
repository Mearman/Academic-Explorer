import { Button, ActionIcon, Group, GroupProps, Menu } from '@mantine/core'
import { IconChevronDown } from '@tabler/icons-react'
import { forwardRef } from 'react'
import { useTheme } from '@/contexts/theme-context'

// Use intersection with record to allow any valid HTML button attributes
interface SplitButtonProps {
  mainButtonProps: {
    onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void
    color?: string
    variant?: string
    size?: string
    disabled?: boolean
    loading?: boolean
    'aria-label'?: string
    title?: string
    children: React.ReactNode
    [key: string]: unknown  // Allow other Mantine props
  }
  dropdownButtonProps?: {
    color?: string
    variant?: string
    size?: string
    disabled?: boolean
    'aria-label'?: string
    title?: string
    children?: React.ReactNode
    [key: string]: unknown  // Allow other Mantine props
  }
  groupProps?: GroupProps
  dropdownItems?: React.ReactNode
  height?: number
}

export const SplitButton = forwardRef<HTMLDivElement, SplitButtonProps>(
  ({
    mainButtonProps,
    dropdownButtonProps,
    groupProps,
    dropdownItems,
    height = 34
  }, ref) => {
    const { config } = useTheme()

    // Get current theme border radius value
    const getThemeBorderRadius = () => {
      const radiusMap = {
        xs: '4px',
        sm: '8px',
        md: '16px',
        lg: '24px',
        xl: '32px'
      } as const
      return radiusMap[config.borderRadius] || '16px'
    }

    const defaultDropdownProps = {
      variant: 'outline' as const,
      size: 'sm' as const,
      w: height,
      h: height,
      'aria-label': 'More options' as const,
      children: <IconChevronDown size={14} />
    }

    const defaultGroupProps: GroupProps = {
      gap: 0,
      miw: 120,
      style: {
        height: `${height}px`,
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06)'
      }
    }

    const mergedDropdownProps = { ...defaultDropdownProps, ...dropdownButtonProps }
    const mergedGroupProps = { ...defaultGroupProps, ...groupProps }

    // Use the main button color or fallback to primary, then apply to dropdown
    const mainButtonColor = mainButtonProps.color || 'primary'
    const dropdownColor = mergedDropdownProps.color || mainButtonColor

    // If no dropdown items provided, render as simple grouped buttons
    if (!dropdownItems) {
      return (
        <Group ref={ref} {...mergedGroupProps}>
          {/* Main button */}
          <Button
            {...mainButtonProps}
            h={height}
            color={mainButtonColor}
            styles={() => {
              const currentRadius = getThemeBorderRadius()
              return {
                root: {
                  borderRadius: `${currentRadius} 0 0 ${currentRadius}`, // Use theme radius: top-left, top-right, bottom-right, bottom-left
                  borderTopRightRadius: '0px !important',
                  borderBottomRightRadius: '0px !important',
                  borderRightWidth: 0,
                  flex: 1,
                  height: `${height}px`,
                  borderStyle: 'solid',
                  transition: 'all 0.15s ease-in-out',
                  marginRight: '-1px', // Compensate for border overlap
                  '&:hover': {
                    backgroundColor: 'var(--mantine-color-blue-light-hover)',
                    borderColor: 'var(--mantine-color-blue-light-hover)',
                    zIndex: 1
                  }
                },
                inner: {
                  justifyContent: 'flex-start',
                  height: `${height - 2}px`, // Account for borders
                  paddingLeft: '8px',
                  padding: '0 8px'
                }
              }
            }}
          />

          {/* Dropdown arrow button */}
          <ActionIcon
            {...mergedDropdownProps}
            w={height}
            h={height}
            color={dropdownColor}
            styles={() => {
              const currentRadius = getThemeBorderRadius()
              return {
                root: {
                  borderRadius: `0 ${currentRadius} ${currentRadius} 0`, // Use theme radius: top-left, top-right, bottom-right, bottom-left
                  borderTopLeftRadius: '0px !important',
                  borderBottomLeftRadius: '0px !important',
                  borderLeftWidth: 1,
                  height: `${height}px`,
                  width: `${height}px`,
                  borderStyle: 'solid',
                  backgroundColor: 'transparent',
                  transition: 'all 0.15s ease-in-out',
                  flexShrink: 0, // Prevent button from shrinking
                  position: 'relative',
                  zIndex: 2, // Ensure dropdown button is on top
                  '&:hover': {
                    backgroundColor: 'var(--mantine-color-' + dropdownColor + '-light-hover)',
                    transform: 'scale(1.05)',
                    zIndex: 3
                  },
                  '&:active': {
                    transform: 'scale(0.95)'
                  }
                }
              }
            }}
          />
        </Group>
      )
    }

    // Render with dropdown menu if items are provided
    return (
      <Menu position="bottom-end">
        <Menu.Target>
          <Group ref={ref} {...mergedGroupProps}>
            {/* Main button */}
            <Button
              {...mainButtonProps}
              h={height}
              color={mainButtonColor}
              styles={() => {
                const currentRadius = getThemeBorderRadius()
                return {
                  root: {
                    borderRadius: `${currentRadius} 0 0 ${currentRadius}`, // Use theme radius: top-left, top-right, bottom-right, bottom-left
                    borderTopRightRadius: '0px !important',
                    borderBottomRightRadius: '0px !important',
                    borderRightWidth: 0,
                    flex: 1,
                    height: `${height}px`,
                    borderStyle: 'solid',
                    transition: 'all 0.15s ease-in-out',
                    marginRight: '-1px', // Compensate for border overlap
                    '&:hover': {
                      backgroundColor: 'var(--mantine-color-blue-light-hover)',
                      borderColor: 'var(--mantine-color-blue-light-hover)',
                      zIndex: 1
                    }
                  },
                  inner: {
                    justifyContent: 'flex-start',
                    height: `${height - 2}px`, // Account for borders
                    paddingLeft: '8px',
                    padding: '0 8px'
                  }
                }
              }}
            />

            {/* Dropdown arrow button */}
            <ActionIcon
              {...mergedDropdownProps}
              w={height}
              h={height}
              color={dropdownColor}
              styles={() => {
                const currentRadius = getThemeBorderRadius()
                return {
                  root: {
                    borderRadius: `0 ${currentRadius} ${currentRadius} 0`, // Use theme radius: top-left, top-right, bottom-right, bottom-left
                    borderTopLeftRadius: '0px !important',
                    borderBottomLeftRadius: '0px !important',
                    borderLeftWidth: 1,
                    height: `${height}px`,
                    width: `${height}px`,
                    borderStyle: 'solid',
                    backgroundColor: 'transparent',
                    transition: 'all 0.15s ease-in-out',
                    flexShrink: 0, // Prevent button from shrinking
                    position: 'relative',
                    zIndex: 2, // Ensure dropdown button is on top
                    '&:hover': {
                      backgroundColor: 'var(--mantine-color-' + dropdownColor + '-light-hover)',
                      transform: 'scale(1.05)',
                      zIndex: 3
                    },
                    '&:active': {
                      transform: 'scale(0.95)'
                    }
                  }
                }
              }}
            />
          </Group>
        </Menu.Target>

        <Menu.Dropdown>
          {dropdownItems}
        </Menu.Dropdown>
      </Menu>
    )
  }
)

SplitButton.displayName = 'SplitButton'