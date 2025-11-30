import { Button, ActionIcon, Group, GroupProps, Menu } from '@mantine/core'
import { IconChevronDown } from '@tabler/icons-react'
import { forwardRef } from 'react'

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
      style: { height: `${height}px` }
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
            styles={() => ({
              root: {
                borderTopRightRadius: 0,
                borderBottomRightRadius: 0,
                borderRightWidth: 0,
                flex: 1,
                height: `${height}px`
              },
              inner: {
                justifyContent: 'flex-start',
                height: `${height}px`
              }
            })}
          />

          {/* Dropdown arrow button */}
          <ActionIcon
            {...mergedDropdownProps}
            w={height}
            h={height}
            color={dropdownColor}
            styles={() => ({
              root: {
                borderTopLeftRadius: 0,
                borderBottomLeftRadius: 0,
                borderLeftWidth: 1,
                height: `${height}px`,
                width: `${height}px`
              }
            })}
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
              styles={() => ({
                root: {
                  borderTopRightRadius: 0,
                  borderBottomRightRadius: 0,
                  borderRightWidth: 0,
                  flex: 1,
                  height: `${height}px`
                },
                inner: {
                  justifyContent: 'flex-start',
                  height: `${height}px`
                }
              })}
            />

            {/* Dropdown arrow button */}
            <ActionIcon
              {...mergedDropdownProps}
              w={height}
              h={height}
              color={dropdownColor}
              styles={() => ({
                root: {
                  borderTopLeftRadius: 0,
                  borderBottomLeftRadius: 0,
                  borderLeftWidth: 1,
                  height: `${height}px`,
                  width: `${height}px`
                }
              })}
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