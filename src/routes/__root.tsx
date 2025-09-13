import { createRootRoute, Link, Outlet } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/router-devtools'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { AppShell, Container, Group, Text, ActionIcon, useMantineColorScheme } from '@mantine/core'
import { IconMoon, IconSun } from '@tabler/icons-react'
import { themeClass } from '../styles/theme.css'
import { navigation, navLink, main } from '../styles/layout.css'

function RootLayout() {
  const { colorScheme, toggleColorScheme } = useMantineColorScheme()

  return (
    <div className={themeClass}>
      <AppShell
        header={{ height: 60 }}
        padding="md"
      >
        <AppShell.Header>
          <Container size="lg" h="100%">
            <Group h="100%" justify="space-between">
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
                  <Link to="/search" className={navLink}>
                    Search Demo
                  </Link>
                </nav>

                <ActionIcon
                  onClick={() => toggleColorScheme()}
                  variant="outline"
                  size="lg"
                  aria-label="Toggle color scheme"
                >
                  {colorScheme === 'dark' ? <IconSun size={18} /> : <IconMoon size={18} />}
                </ActionIcon>
              </Group>
            </Group>
          </Container>
        </AppShell.Header>

        <AppShell.Main>
          <Container size="lg" className={main}>
            <Outlet />
          </Container>
        </AppShell.Main>
      </AppShell>

      <TanStackRouterDevtools />
      <ReactQueryDevtools initialIsOpen={false} />
    </div>
  )
}

export const Route = createRootRoute({
  component: RootLayout,
})