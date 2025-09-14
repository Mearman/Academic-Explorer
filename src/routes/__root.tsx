import { createRootRoute, Link, Outlet } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/router-devtools'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { Group, Text, ActionIcon, useMantineColorScheme, Paper } from '@mantine/core'
import { IconMoon, IconSun, IconDeviceDesktop } from '@tabler/icons-react'
import { MainLayout } from '@/components/layout/MainLayout'
import { themeClass } from '../styles/theme.css'
import { navigation, navLink } from '../styles/layout.css'

function RootLayout() {
  const { colorScheme, setColorScheme } = useMantineColorScheme()

  // Get system preference
  const getSystemTheme = () => {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }

  // Cycle through: auto -> opposite-of-system -> auto (simplified 2-state cycle)
  const cycleColorScheme = () => {
    const systemTheme = getSystemTheme()

    if (colorScheme === 'auto') {
      // After auto, show the opposite of system theme
      setColorScheme(systemTheme === 'dark' ? 'light' : 'dark')
    } else {
      // From any explicit mode, go back to auto
      setColorScheme('auto')
    }
  }

  // Get the appropriate icon based on current scheme
  const getThemeIcon = () => {
    if (colorScheme === 'auto') {
      return <IconDeviceDesktop size={18} />
    } else if (colorScheme === 'dark') {
      return <IconSun size={18} />
    } else {
      return <IconMoon size={18} />
    }
  }

  // Get aria label for accessibility
  const getAriaLabel = () => {
    const systemTheme = getSystemTheme()
    if (colorScheme === 'auto') {
      return `Current: Auto (${systemTheme}). Click for ${systemTheme === 'dark' ? 'light' : 'dark'} mode`
    } else {
      return `Current: ${colorScheme === 'light' ? 'Light' : 'Dark'} mode. Click for auto mode`
    }
  }

  return (
    <div className={themeClass} style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Top Header Bar */}
      <Paper
        shadow="sm"
        style={{
          zIndex: 1000,
          padding: '12px 20px',
          borderRadius: 0,
          borderBottom: '1px solid var(--mantine-color-gray-3)',
        }}
      >
        <Group justify="space-between" h="100%">
          <Group>
            <Text size="xl" fw={600} c="blue">
              Academic Explorer
            </Text>
          </Group>

          <Group gap="md">
            <nav className={navigation}>
              <Link to="/" className={navLink}>
                Home
              </Link>
              <Link to="/about" className={navLink}>
                About
              </Link>
              <Link to="/demo" className={navLink}>
                Query Demo
              </Link>
              <Link to="/evaluation" className={navLink}>
                Evaluation
              </Link>
            </nav>

            <ActionIcon
              onClick={cycleColorScheme}
              variant="outline"
              size="lg"
              aria-label={getAriaLabel()}
            >
              {getThemeIcon()}
            </ActionIcon>
          </Group>
        </Group>
      </Paper>

      {/* Main Graph Layout with Outlet for Route Content */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        <MainLayout>
          <Outlet />
        </MainLayout>
      </div>

      <TanStackRouterDevtools />
      <ReactQueryDevtools initialIsOpen={false} />
    </div>
  )
}

export const Route = createRootRoute({
  component: RootLayout,
})