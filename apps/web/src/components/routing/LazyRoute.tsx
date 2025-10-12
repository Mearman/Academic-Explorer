import React, { Suspense } from "react";
import { Center, Text, Stack } from "@mantine/core";
import { IconLoader } from "@tabler/icons-react";

interface LazyRouteProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * Wrapper component for lazy-loaded routes with consistent loading states
 * Provides a centered loading spinner with optional custom fallback
 */
export const LazyRoute: React.FC<LazyRouteProps> = ({ children, fallback }) => {
  const defaultFallback = (
    <Center style={{ height: "50vh" }}>
      <Stack align="center" gap="md">
        <IconLoader size={32} className="animate-spin" />
        <Text size="sm" c="dimmed">
          Loading...
        </Text>
      </Stack>
    </Center>
  );

  return <Suspense fallback={fallback || defaultFallback}>{children}</Suspense>;
};
