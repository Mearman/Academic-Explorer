import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { Title, Text, Card, Group, Badge, Loader, Alert, Stack } from '@mantine/core'
import { IconAlertCircle } from '@tabler/icons-react'
import { pageTitle, pageDescription } from '../styles/layout.css'

// Example API function (using JSONPlaceholder for demo)
const fetchPosts = async () => {
  const response = await fetch('https://jsonplaceholder.typicode.com/posts?_limit=5')
  if (!response.ok) {
    throw new Error('Network response was not ok')
  }
  return response.json()
}

interface Post {
  id: number
  title: string
  body: string
  userId: number
}

function QueryDemo() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['posts'],
    queryFn: fetchPosts,
  })

  if (isLoading) {
    return (
      <Group justify="center" py="xl">
        <Loader size="lg" />
        <Text>Loading posts...</Text>
      </Group>
    )
  }

  if (error) {
    return (
      <Alert variant="light" color="red" title="Error loading posts" icon={<IconAlertCircle />}>
        {error.message}
      </Alert>
    )
  }

  return (
    <Stack gap="md">
      <div>
        <Title order={1} className={pageTitle}>
          TanStack Query Demo
        </Title>
        <Text className={pageDescription}>
          This demonstrates TanStack Query fetching data from JSONPlaceholder API.
          Open the React Query devtools to see query status and caching behavior.
        </Text>
      </div>

      <Stack gap="md">
        {data?.map((post: Post) => (
          <Card key={post.id} shadow="sm" padding="lg" radius="md" withBorder>
            <Group justify="space-between" mb="xs">
              <Text fw={500} size="lg">
                {post.title}
              </Text>
              <Badge color="blue" variant="light">
                Post #{post.id}
              </Badge>
            </Group>

            <Text size="sm" c="dimmed">
              {post.body}
            </Text>

            <Group mt="md">
              <Badge size="xs" variant="outline">
                User {post.userId}
              </Badge>
            </Group>
          </Card>
        ))}
      </Stack>
    </Stack>
  )
}

export const Route = createFileRoute('/demo')({
  component: QueryDemo,
})