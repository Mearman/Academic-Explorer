import { Menu, Badge, Box, Group, Text, useMantineTheme } from '@mantine/core'
import {
  IconSun,
  IconMoon,
  IconDeviceDesktop,
  IconPalette,
  IconCheck
} from '@tabler/icons-react'
import { useState, useEffect } from 'react'

import { SplitButton } from '@/components/ui/SplitButton'
import { shadcnPaletteNames, type ShadcnPalette } from '@/styles/shadcn-colors'
import { useTheme } from '@/contexts/theme-context'

type ComponentLibrary = 'mantine' | 'shadcn' | 'radix'

interface ColorSchemeSelectorProps {
  // No props needed - uses theme context
}

const COLOR_SCHEME_LABELS = {
  light: { icon: IconSun, label: 'Light' },
  dark: { icon: IconMoon, label: 'Dark' },
  auto: { icon: IconDeviceDesktop, label: 'Auto' }
} as const


const COMPONENT_LIBRARY_LABELS = {
  mantine: { label: 'Mantine', description: 'Default Mantine styling and theming' },
  shadcn: { label: 'shadcn/ui', description: 'shadcn-inspired color schemes applied to Mantine' },
  radix: { label: 'Radix UI', description: 'Minimal styling approach for Mantine components' }
} as const

const BORDER_RADIUS_OPTIONS = [
  { value: 'xs', label: 'XS', size: 2, description: 'Extra Small' },
  { value: 'sm', label: 'SM', size: 4, description: 'Small' },
  { value: 'md', label: 'MD', size: 8, description: 'Medium' },
  { value: 'lg', label: 'LG', size: 12, description: 'Large' },
  { value: 'xl', label: 'XL', size: 16, description: 'Extra Large' }
] as const

