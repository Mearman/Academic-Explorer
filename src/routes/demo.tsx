import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'

// Example API function (using JSONPlaceholder for demo)
const fetchPosts = async () => {
  const response = await fetch('https://jsonplaceholder.typicode.com/posts?_limit=5')
  if (!response.ok) {
    throw new Error('Network response was not ok')
  }
  return response.json()
}

function QueryDemo() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['posts'],
    queryFn: fetchPosts,
  })

  if (isLoading) {
    return <div className="p-4">Loading posts...</div>
  }

  if (error) {
    return <div className="p-4 text-red-600">Error: {error.message}</div>
  }

  return (
    <div className="p-4">
      <h3 className="text-xl font-bold mb-4">TanStack Query Demo</h3>
      <p className="mb-4">
        This demonstrates TanStack Query fetching data from JSONPlaceholder API.
        Open the React Query devtools to see query status and caching.
      </p>
      <div className="space-y-4">
        {data?.map((post: any) => (
          <div key={post.id} className="border p-4 rounded">
            <h4 className="font-semibold">{post.title}</h4>
            <p className="text-gray-600 mt-2">{post.body}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

export const Route = createFileRoute('/demo')({
  component: QueryDemo,
})