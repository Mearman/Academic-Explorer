import { createFileRoute } from '@tanstack/react-router';
import { useEffect } from 'react';
import { useGraphData } from '@/hooks/use-graph-data';

export const Route = createFileRoute('/topics/$topicId')({
  component: TopicRoute,
});

function TopicRoute() {
  const { topicId } = Route.useParams();
  const { loadEntity } = useGraphData();

  useEffect(() => {
    const loadTopic = async () => {
      try {
        // Load topic entity into the graph
        await loadEntity(topicId);
      } catch (error) {
        console.error('Failed to load topic:', error);
      }
    };

    loadTopic();
  }, [topicId, loadEntity]);

  // Return null - the graph is visible from MainLayout
  // The route content is just for triggering the data load
  return null;
}