export const ColorSchemeSelector = ({}: ColorSchemeSelectorProps) => {
  const { config, setColorScheme, setColorMode, setComponentLibrary, setBorderRadius, resetTheme } = useTheme()
  const [selectedPalette, setSelectedPalette] = useState<ShadcnPalette>(config.colorScheme as ShadcnPalette)
  const theme = useMantineTheme()

  // Update local state when theme context changes
  useEffect(() => {
    setSelectedPalette(config.colorScheme as ShadcnPalette)
  }, [config.colorScheme])

  // Handle palette changes
  const handlePaletteChange = (palette: ShadcnPalette) => {
    setSelectedPalette(palette)
    setColorScheme(palette as any) // Theme context expects ColorScheme type
  }

  const getCurrentIcon = () => {
    const IconComponent = COLOR_SCHEME_LABELS[config.colorMode].icon
    return <IconComponent size={18} />
  }

  // Cycle through color schemes: auto -> light -> dark -> auto
  const cycleColorScheme = () => {
    if (config.colorMode === "auto") {
      setColorMode("light");
    } else if (config.colorMode === "light") {
      setColorMode("dark");
    } else {
      setColorMode("auto");
    }
  }

  
  // Create dropdown items for the SplitButton
  const dropdownItems = (
    <>
      {/* Color Scheme Selection */}
      <Menu.Label>Theme Mode</Menu.Label>
      {Object.entries(COLOR_SCHEME_LABELS).map(([scheme, { icon: Icon, label }]) => (
        <Menu.Item
          key={scheme}
          leftSection={<Icon size={16} />}
          onClick={() => setColorMode(scheme as 'light' | 'dark' | 'auto')}
          rightSection={config.colorMode === scheme ? <IconCheck size={16} /> : null}
        >
          {label}
        </Menu.Item>
      ))}

      <Menu.Divider />

      {/* Color Palette Selection */}
      <Menu.Label>
        <Group gap={6}>
          <IconPalette size={16} />
          Color Palette
        </Group>
      </Menu.Label>

      <Box p="xs">
        <Box
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 4
          }}
        >
          {shadcnPaletteNames.map((palette) => (
            <Menu.Item
              key={palette}
              onClick={() => handlePaletteChange(palette)}
              p={4}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '4px 8px',
                borderRadius: 4,
                backgroundColor: selectedPalette === palette
                  ? 'var(--mantine-color-blue-light)'
                  : 'transparent'
              }}
            >
              <Box
                w={12}
                h={12}
                style={{
                  backgroundColor: theme.colors[palette]?.[6] || theme.colors.gray[6],
                  borderRadius: 2,
                  border: selectedPalette === palette
                    ? `2px solid ${theme.colors.blue[6]}`
                    : `1px solid ${theme.colors.gray[3]}`
                }}
              />
              <Text
                size="xs"
                style={{
                  fontSize: 11,
                  textTransform: 'capitalize',
                  fontWeight: selectedPalette === palette ? 600 : 400
                }}
              >
                {palette}
              </Text>
              {selectedPalette === palette && (
                <IconCheck size={12} style={{ marginLeft: 'auto' }} />
              )}
            </Menu.Item>
          ))}
        </Box>
      </Box>

      <Menu.Divider />

      {/* Component Library Selection */}
      <Menu.Label>
        <Group gap={6}>
          <IconPalette size={16} />
          Component Library
        </Group>
      </Menu.Label>
      {Object.entries(COMPONENT_LIBRARY_LABELS).map(([lib, { label, description }]) => (
        <Menu.Item
          key={lib}
          onClick={() => setComponentLibrary(lib as ComponentLibrary)}
          rightSection={config.componentLibrary === lib ? <IconCheck size={16} /> : null}
        >
          <Box>
            <Text size="sm">{label}</Text>
            <Text size="xs" c="dimmed">{description}</Text>
          </Box>
        </Menu.Item>
      ))}

      <Menu.Divider />

      {/* Border Radius Selection */}
      <Menu.Label>
        <Group gap={6}>
          <IconPalette size={16} />
          Border Radius
        </Group>
      </Menu.Label>
      <Box p="xs">
        <Box
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 4
          }}
        >
          {BORDER_RADIUS_OPTIONS.map((radius) => (
            <Menu.Item
              key={radius.value}
              onClick={() => setBorderRadius(radius.value)}
              p={4}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '4px 8px',
                borderRadius: 4,
                backgroundColor: config.borderRadius === radius.value
                  ? 'var(--mantine-color-blue-light)'
                  : 'transparent'
              }}
            >
              <Box
                w={12}
                h={12}
                style={{
                  backgroundColor: theme.colors.gray[6],
                  borderRadius: `${radius.size}px`,
                  border: config.borderRadius === radius.value
                    ? `2px solid ${theme.colors.blue[6]}`
                    : `1px solid ${theme.colors.gray[3]}`
                }}
              />
              <Text
                size="xs"
                style={{
                  fontSize: 11,
                  textTransform: 'uppercase',
                  fontWeight: config.borderRadius === radius.value ? 600 : 400
                }}
              >
                {radius.label}
              </Text>
              {config.borderRadius === radius.value && (
                <IconCheck size={12} style={{ marginLeft: 'auto' }} />
              )}
            </Menu.Item>
          ))}
        </Box>
      </Box>

      <Menu.Divider />

      {/* Reset to Defaults */}
      <Menu.Item
        onClick={resetTheme}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '8px 12px',
          color: 'var(--mantine-color-red-6)',
          fontWeight: 500
        }}
      >
        <Text size="sm">Reset to Defaults</Text>
      </Menu.Item>

      </>
  )

  return (
    <SplitButton
      height={34}
      mainButtonProps={{
        variant: 'outline',
        size: 'sm',
        color: selectedPalette,
        onClick: cycleColorScheme,
        'aria-label': 'Toggle color scheme',
        title: `Theme: ${COLOR_SCHEME_LABELS[config.colorMode].label} (Click to cycle)`,
        children: (
          <Group gap={4} miw={0}>
            {getCurrentIcon()}
            <Text size="xs" fw={500} truncate>
              {COLOR_SCHEME_LABELS[config.colorMode].label}
            </Text>
            <Box
              w={6}
              h={6}
              style={{
                backgroundColor: theme.colors[selectedPalette]?.[6] || theme.colors.gray[6],
                borderRadius: 2,
                flexShrink: 0
              }}
            />
          </Group>
        )
      }}
      dropdownButtonProps={{
        'aria-label': 'Color palette options',
        title: `Palette: ${selectedPalette} (Click for options)`
      }}
      dropdownItems={dropdownItems}
    />
  )
}