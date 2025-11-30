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

interface ColorSchemeSelectorProps {
  colorScheme: 'light' | 'dark' | 'auto'
  setColorScheme: (scheme: 'light' | 'dark' | 'auto') => void
}

const COLOR_SCHEME_LABELS = {
  light: { icon: IconSun, label: 'Light' },
  dark: { icon: IconMoon, label: 'Dark' },
  auto: { icon: IconDeviceDesktop, label: 'Auto' }
} as const


export const ColorSchemeSelector = ({
  colorScheme,
  setColorScheme
}: ColorSchemeSelectorProps) => {
  const [selectedPalette, setSelectedPalette] = useState<ShadcnPalette>('blue')
  const theme = useMantineTheme()

  // Load saved palette from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('bibgraph-color-palette')
    if (saved && shadcnPaletteNames.includes(saved as ShadcnPalette)) {
      setSelectedPalette(saved as ShadcnPalette)
    }
  }, [])

  // Save palette to localStorage when changed
  useEffect(() => {
    localStorage.setItem('bibgraph-color-palette', selectedPalette)
  }, [selectedPalette])

  const getCurrentIcon = () => {
    const IconComponent = COLOR_SCHEME_LABELS[colorScheme].icon
    return <IconComponent size={18} />
  }

  // Cycle through color schemes: auto -> light -> dark -> auto
  const cycleColorScheme = () => {
    if (colorScheme === "auto") {
      setColorScheme("light");
    } else if (colorScheme === "light") {
      setColorScheme("dark");
    } else {
      setColorScheme("auto");
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
          onClick={() => setColorScheme(scheme as 'light' | 'dark' | 'auto')}
          rightSection={colorScheme === scheme ? <IconCheck size={16} /> : null}
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

      <Box p="xs" style={{ maxHeight: 200, overflowY: 'auto' }}>
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
              onClick={() => setSelectedPalette(palette)}
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

      {/* Current Selection Display */}
      <Box p="xs" style={{ backgroundColor: 'var(--mantine-color-gray-0)' }}>
        <Group gap="xs">
          <Badge size="xs" variant="light">
            {COLOR_SCHEME_LABELS[colorScheme].label}
          </Badge>
          <Badge
            size="xs"
            variant="light"
            color={selectedPalette}
          >
            {selectedPalette}
          </Badge>
        </Group>
      </Box>
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
        title: `Theme: ${COLOR_SCHEME_LABELS[colorScheme].label} (Click to cycle)`,
        children: (
          <Group gap={4} miw={0}>
            {getCurrentIcon()}
            <Text size="xs" fw={500} truncate>
              {COLOR_SCHEME_LABELS[colorScheme].label}
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