import { Stack, Skeleton, Group } from "@mantine/core";

interface ContentSkeletonProps {
  variant?: "text" | "card" | "list" | "detail";
  count?: number;
}

/**
 * Flexible skeleton loading component for various content types
 * Improves perceived performance during data loading
 */
export function ContentSkeleton({
  variant = "text",
  count = 3,
}: ContentSkeletonProps) {
  if (variant === "text") {
    return (
      <Stack gap="sm">
        {Array.from({ length: count }).map((_, index) => (
          <Skeleton key={index} height={16} radius="sm" />
        ))}
      </Stack>
    );
  }

  if (variant === "card") {
    return (
      <Stack gap="md">
        {Array.from({ length: count }).map((_, index) => (
          <div key={index}>
            <Skeleton height={120} radius="md" mb="xs" />
            <Skeleton height={16} width="70%" radius="sm" mb="xs" />
            <Skeleton height={14} width="50%" radius="sm" />
          </div>
        ))}
      </Stack>
    );
  }

  if (variant === "list") {
    return (
      <Stack gap="xs">
        {Array.from({ length: count }).map((_, index) => (
          <Group key={index} gap="md">
            <Skeleton height={40} width={40} circle />
            <div style={{ flex: 1 }}>
              <Skeleton height={16} width="60%" radius="sm" mb="xs" />
              <Skeleton height={12} width="40%" radius="sm" />
            </div>
          </Group>
        ))}
      </Stack>
    );
  }

  if (variant === "detail") {
    return (
      <Stack gap="lg">
        <Skeleton height={32} width="40%" radius="sm" />
        <Skeleton height={120} radius="md" />
        <Group gap="md">
          <Skeleton height={16} width="30%" radius="sm" />
          <Skeleton height={16} width="25%" radius="sm" />
          <Skeleton height={16} width="20%" radius="sm" />
        </Group>
        <Skeleton height={200} radius="md" />
      </Stack>
    );
  }

  return null;
}
