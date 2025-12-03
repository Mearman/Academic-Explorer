import { Menu, Box, Group, Text, useMantineTheme, ActionIcon } from '@mantine/core'
import {
  IconSun,
  IconMoon,
  IconDeviceDesktop,
  IconPalette,
  IconCheck,
  IconRotate
} from '@tabler/icons-react'
import { useState, useEffect } from 'react'

import { SplitButton } from '@/components/ui/SplitButton'
import { useTheme } from '@/contexts/theme-context'
import { shadcnPaletteNames, type ShadcnPalette } from '@/styles/shadcn-colors'
import { sprinkles } from '@/styles/sprinkles'

type ComponentLibrary = 'mantine' | 'shadcn' | 'radix'

interface ColorSchemeSelectorProps extends Record<string, never> {
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

  // Reset color palette to default
  const resetColorPalette = () => {
    setColorScheme('blue' as any)
    setSelectedPalette('blue')
  }

  // Reset border radius to default
  const resetBorderRadius = () => {
    setBorderRadius('md')
  }

  // Reset component library to default
  const resetComponentLibrary = () => {
    setComponentLibrary('mantine')
  }

  // Reset theme mode to default
  const resetThemeMode = () => {
    setColorMode('auto')
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
      <Menu.Label>
        <Group justify="space-between" w="100%">
          Theme Mode
          <ActionIcon
            size="xs"
            variant="subtle"
            color="gray"
            onClick={(e) => {
              e.stopPropagation()
              resetThemeMode()
            }}
            title="Reset theme mode to auto"
          >
            <IconRotate size={12} />
          </ActionIcon>
        </Group>
      </Menu.Label>
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
        <Group justify="space-between" w="100%">
          <Group gap={6}>
            <IconPalette size={16} />
            Color Palette
          </Group>
          <ActionIcon
            size="xs"
            variant="subtle"
            color="gray"
            onClick={(e) => {
              e.stopPropagation()
              resetColorPalette()
            }}
            title="Reset color palette to default"
          >
            <IconRotate size={12} />
          </ActionIcon>
        </Group>
      </Menu.Label>

      <Box p="xs">
        <div className={sprinkles({ gridColumns: '3', gridGap: 'xs' })}>
          {shadcnPaletteNames.map((palette) => (
            <Menu.Item
              key={palette}
              onClick={() => handlePaletteChange(palette)}
              className={sprinkles({
                menuItem: true,
                menuItemSelected: selectedPalette === palette
              })}
            >
              <Box
                className={sprinkles({
                  colorSwatch: true,
                  colorSwatchSize: 'sm',
                  colorSwatchSelected: selectedPalette === palette
                })}
                bg={palette}
              />
              <Text
                size="xs"
                fw={selectedPalette === palette ? 600 : 400}
                tt="capitalize"
              >
                {palette}
              </Text>
              {selectedPalette === palette && (
                <Box style={{ marginLeft: 'auto' }}>
                  <IconCheck size={12} />
                </Box>
              )}
            </Menu.Item>
          ))}
        </div>
      </Box>

      <Menu.Divider />

      {/* Component Library Selection */}
      <Menu.Label>
        <Group justify="space-between" w="100%">
          <Group gap={6}>
            <IconPalette size={16} />
            Component Library
          </Group>
          <ActionIcon
            size="xs"
            variant="subtle"
            color="gray"
            onClick={(e) => {
              e.stopPropagation()
              resetComponentLibrary()
            }}
            title="Reset component library to mantine"
          >
            <IconRotate size={12} />
          </ActionIcon>
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
        <Group justify="space-between" w="100%">
          <Group gap={6}>
            <IconPalette size={16} />
            Border Radius
          </Group>
          <ActionIcon
            size="xs"
            variant="subtle"
            color="gray"
            onClick={(e) => {
              e.stopPropagation()
              resetBorderRadius()
            }}
            title="Reset border radius to default"
          >
            <IconRotate size={12} />
          </ActionIcon>
        </Group>
      </Menu.Label>
      <Box p="xs">
        <div className={sprinkles({ gridColumns: '3', gridGap: 'xs' })}>
          {BORDER_RADIUS_OPTIONS.map((radius) => (
            <Menu.Item
              key={radius.value}
              onClick={() => setBorderRadius(radius.value)}
              className={sprinkles({
                menuItem: true,
                menuItemSelected: config.borderRadius === radius.value
              })}
            >
              <Box
                w={12}
                h={12}
                bg="gray"
                style={{ borderRadius: `${radius.size}px` }}
                className={sprinkles({
                  colorSwatch: true,
                  colorSwatchSize: 'sm',
                  colorSwatchSelected: config.borderRadius === radius.value
                })}
              />
              <Text
                size="xs"
                fw={config.borderRadius === radius.value ? 600 : 400}
                className={sprinkles({ textTransform: 'uppercase' })}
              >
                {radius.label}
              </Text>
              {config.borderRadius === radius.value && (
                <Box style={{ marginLeft: 'auto' }}>
                  <IconCheck size={12} />
                </Box>
              )}
            </Menu.Item>
          ))}
        </div>
      </Box>

      <Menu.Divider />

      {/* Reset to Defaults */}
      <Menu.Item
        onClick={resetTheme}
        className={sprinkles({ menuItem: true })}
        c="red"
        fw={500}
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
              className={sprinkles({ colorSwatch: true, colorSwatchSize: 'xs' })}
              bg={selectedPalette || 'gray'}
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